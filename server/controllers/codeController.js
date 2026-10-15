const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const {
  runCode,
  runAgainstTestCases,
  getJudgeConfigStatus
} = require('../services/codeRunnerService');
const { judgeWithHarness, runWithCustomInput } = require('../services/codeHarnessService');
const { updateAfterSubmission } = require('../services/progressService');

const resolveErrorStatus = (error) => {
  const message = error.message || '';
  if (message.includes('Unsupported language') || message.includes('required')) {
    return 400;
  }
  if (message.includes('configured')) {
    return 500;
  }
  return 502;
};

const buildProblemFilter = (user, problemId) => {
  const filter = { _id: problemId };
  if (user.role !== 'admin') {
    filter.isPublished = true;
  }
  return filter;
};

const sanitizeVisibleFailure = (result) => {
  if (!result) {
    return null;
  }

  return {
    input: result.input,
    expectedOutput: result.expectedOutput,
    actualOutput: result.actualOutput,
    status: result.status
  };
};

const toPlainTestCase = (testCase, visibility) => ({
  ...(testCase.toObject ? testCase.toObject() : testCase),
  visibility
});

// @desc    Run code against visible test cases or custom input
// @route   POST /api/code/run
exports.run = async (req, res) => {
  try {
    const { problemId, language, code, customInput } = req.body;

    if (!problemId || !language || !code) {
      return res.status(400).json({
        success: false,
        message: 'problemId, language, and code are required.'
      });
    }

    const problem = await Problem.findOne(buildProblemFilter(req.user, problemId));
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    if (problem.problemType !== 'Coding') {
      return res.status(400).json({
        success: false,
        message: 'Run is only supported for coding problems.'
      });
    }

    if (customInput !== undefined && customInput !== null && customInput !== '') {
      const result = await runCode({
        sourceCode: code,
        language,
        stdin: customInput
      });

      return res.json({
        success: true,
        data: {
          stdout: result.stdout,
          stderr: result.stderr,
          compile_output: result.compile_output,
          status: result.status,
          runtime: result.time ? `${result.time}s` : '',
          memory: result.memory,
          testCaseResults: [
            {
              input: customInput,
              actualOutput: result.stdout
            }
          ]
        }
      });
    }

    const execution = await runAgainstTestCases({
      code,
      language,
      testCases: problem.visibleTestCases || []
    });

    const compileOutput = execution.results.find((item) => item.compile_output)?.compile_output || '';
    const stderr = execution.results.find((item) => item.stderr)?.stderr || '';

    res.json({
      success: true,
      data: {
        stdout: execution.results.map((item) => item.actualOutput).join('\n'),
        stderr,
        compile_output: compileOutput,
        status: execution.status,
        runtime: execution.runtime,
        memory: execution.memory,
        testCaseResults: execution.results.map((item) => ({
          input: item.input,
          expectedOutput: item.expectedOutput,
          actualOutput: item.actualOutput,
          passed: item.passed,
          status: item.status,
          runtime: item.runtime,
          memory: item.memory
        }))
      }
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({ success: false, message: error.message });
  }
};

// @desc    Report whether the Judge0 backend is configured
// @route   GET /api/code/status
exports.status = async (req, res) => {
  res.json({
    success: true,
    data: getJudgeConfigStatus(),
    supportedLanguages: ['C++', 'Java', 'Python', 'JavaScript']
  });
};

// @desc    Execute a complete program with free-form stdin (Run Code tab)
// @route   POST /api/code/execute
exports.execute = async (req, res) => {
  try {
    const { language, code, stdin } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        message: 'language and code are required.'
      });
    }

    const result = await runCode({
      sourceCode: code,
      language,
      stdin: stdin || ''
    });

    const executionStatus =
      result.compile_output || result.judgeStatusId === 6
        ? 'Compilation Error'
        : result.judgeStatusId === 5
          ? 'Time Limit Exceeded'
          : [7, 8, 9, 10, 11, 12, 14].includes(result.judgeStatusId) || result.stderr
            ? 'Runtime Error'
            : null;

    res.json({
      success: true,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        compile_output: result.compile_output,
        status: result.status,
        executionStatus,
        runtime: result.time ? `${result.time}s` : '',
        memory: result.memory
      }
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({ success: false, message: error.message });
  }
};

