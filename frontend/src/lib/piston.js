// Judge0 API is used as a free public service for code execution
// Since Piston API requires an authorization token now, we switch to Judge0 CE.

const JUDGE0_API = "https://ce.judge0.com/submissions?base64_encoded=false&wait=true";

const LANGUAGE_VERSIONS = {
  javascript: { language_id: 93, name: "Node.js 18.15.0" },
  python: { language_id: 92, name: "Python 3.11.2" },
  java: { language_id: 91, name: "Java 17.0.6" },
};

/**
 * @param {string} language - programming language
 * @param {string} code - source code to executed
 * @returns {Promise<{success:boolean, output?:string, error?: string}>}
 */
export async function executeCode(language, code) {
  try {
    const languageConfig = LANGUAGE_VERSIONS[language];

    if (!languageConfig) {
      return {
        success: false,
        error: `Unsupported language: ${language}`,
      };
    }

    const response = await fetch(JUDGE0_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageConfig.language_id,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();

    const output = data.stdout || "";
    const stderr = data.stderr || data.compile_output || data.message || "";

    if (data.status && data.status.id !== 3) { // 3 means "Accepted"
      return {
        success: false,
        output: output,
        error: stderr || `Execution failed: ${data.status.description}`,
      };
    }

    return {
      success: true,
      output: output || "No output",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to execute code: ${error.message}`,
    };
  }
}