const axios = require('axios');
const { getTestPrompt } = require('../templates/prompts');

// Configuration for Hyperbolic API
const HYPERBOLIC_API_URL = process.env.HYPERBOLIC_API_URL || "https://api.hyperbolic.xyz/v1";
const HYPERBOLIC_API_KEY = process.env.HYPERBOLIC_API_KEY;
const DEFAULT_MODEL = process.env.HYPERBOLIC_MODEL;

/**
 * Generates Foundry test suites for a given Solidity contract
 * @param {string} contractCode - The Solidity contract code
 * @param {string} contractName - The name of the contract
 * @param {string} testType - The type of test to generate (unit, integration, fuzz)
 * @returns {Promise<string>} - The generated test suite code
 */
async function generateTests(contractCode, contractName, testType = 'unit') {
  console.log(`[testGenerator] Starting test generation for ${contractName}`);
  
  if (!HYPERBOLIC_API_KEY) {
    console.error('[testGenerator] HYPERBOLIC_API_KEY is not set in environment variables');
    throw new Error("HYPERBOLIC_API_KEY is not set in environment variables");
  }

  // Prepare the prompt for the LLM
  console.log(`[testGenerator] Preparing prompt for ${contractName}`);
  const prompt = getTestPrompt(contractCode, contractName, testType);
  console.log(`[testGenerator] Prompt length: ${prompt.length} characters`);

  // Determine if this is a hook contract
  const isHookContract = contractCode.includes("BaseHook") || 
                         contractCode.includes("IHooks") || 
                         contractCode.includes("getHooksCalls") ||
                         contractCode.includes("beforeSwap") ||
                         contractCode.includes("afterSwap");
  
  console.log(`[testGenerator] Is hook contract: ${isHookContract}`);

  // Create appropriate system prompt based on contract type
  const systemPrompt = isHookContract 
    ? "You are an expert Solidity developer specializing in writing Foundry test suites for Uniswap V4 Hooks. Your task is to analyze Solidity contracts and create comprehensive test suites that cover all functionality, edge cases, and potential vulnerabilities. You understand the unique requirements of testing hook contracts, including hook flags, permissions, and the interaction with the PoolManager."
    : "You are an expert Solidity developer specializing in writing Foundry test suites. Your task is to analyze Solidity contracts and create comprehensive test suites that cover all functionality, edge cases, and potential vulnerabilities.";

  try {
    console.log(`[testGenerator] Calling Hyperbolic API at ${HYPERBOLIC_API_URL}/chat/completions`);
    console.log(`[testGenerator] Using model: ${DEFAULT_MODEL}`);
    
    // Call Hyperbolic Chat API
    const response = await axios.post(
      `${HYPERBOLIC_API_URL}/chat/completions`,
      {
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${HYPERBOLIC_API_KEY}`
        }
      }
    );

    console.log(`[testGenerator] Received response from Hyperbolic API`);
    console.log(`[testGenerator] Response status: ${response.status}`);
    console.log(`[testGenerator] Response data keys: ${Object.keys(response.data)}`);
    
    // Extract the generated test code from the response
    const generatedTest = response.data.choices[0].message.content;
    console.log(`[testGenerator] Generated test length: ${generatedTest.length} characters`);
    
    // Process the response to extract just the code
    const extractedCode = extractTestCode(generatedTest);
    console.log(`[testGenerator] Extracted code length: ${extractedCode.length} characters`);
    
    return extractedCode;
  } catch (error) {
    console.error("[testGenerator] Error calling Hyperbolic API:", error.response?.data || error.message);
    console.error("[testGenerator] Error details:", error);
    throw new Error(`Failed to generate test suite: ${error.message}`);
  }
}

/**
 * Extracts the actual test code from the LLM response
 * @param {string} response - The raw LLM response
 * @returns {string} - The extracted test code
 */
function extractTestCode(response) {
  console.log(`[extractTestCode] Extracting code from response of length ${response.length}`);
  
  // Look for code blocks in the response
  const codeBlockRegex = /```(?:solidity)?\s*([\s\S]*?)```/g;
  const matches = [...response.matchAll(codeBlockRegex)];
  
  console.log(`[extractTestCode] Found ${matches.length} code blocks`);
  
  if (matches.length > 0) {
    // Return the content of the first code block
    const extractedCode = matches[0][1].trim();
    console.log(`[extractTestCode] Extracted code of length ${extractedCode.length}`);
    return extractedCode;
  }
  
  // If no code blocks found, return the whole response
  console.log(`[extractTestCode] No code blocks found, returning whole response`);
  return response.trim();
}

module.exports = {
  generateTests
}; 