// @desc    Run or judge a function-style exercise through the generated harness
// @route   POST /api/code/judge
exports.judge = async (req, res) => {
  try {
    const { language, code, functionName, testCases, customInput } = req.body;

    if (!language || !code || !functionName) {
      return res.status(400).json({
        success: false,
        message: 'language, code, and functionName are required.'
      });
    }

    // Free-form run: the student supplied their own stdin.
    if (customInput !== undefined && customInput !== null) {
      const execution = await runWithCustomInput({
        language,
        code,
        functionName,
        input: customInput
      });

      return res.json({
        success: true,
        data: {
          mode: 'run',
          stdout: execution.stdout,
          stderr: execution.stderr,
          compile_output: execution.compile_output,
          status: execution.executionStatus || execution.status,
          executionStatus: execution.executionStatus,
          runtime: execution.runtime,
          memory: execution.memory,
          harnessed: execution.harnessed,
          harnessNote: execution.harnessNote,
          passedCount: execution.executionStatus ? 0 : 1,
          totalCount: 1,
          testCaseResults: [
            {
              input: customInput,
              actualOutput: execution.stdout,
              passed: !execution.executionStatus,
              status: execution.executionStatus || 'Accepted',
              runtime: execution.runtime,
              memory: execution.memory
            }
          ]
        }
      });
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide testCases or a customInput to run.'
      });
    }

    const execution = await judgeWithHarness({
      language,
      code,
      functionName,
      testCases
    });

    const compileOutput = execution.results.find((item) => item.compile_output)?.compile_output || '';
    const stderr = execution.results.find((item) => item.stderr)?.stderr || '';

    res.json({
      success: true,
      data: {
        mode: 'judge',
        stdout: execution.results.map((item) => item.actualOutput).join('\n'),
        stderr,
        compile_output: compileOutput,
        status: execution.status,
        runtime: execution.runtime,
        memory: execution.memory,
        harnessed: execution.harnessed,
        harnessNote: execution.harnessNote,
        passedCount: execution.passedCount,
        totalCount: execution.totalCount,
        testCaseResults: execution.results.map((item) => ({
          input: item.input,
          expectedOutput: item.expectedOutput,
          actualOutput: item.actualOutput,
          passed: item.passed,
          status: item.status,
          runtime: item.runtime,
          memory: item.memory
        }))
      }
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({ success: false, message: error.message });
  }
};

// @desc    Submit code against visible and hidden test cases
// @route   POST /api/code/submit
exports.submit = async (req, res) => {
  try {
    const { problemId, language, code } = req.body;

    if (!problemId || !language || !code) {
      return res.status(400).json({
        success: false,
        message: 'problemId, language, and code are required.'
      });
    }

    const problem = await Problem.findOne(buildProblemFilter(req.user, problemId));
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    if (problem.problemType !== 'Coding') {
      return res.status(400).json({
        success: false,
        message: 'Submit is only supported for coding problems.'
      });
    }

    const visibleCases = (problem.visibleTestCases || []).map((testCase) =>
      toPlainTestCase(testCase, 'visible')
    );
    const hiddenCases = (problem.hiddenTestCases || []).map((testCase) =>
      toPlainTestCase(testCase, 'hidden')
    );

    const execution = await runAgainstTestCases({
      code,
      language,
      testCases: [...visibleCases, ...hiddenCases]
    });

    const firstVisibleFailure = execution.results.find(
      (item, index) => !item.passed && [...visibleCases, ...hiddenCases][index]?.visibility === 'visible'
    );
    const firstExecutionFailure = execution.results.find(
      (item) => item.status === 'Compilation Error' || item.status === 'Runtime Error' || item.status === 'Time Limit Exceeded'
    );

    const submission = await Submission.create({
      user: req.user._id,
      problem: problem._id,
      domain: problem.domain,
      topic: problem.topic,
      language,
      code,
      status: execution.status,
      passedTestCases: execution.passedCount,
      totalTestCases: execution.totalCount,
      runtime: execution.runtime,
      memory: execution.memory,
      errorMessage:
        firstExecutionFailure?.compile_output ||
        firstExecutionFailure?.stderr ||
        (execution.status === 'Wrong Answer' ? 'Wrong Answer' : '')
    });

    await updateAfterSubmission({
      userId: req.user._id,
      problem,
      status: execution.status
    });

    res.json({
      success: true,
      data: {
        submissionId: submission._id,
        status: execution.status,
        passedTestCases: execution.passedCount,
        totalTestCases: execution.totalCount,
        failedTestCase: sanitizeVisibleFailure(firstVisibleFailure),
        runtime: execution.runtime,
        memory: execution.memory
      }
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({ success: false, message: error.message });
  }
};
