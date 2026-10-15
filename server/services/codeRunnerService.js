const axios = require('axios');

const LANGUAGE_MAP = {
  Java: 62,
  Python: 71,
  'C++': 54,
  JavaScript: 63
};

// The frontend uses short keys ('cpp', 'js', 'py'...) while Judge0 uses
// canonical names. Accept both and resolve to the canonical key.
const LANGUAGE_ALIASES = {
  cpp: 'C++',
  'c++': 'C++',
  cplusplus: 'C++',
  java: 'Java',
  python: 'Python',
  py: 'Python',
  python3: 'Python',
  javascript: 'JavaScript',
  js: 'JavaScript',
  node: 'JavaScript',
  nodejs: 'JavaScript'
};

const normalizeLanguage = (language) => {
  if (!language) {
    return null;
  }
  const raw = String(language).trim();
  if (LANGUAGE_MAP[raw]) {
    return raw;
  }
  return LANGUAGE_ALIASES[raw.toLowerCase()] || null;
};

const TERMINAL_STATUSES = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);

const normalizeOutput = (output) => {
  if (output === undefined || output === null) {
    return '';
  }

  return output
    .toString()
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Judge0 (especially the free CE instance) rejects payloads it cannot prove are
// valid UTF-8. User code can legitimately contain non-ASCII characters, so all
// submissions are sent with base64_encoded=true and decoded on the way back.
const encodeBase64 = (value) =>
  value === undefined || value === null ? '' : Buffer.from(String(value), 'utf8').toString('base64');

const decodeBase64 = (value) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  try {
    return Buffer.from(String(value), 'base64').toString('utf8');
  } catch (error) {
    return '';
  }
};

// Judge0 is exposed in three common shapes:
//   1. RapidAPI  -> JUDGE0_API_KEY + JUDGE0_API_HOST (X-RapidAPI-* headers)
//   2. Judge0 CE -> JUDGE0_AUTH_TOKEN (X-Auth-Token) or nothing for a public instance
//   3. Self-host -> JUDGE0_API_URL only
const getJudgeHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };

  if (process.env.JUDGE0_API_HOST) {
    if (process.env.JUDGE0_API_KEY) {
      headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY;
    }
    headers['X-RapidAPI-Host'] = process.env.JUDGE0_API_HOST;
    return headers;
  }

  const token = process.env.JUDGE0_AUTH_TOKEN || process.env.JUDGE0_API_KEY;
  if (token) {
    headers['X-Auth-Token'] = token;
  }

  return headers;
};

const getJudgeBaseUrl = () => {
  const baseUrl = process.env.JUDGE0_API_URL || '';
  if (!baseUrl) {
    throw new Error('Code execution is not configured. Set JUDGE0_API_URL on the server.');
  }
  return baseUrl.replace(/\/$/, '');
};

// Lets the API report whether code execution is configured without ever
// leaking the credentials to the client.
const getJudgeConfigStatus = () => ({
  configured: Boolean(process.env.JUDGE0_API_URL),
  baseUrl: process.env.JUDGE0_API_URL || null,
  authMode: process.env.JUDGE0_API_HOST
    ? (process.env.JUDGE0_API_KEY ? 'rapidapi' : 'rapidapi-no-key')
    : (process.env.JUDGE0_AUTH_TOKEN || process.env.JUDGE0_API_KEY ? 'auth-token' : 'none')
});

const mapExecutionFailure = (result) => {
  const statusId = result.judgeStatusId;

  if (result.compile_output || statusId === 6) {
    return 'Compilation Error';
  }

  if (statusId === 5) {
    return 'Time Limit Exceeded';
  }

  if (statusId === 13) {
    return 'Judge Error';
  }

  if ([7, 8, 9, 10, 11, 12, 14].includes(statusId) || result.stderr) {
    return 'Runtime Error';
  }

  return null;
};

const submitToJudge = async ({ sourceCode, languageId, stdin }) => {
  const baseUrl = getJudgeBaseUrl();
  const response = await axios.post(
    `${baseUrl}/submissions?base64_encoded=true`,
    {
      source_code: encodeBase64(sourceCode),
      language_id: languageId,
      stdin: encodeBase64(stdin),
      cpu_time_limit: 2,
      cpu_extra_time: 0.5,
      wall_time_limit: 5,
      memory_limit: 262144
    },
    {
      headers: getJudgeHeaders(),
      timeout: 15000
    }
  );

  return response.data.token;
};

const fetchJudgeResult = async (token) => {
  const baseUrl = getJudgeBaseUrl();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await axios.get(
      `${baseUrl}/submissions/${token}?base64_encoded=true&fields=*`,
      {
        headers: getJudgeHeaders(),
        timeout: 15000
      }
    );

    const result = response.data;
    const statusId = result.status?.id;
    if (TERMINAL_STATUSES.has(statusId)) {
      return result;
    }

    await delay(800);
  }

  throw new Error('Judge execution timed out while waiting for a result.');
};

const runCode = async ({ sourceCode, language, stdin }) => {
  if (!sourceCode || !sourceCode.trim()) {
    throw new Error('Source code is required.');
  }

  const canonical = normalizeLanguage(language);
  const languageId = canonical ? LANGUAGE_MAP[canonical] : null;
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const token = await submitToJudge({ sourceCode, languageId, stdin });
  const result = await fetchJudgeResult(token);

  return {
    token,
    stdout: decodeBase64(result.stdout),
    stderr: decodeBase64(result.stderr),
    compile_output: decodeBase64(result.compile_output),
    status: result.status?.description || 'Unknown',
    time: result.time || '',
    memory: result.memory ? `${result.memory} KB` : '',
    judgeStatusId: result.status?.id || null
  };
};

const runAgainstTestCases = async ({ code, language, testCases = [] }) => {
  const results = [];
  let passedCount = 0;
  let fatalStatus = null;
  let runtimeValue = 0;
  let memoryValue = 0;

  for (const testCase of testCases) {
    const execution = await runCode({
      sourceCode: code,
      language,
      stdin: testCase.input || ''
    });

    const fatalExecutionError = mapExecutionFailure(execution);
    const actualOutput = normalizeOutput(execution.stdout);
    const expectedOutput = normalizeOutput(testCase.expectedOutput);
    const passed = !fatalExecutionError && actualOutput === expectedOutput;

    if (execution.time) {
      const parsed = Number.parseFloat(execution.time);
      if (!Number.isNaN(parsed)) {
        runtimeValue += parsed;
      }
    }

    if (execution.memory) {
      const parsed = Number.parseInt(execution.memory, 10);
      if (!Number.isNaN(parsed)) {
        memoryValue = Math.max(memoryValue, parsed);
      }
    }

    if (passed) {
      passedCount += 1;
    }

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
    fatalStatus ||
    (passedCount === testCases.length ? 'Accepted' : 'Wrong Answer');

  return {
    status: finalStatus,
    passedCount,
    totalCount: testCases.length,
    runtime: runtimeValue ? `${runtimeValue.toFixed(3)}s` : '',
    memory: memoryValue ? `${memoryValue} KB` : '',
    results
  };
};

module.exports = {
  LANGUAGE_MAP,
  normalizeLanguage,
  normalizeOutput,
  getJudgeConfigStatus,
  runCode,
  runAgainstTestCases
};
