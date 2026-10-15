// Builds a small, language-native test harness around a user's function so that
// CareerForge's function-style DSA exercises can be judged by Judge0 exactly like
// a normal program.
//
// The DSA content stores each exercise as:
//   { functionName: 'multiply', testCases: [{ input: '5, 10', expected: '50' }] }
// where `input` is a comma separated list of language-native argument literals.
// Judge0 only runs complete programs that read stdin, so for each test case we
// wrap the user's function with a generated `main`/runner that calls it with the
// test's arguments and prints the return value. Every verdict therefore comes
// from real compilation + execution of the user's code on Judge0.
//
// If a signature cannot be trusted/handled we throw a HarnessError and the caller
// falls back to executing the raw program with the test input on stdin. We never
// fabricate output.

const { runCode, normalizeOutput } = require('./codeRunnerService');

class HarnessError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HarnessError';
    this.unsupported = true;
  }
}

// ─── Generic parsing helpers ────────────────────────────────────────────────
const COMMENT_PATTERNS = [/\/\*[\s\S]*?\*\//g, /\/\/[^\n\r]*/g];

const stripComments = (code) => {
  let out = code;
  COMMENT_PATTERNS.forEach((pattern) => {
    out = out.replace(pattern, '');
  });
  return out;
};

// Split a string on top-level delimiters, honouring brackets/quotes.
const splitTopLevel = (input, delimiter = ',') => {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (quote) {
      current += ch;
      if (ch === quote && input[i - 1] !== '\\') {
        quote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === '[' || ch === '{' || ch === '(') depth += 1;
    else if (ch === ']' || ch === '}' || ch === ')') depth -= 1;

    if (ch === delimiter && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
};

const findBalanced = (code, openIndex, open = '(', close = ')') => {
  let depth = 0;
  for (let i = openIndex; i < code.length; i += 1) {
    if (code[i] === open) depth += 1;
    else if (code[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractSignature = (code, functionName) => {
  const clean = stripComments(code);
  const match = new RegExp(`(?:^|[^A-Za-z0-9_])${escapeRegExp(functionName)}\\s*\\(`).exec(clean);
  if (!match) {
    return null;
  }

  const nameIndex = clean.indexOf(functionName, match.index);
  const parenIndex = clean.indexOf('(', nameIndex + functionName.length);
  if (parenIndex === -1) return null;

  const closeIndex = findBalanced(clean, parenIndex);
  if (closeIndex === -1) return null;

  const params = clean.slice(parenIndex + 1, closeIndex);

  // Return type = the tokens between the previous statement boundary and the name.
  let prefixStart = nameIndex;
  while (prefixStart > 0 && !';{}'.includes(clean[prefixStart - 1])) {
    prefixStart -= 1;
  }
  const prefix = clean.slice(prefixStart, nameIndex);

  return { prefix, params };
};

// Locates a function's parameter list even for dynamically typed languages
// where the declaration may look like `def f(...)`, `function f(...)` or
// `const f = (...) =>`. Returns an array of raw parameter strings.
const findParams = (code, functionName) => {
  const clean = stripComments(code);
  const match = new RegExp(`(?:^|[^A-Za-z0-9_])${escapeRegExp(functionName)}\\b`).exec(clean);
  if (!match) {
    return null;
  }

  const nameIndex = clean.indexOf(functionName, match.index);
  const parenIndex = clean.indexOf('(', nameIndex + functionName.length);
  if (parenIndex === -1) {
    return null;
  }

  const between = clean.slice(nameIndex + functionName.length, parenIndex);
  if (!/^[=\s]*(=>\s*)?$/.test(between) && !/^\s*$/.test(between)) {
    return null;
  }

  const closeIndex = findBalanced(clean, parenIndex);
  if (closeIndex === -1) {
    return null;
  }

  return splitTopLevel(clean.slice(parenIndex + 1, closeIndex));
};

const stripModifiers = (value) =>
  value
    .replace(/\b(public|private|protected|static|final|abstract|synchronized|native|transient|volatile|inline|virtual|explicit|constexpr|friend|extern)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeType = (value) =>
  value
    .replace(/\bconst\b/g, '')
    .replace(/&/g, '')
    .replace(/\s+/g, '')
    .trim();

const SCALAR_TYPES = new Set([
  'int',
  'long',
  'longlong',
  'short',
  'unsigned',
  'unsignedint',
  'unsignedlong',
  'unsignedlonglong',
  'byte',
  'float',
  'double',
  'char',
  'bool',
  'boolean',
  'string',
  'String',
  'size_t',
  'int32_t',
  'int64_t',
  'uint32_t',
  'uint64_t',
  'Integer',
  'Long',
  'Double',
  'Float',
  'Short',
  'Byte',
  'Character',
  'Boolean'
]);

const CPP_SCALAR_MAP = {
  int: 'int',
  long: 'long long',
  longlong: 'long long',
  short: 'short',
  unsigned: 'unsigned int',
  unsignedint: 'unsigned int',
  unsignedlong: 'unsigned long long',
  unsignedlonglong: 'unsigned long long',
  float: 'float',
  double: 'double',
  char: 'char',
  bool: 'bool',
  string: 'string',
  String: 'string',
  size_t: 'size_t',
  int32_t: 'int',
  int64_t: 'long long',
  uint32_t: 'unsigned int',
  uint64_t: 'unsigned long long'
};

const classifyType = (type) => {
  const t = normalizeType(type);

  let match = t.match(/^vector<(.+)>$/);
  if (match) {
    return { kind: 'cpp-vector', inner: match[1] };
  }

  match = t.match(/^(.+?)\[\](\[\])?$/);
  if (match) {
    const base = match[1];
    if (SCALAR_TYPES.has(base)) {
      return { kind: 'array', base, depth: t.endsWith('[][]') ? 2 : 1 };
    }
    return { kind: 'unsupported', reason: `array of ${base}` };
  }

  match = t.match(/^(?:java\.util\.)?(?:List|ArrayList|Collection|Iterable)<(.+)>$/);
  if (match) {
    return { kind: 'java-collection', inner: match[1] };
  }

  if (SCALAR_TYPES.has(t)) {
    return { kind: 'scalar', name: t };
  }

  return { kind: 'unsupported', reason: t };
};

// ─── Argument literal parsing ───────────────────────────────────────────────
const parseLiteral = (raw) => {
  const s = raw.trim();

  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    return { kind: 'array', items: inner ? splitTopLevel(inner).map(parseLiteral) : [] };
  }

  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return { kind: 'string', raw: s };
  }

  if (/^(true|false|True|False)$/.test(s)) {
    return { kind: 'bool', value: /^(true|True)$/.test(s) };
  }

  if (/^(null|nil|None|undefined)$/i.test(s)) {
    return { kind: 'null' };
  }

  if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(s)) {
    return { kind: 'number', raw: s };
  }

  return { kind: 'raw', raw: s };
};

const parseArgs = (input) => {
  const trimmed = (input || '').trim();
  if (!trimmed) return [];
  return splitTopLevel(trimmed).map(parseLiteral);
};

// ─── C++ value construction ─────────────────────────────────────────────────
const cppScalarExpr = (node) => {
  switch (node.kind) {
    case 'number':
      return node.raw;
    case 'bool':
      return node.value ? 'true' : 'false';
    case 'string':
      return node.raw;
    case 'raw':
      return node.raw;
    default:
      throw new HarnessError('Unsupported scalar argument for C++.');
  }
};

const innerTypeOfl = (inner) => CPP_SCALAR_MAP[normalizeType(inner)] || normalizeType(inner);

// Builds a named C++ local for one argument. Named locals are required so that
// arguments can bind to non-const reference parameters (e.g. vector<int>& arr).
const cppDeclare = (type, node, name) => {
  const info = classifyType(type);

  if (info.kind === 'scalar') {
    const cppType = CPP_SCALAR_MAP[info.name] || info.name;
    return { declaration: `${cppType} ${name} = ${cppScalarExpr(node)};`, isContainer: false };
  }

  if (info.kind === 'cpp-vector') {
    if (node.kind !== 'array') {
      throw new HarnessError('Expected an array argument for a vector parameter.');
    }
    const innerInfo = classifyType(info.inner);
    const innerType = innerTypeOfl(info.inner);

    if (innerInfo.kind === 'cpp-vector') {
      const rows = node.items.map((row) => {
        if (row.kind !== 'array') throw new HarnessError('Expected a 2D array argument.');
        return `{${row.items.map(cppScalarExpr).join(',')}}`;
      });
      return {
        declaration: `vector<${innerType}> ${name} = {${rows.join(',')}};`,
        isContainer: true
      };
    }

    if (innerInfo.kind !== 'scalar') {
      throw new HarnessError('Unsupported nested vector argument for C++.');
    }

    const elements = node.items.map((item) => cppScalarExpr(item));
    return {
      declaration: `vector<${innerType}> ${name} = {${elements.join(',')}};`,
      isContainer: true
    };
  }

  throw new HarnessError(`C++ parameter type '${normalizeType(type)}' is not supported by the harness.`);
};

// ─── Java value construction ────────────────────────────────────────────────
const javaScalarExpr = (node) => {
  switch (node.kind) {
    case 'number':
      return node.raw;
    case 'bool':
      return node.value ? 'true' : 'false';
    case 'string':
      return node.raw.replace(/^'/, '"').replace(/'$/, '"');
    case 'raw':
      return node.raw;
    default:
      throw new HarnessError('Unsupported scalar argument for Java.');
  }
};

const javaDeclare = (type, node, name) => {
  const info = classifyType(type);

  // Java test inputs are often language-native expressions such as
  // "new java.util.ArrayList<>(java.util.Arrays.asList(1, 2, 3))". Those are
  // already valid Java, so use them verbatim instead of rebuilding them.
  if (node.kind === 'raw') {
    if (info.kind === 'array' || info.kind === 'java-collection') {
      return {
        declaration: `${String(type).trim()} ${name} = ${node.raw};`,
        isContainer: true
      };
    }
    throw new HarnessError(`Java parameter type '${normalizeType(type)}' is not supported by the harness.`);
  }

  if (info.kind === 'scalar') {
    return {
      declaration: `${info.name} ${name} = ${javaScalarExpr(node)};`,
      isContainer: false
    };
  }

  if (info.kind === 'array') {
    if (node.kind !== 'array') {
      throw new HarnessError('Expected an array argument for an array parameter.');
    }
    const elementExpr = (item) => javaScalarExpr(item);
    if (info.depth === 2) {
      const rows = node.items.map((row) => {
        if (row.kind !== 'array') throw new HarnessError('Expected a 2D array argument.');
        return `new ${info.base}[]{${row.items.map(elementExpr).join(',')}}`;
      });
      return {
        declaration: `${info.base}[][] ${name} = new ${info.base}[][]{${rows.join(',')}};`,
        isContainer: true
      };
    }
    return {
      declaration: `${info.base}[] ${name} = new ${info.base}[]{${node.items.map(elementExpr).join(',')}};`,
      isContainer: true
    };
  }

  if (info.kind === 'java-collection') {
    if (node.kind !== 'array') {
      throw new HarnessError('Expected an array argument for a List parameter.');
    }
    return {
      declaration: `${String(type).trim()} ${name} = new java.util.ArrayList<>(java.util.Arrays.asList(${node.items
        .map(javaScalarExpr)
        .join(',')}));`,
      isContainer: true
    };
  }

  throw new HarnessError(`Java parameter type '${normalizeType(type)}' is not supported by the harness.`);
};

// ─── Python / JavaScript value construction ─────────────────────────────────
const toPythonLiteral = (node) => {
  switch (node.kind) {
    case 'array':
      return `[${node.items.map(toPythonLiteral).join(',')}]`;
    case 'bool':
      return node.value ? 'True' : 'False';
    case 'null':
      return 'None';
    default:
      return node.raw;
  }
};

const toJsLiteral = (node) => {
  switch (node.kind) {
    case 'array':
      return `[${node.items.map(toJsLiteral).join(',')}]`;
    case 'null':
      return 'null';
    case 'bool':
      return node.value ? 'true' : 'false';
    default:
      return node.raw;
  }
};

// ─── Program builders ───────────────────────────────────────────────────────
const CPP_SUPPORT = `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n`;

const CPP_PRINTER = `
template <typename T> void __cf_print(const T& value) { cout << value; }
inline void __cf_print(const string& value) { cout << value; }
inline void __cf_print(const char* value) { cout << value; }
template <typename T> void __cf_print(const vector<T>& values) {
  for (size_t i = 0; i < values.size(); ++i) { if (i) cout << ","; __cf_print(values[i]); }
}
`;

const splitParam = (param) => {
  const match = param.match(/([A-Za-z_]\w*)\s*(\[\])?(\[\])?\s*$/);
  const name = match ? match[1] : '';
  const type = match ? param.slice(0, match.index).trim() : param.trim();
  return { name, type };
};

const buildCppProgram = ({ code, functionName, input }) => {
  if (/\bint\s+main\s*\(/.test(stripComments(code))) {
    throw new HarnessError('C++ program already defines main().');
  }

  const signature = extractSignature(code, functionName);
  if (!signature) {
    throw new HarnessError(`Could not locate function '${functionName}()' in your C++ code.`);
  }

  const returnType = stripModifiers(signature.prefix);
  if (!returnType) {
    throw new HarnessError('Could not determine the C++ return type.');
  }

  const returnKind = classifyType(returnType);
  const isVoid = normalizeType(returnType) === 'void';
  if (!isVoid && returnKind.kind !== 'scalar' && returnKind.kind !== 'cpp-vector') {
    throw new HarnessError(`C++ return type '${returnType.trim()}' is not supported by the harness.`);
  }

  const params = splitTopLevel(signature.params);
  const args = params.length > 0 ? parseArgs(input) : [];

  if (params.length > 0 && args.length !== params.length) {
    throw new HarnessError(
      `Expected ${params.length} argument(s) for ${functionName}() but the test provided ${args.length}.`
    );
  }

  const declarations = [];
  const callArgs = [];
  const containerArgs = [];
  params.forEach((param, index) => {
    const name = `__cf_arg${index}`;
    const { type } = splitParam(param);
    const built = cppDeclare(type, args[index], name);
    declarations.push(built.declaration);
    callArgs.push(name);
    if (built.isContainer) containerArgs.push(name);
  });

  const call = `${functionName}(${callArgs.join(', ')})`;
  let output;
  if (isVoid) {
    output = containerArgs.length
      ? `${call};\n  __cf_print(${containerArgs[0]});`
      : `${call};`;
  } else {
    output = `__cf_print(${call});`;
  }

  const source = `${CPP_SUPPORT}${code}\n
${CPP_PRINTER}
int main() {
  ${declarations.join('\n  ')}
  ${output}
  return 0;
}
`;

  return { source, returnType: normalizeType(returnType) };
};

const JAVA_PRINTER = `
  static String __cf_fmt(Object value) {
    if (value == null) { return "null"; }
    if (value.getClass().isArray()) {
      int n = java.lang.reflect.Array.getLength(value);
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < n; i++) {
        if (i > 0) sb.append(", ");
        sb.append(__cf_fmt(java.lang.reflect.Array.get(value, i)));
      }
      sb.append("]");
      return sb.toString();
    }
    return String.valueOf(value);
  }
  static void __cf_print(Object value) { System.out.print(__cf_fmt(value)); }
`;

const buildJavaProgram = ({ code, functionName, input }) => {
  const stripped = stripComments(code);

  if (/static\s+void\s+main\s*\(/.test(stripped)) {
    throw new HarnessError('Java program already defines main().');
  }

  let body = code;
  let callTarget = `${functionName}`;

  if (/class\s+Solution\b/.test(stripped)) {
    // Judge0 compiles a single public class; demote it and keep a stable name.
    body = code.replace(/public\s+class\s+Solution/g, 'class Solution');
    callTarget = `Solution.${functionName}`;
  } else {
    // Bare method(s) pasted without a class wrapper.
    body = `class Solution {\n${code}\n}`;
    callTarget = `Solution.${functionName}`;
  }

  const signature = extractSignature(body, functionName);
  if (!signature) {
    throw new HarnessError(`Could not locate method '${functionName}()' in your Java code.`);
  }

  const returnType = stripModifiers(signature.prefix);
  const isVoid = normalizeType(returnType) === 'void';
  if (!isVoid) {
    const returnKind = classifyType(returnType);
    if (returnKind.kind === 'unsupported') {
      throw new HarnessError(`Java return type '${returnType.trim()}' is not supported by the harness.`);
    }
  }

  const params = splitTopLevel(signature.params);
  const args = params.length > 0 ? parseArgs(input) : [];

  if (params.length > 0 && args.length !== params.length) {
    throw new HarnessError(
      `Expected ${params.length} argument(s) for ${functionName}() but the test provided ${args.length}.`
    );
  }

  const declarations = [];
  const callArgs = [];
  const containerArgs = [];
  params.forEach((param, index) => {
    const name = `__cf_arg${index}`;
    const { type } = splitParam(param);
    const built = javaDeclare(type, args[index], name);
    declarations.push(built.declaration);
    callArgs.push(name);
    if (built.isContainer) containerArgs.push(name);
  });

  const call = `${callTarget}(${callArgs.join(', ')})`;
  const output = isVoid
    ? `${call};\n      ${containerArgs.length ? containerArgs.map((arg) => `__cf_print(${arg});`).join(' ') : ''}`
    : `__cf_print(${call});`;

  const source = `${body}\n
class Main {
${JAVA_PRINTER}
  public static void main(String[] args) {
    try {
      ${declarations.join('\n      ')}
      ${output}
    } catch (Throwable t) {
      System.out.print(t.toString());
      System.exit(1);
    }
  }
}
`;

  return { source, returnType: isVoid ? 'void' : returnType };
};

const buildPythonProgram = ({ code, functionName, input }) => {
  const stripped = stripComments(code);
  if (/input\s*\(/.test(stripped) || /sys\.stdin/.test(stripped) || /__name__\s*==/.test(stripped)) {
    throw new HarnessError('Python program appears to read stdin directly.');
  }

  const params = findParams(code, functionName);
  let args;
  if (params) {
    args = params.length === 0 ? [] : parseArgs(input);
    if (params.length > 0 && args.length !== params.length) {
      throw new HarnessError(
        `Expected ${params.length} argument(s) for ${functionName}() but the test provided ${args.length}.`
      );
    }
  } else {
    args = parseArgs(input);
  }

  const argsLiteral = args.length
    ? `(${args.map(toPythonLiteral).join(', ')},)`
    : '()';

  const source = `${code}\n
__cf_args = ${argsLiteral}
__cf_result = ${functionName}(*__cf_args)
if __cf_result is None:
    __cf_mutated = [__cf_a for __cf_a in __cf_args if isinstance(__cf_a, (list, tuple, dict, set))]
    if __cf_mutated:
        __cf_out = __cf_mutated[0]
        if isinstance(__cf_out, (list, tuple)):
            print(",".join(str(__cf_item) for __cf_item in __cf_out))
        else:
            print(",".join(str(__cf_k) + ":" + str(__cf_v) for __cf_k, __cf_v in __cf_out.items()))
    else:
        print("None")
elif isinstance(__cf_result, (list, tuple)):
    print(",".join(str(__cf_item) for __cf_item in __cf_result))
else:
    print(__cf_result)
`;

  return { source, returnType: undefined };
};

const buildJsProgram = ({ code, functionName, input }) => {
  const stripped = stripComments(code);
  if (/process\.stdin/.test(stripped) || /readline/.test(stripped)) {
    throw new HarnessError('JavaScript program appears to read stdin directly.');
  }

  const params = findParams(code, functionName);
  let args;
  if (params) {
    args = params.length === 0 ? [] : parseArgs(input);
    if (params.length > 0 && args.length !== params.length) {
      throw new HarnessError(
        `Expected ${params.length} argument(s) for ${functionName}() but the test provided ${args.length}.`
      );
    }
  } else {
    args = parseArgs(input);
  }

  const argsLiteral = args.map(toJsLiteral).join(', ');

  const source = `${code}\n
const __cf_args = [${argsLiteral}];
const __cf_result = ${functionName}(...__cf_args);
const __cf_format = (value) => Array.isArray(value) ? value.join(",") : String(value);
if (__cf_result === undefined || __cf_result === null) {
  const __cf_mutated = __cf_args.find((a) => Array.isArray(a));
  console.log(__cf_mutated ? __cf_format(__cf_mutated) : "undefined");
} else {
  console.log(__cf_format(__cf_result));
}
`;

  return { source, returnType: undefined };
};

const BUILDERS = {
  'C++': buildCppProgram,
  Java: buildJavaProgram,
  Python: buildPythonProgram,
  JavaScript: buildJsProgram
};

const buildProgram = ({ language, code, functionName, input }) => {
  const builder = BUILDERS[language];
  if (!builder) {
    throw new HarnessError(`Harness generation is not available for ${language}.`);
  }
  return builder({ code, functionName, input: input || '' });
};

// ─── Judging ────────────────────────────────────────────────────────────────
const HEAVY_LANGUAGES = new Set(['C++', 'Java']);
const HEAVY_LANGUAGE_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 1500;
const LIGHT_LANGUAGE_DELAY_MS = process.env.NODE_ENV === 'test' ? 0 : 400;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const classifyExecution = (execution) => {
  const statusId = execution.judgeStatusId;
  if (execution.compile_output || statusId === 6) return 'Compilation Error';
  if (statusId === 5) return 'Time Limit Exceeded';
  if (statusId === 13) return 'Judge Error';
  if ([7, 8, 9, 10, 11, 12, 14].includes(statusId) || execution.stderr) return 'Runtime Error';
  return null;
};

const executeProgram = async ({ language, source, stdin, returnType }) => {
  const execution = await runCode({ sourceCode: source, language, stdin });

  // The Java shim prints uncaught exceptions to stdout; surface them as errors.
  if (returnType === undefined && language === 'Java' && execution.stdout && execution.stderr === '') {
    if (/^[a-zA-Z_$][\w$.]*(Exception|Error):/.test(execution.stdout.trim())) {
      return { ...execution, stderr: execution.stdout, stdout: '' };
    }
  }

  return execution;
};

const buildForCase = (language, code, functionName, input) => {
  try {
    return { program: buildProgram({ language, code, functionName, input }), harnessed: true };
  } catch (error) {
    if (error.unsupported) {
      return { program: { source: code, returnType: undefined }, harnessed: false, reason: error.message };
    }
    throw error;
  }
};

const judgeWithHarness = async ({ language, code, functionName, testCases = [] }) => {
  const results = [];
  let passedCount = 0;
  let fatalStatus = null;
  let runtimeValue = 0;
  let memoryValue = 0;
  let harnessed = true;
  let harnessNote = '';

  for (let index = 0; index < testCases.length; index += 1) {
    const testCase = testCases[index];
    const { program, harnessed: isHarnessed, reason } = buildForCase(
      language,
      code,
      functionName,
      testCase.input || ''
    );

    if (!isHarnessed && !harnessNote) {
      harnessed = false;
      harnessNote = reason;
    }

    // Sequential Judge0 submissions hit rate limits; add a small gap between tests.
    if (index > 0) {
      await delay(HEAVY_LANGUAGES.has(language) ? HEAVY_LANGUAGE_DELAY_MS : LIGHT_LANGUAGE_DELAY_MS);
    }

    const execution = await executeProgram({
      language,
      source: program.source,
      stdin: isHarnessed ? '' : (testCase.input || ''),
      returnType: program.returnType
    });

    const fatalExecutionError = classifyExecution(execution);
    const actualOutput = normalizeOutput(execution.stdout);
    const expectedOutput = normalizeOutput(testCase.expectedOutput);
    const passed = !fatalExecutionError && actualOutput === expectedOutput;

    if (execution.time) {
      const parsed = Number.parseFloat(execution.time);
      if (!Number.isNaN(parsed)) runtimeValue += parsed;
    }
    if (execution.memory) {
      const parsed = Number.parseInt(execution.memory, 10);
      if (!Number.isNaN(parsed)) memoryValue = Math.max(memoryValue, parsed);
    }
    if (passed) passedCount += 1;

    results.push({
      input: testCase.input || '',
      expectedOutput,
      actualOutput,
      passed,
      status: fatalExecutionError || (passed ? 'Accepted' : 'Wrong Answer'),
      runtime: execution.time ? `${execution.time}s` : '',
      memory: execution.memory || '',
      stderr: execution.stderr || '',
      compile_output: execution.compile_output || ''
    });

    if (fatalExecutionError) {
      fatalStatus = fatalExecutionError;
      break;
    }
  }

  const finalStatus =
    fatalStatus || (passedCount === testCases.length ? 'Accepted' : 'Wrong Answer');

  return {
    status: finalStatus,
    passedCount,
    totalCount: testCases.length,
    runtime: runtimeValue ? `${runtimeValue.toFixed(3)}s` : '',
    memory: memoryValue ? `${memoryValue} KB` : '',
    harnessed,
    harnessNote,
    results
  };
};

const runWithCustomInput = async ({ language, code, functionName, input }) => {
  const { program, harnessed: isHarnessed, reason } = buildForCase(
    language,
    code,
    functionName,
    input || ''
  );

  const execution = await executeProgram({
    language,
    source: program.source,
    stdin: isHarnessed ? '' : (input || ''),
    returnType: program.returnType
  });

  return {
    stdout: execution.stdout || '',
    stderr: execution.stderr || '',
    compile_output: execution.compile_output || '',
    status: execution.status || 'Unknown',
    executionStatus: classifyExecution(execution),
    runtime: execution.time ? `${execution.time}s` : '',
    memory: execution.memory || '',
    harnessed: isHarnessed,
    harnessNote: isHarnessed ? '' : reason
  };
};

module.exports = {
  HarnessError,
  parseArgs,
  buildProgram,
  judgeWithHarness,
  runWithCustomInput
};
