require('dotenv').config();
const axios = require("axios");
const { RiskLevel } = require('./risk-level');
const { AuditDatabase, AuditDatabaseUtils } = require('./audit-database');

// Configuration for Hyperbolic API
const HYPERBOLIC_API_URL = process.env.HYPERBOLIC_API_URL || "https://api.hyperbolic.xyz/v1";
const HYPERBOLIC_API_KEY = process.env.HYPERBOLIC_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvbGl2ZXJAdGlwdG9uZmFybXMuY29tIiwiaWF0IjoxNzQwMDc3MzEzfQ.6Oguv3tAlXKHA7FXXm6hKpt7IcIMpjWzusKuH6VdN50";
const DEFAULT_MODEL = process.env.HYPERBOLIC_MODEL || "Llama-3.1-405B"; // Default to Llama 3.1 405B
const QWEN_CODER_MODEL = "Qwen/Qwen2.5-Coder-32B-Instruct"; // Qwen coder model

/**
 * Analyzes Solidity code for security vulnerabilities using Hyperbolic's LLM
 * @param {string} solidityCode - The Solidity code to analyze
 * @param {string} model - Optional model override (defaults to env var or Llama 3.1 405B)
 * @returns {Object} Analysis results with vulnerabilities and recommendations
 */
async function analyzeSolidityCode(solidityCode, model = QWEN_CODER_MODEL) {
  if (!HYPERBOLIC_API_KEY) {
    throw new Error("HYPERBOLIC_API_KEY is not set in environment variables");
  }

  try {
    console.log(`Analyzing Solidity code using ${model}...`);
    
    // Check for malicious code patterns first
    const maliciousCodeCheck = AuditDatabaseUtils.detectMaliciousPatterns(solidityCode);
    
    // Create the prompt for security analysis
    const prompt = createSecurityAnalysisPrompt(solidityCode, maliciousCodeCheck);
    
    // Call Hyperbolic API
    const response = await axios.post(
      `${HYPERBOLIC_API_URL}/completions`,
      {
        model: model,
        prompt: prompt,
        max_tokens: 4000,
        temperature: 0.1,
        top_p: 0.95,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${HYPERBOLIC_API_KEY}` 
        }
      }
    );

    // Parse the response
    const analysisText = response.data.choices[0].text;
    const analysis = parseAnalysisResponse(analysisText, solidityCode, maliciousCodeCheck);
    
    console.log(`Analysis complete. Found ${analysis.vulnerabilities ? analysis.vulnerabilities.length : 0} vulnerabilities.`);
    if (analysis.contains_malicious_code) {
      console.log(`WARNING: Detected ${analysis.malicious_patterns ? analysis.malicious_patterns.length : 0} malicious code patterns!`);
    }
    
    return analysis;
  } catch (error) {
    console.error("Error analyzing Solidity code:", error.message);
    if (error.response) {
      console.error("API response:", error.response.data);
    }
    throw new Error(`Failed to analyze Solidity code: ${error.message}`);
  }
}

/**
 * Creates a prompt for security analysis
 * @param {string} solidityCode - The Solidity code to analyze
 * @param {Object} maliciousCodeCheck - Results of malicious code pattern detection
 * @returns {string} The formatted prompt
 */
function createSecurityAnalysisPrompt(solidityCode, maliciousCodeCheck) {
  // Get malicious patterns
  const maliciousPatterns = AuditDatabaseUtils.getMaliciousPatterns();
  
  let maliciousPatternsText = '';
  if (maliciousCodeCheck && maliciousCodeCheck.containsMaliciousCode) {
    maliciousPatternsText = `
IMPORTANT: Initial analysis suggests this code may contain MALICIOUS PATTERNS:
${maliciousCodeCheck.detectedPatterns.map(pattern => 
  `- ${pattern.name} (${pattern.risk_level}): ${pattern.description}`
).join('\n')}

Pay special attention to these patterns and confirm if they are present.
`;
  }
  
  // Format malicious patterns for the prompt
  let maliciousPatternExamples = '';
  Object.entries(maliciousPatterns).forEach(([category, patterns]) => {
    maliciousPatternExamples += `\n${category.toUpperCase()}:\n`;
    patterns.forEach(pattern => {
      maliciousPatternExamples += `- ${pattern.name} (${pattern.risk_level}): ${pattern.description}\n`;
    });
  });

  return `
You are a security expert specializing in Solidity smart contract auditing. Analyze the following Solidity code for security vulnerabilities and malicious patterns.

IMPORTANT DISTINCTION: Differentiate between VULNERABILITIES (unintentional security issues) and MALICIOUS CODE (intentionally harmful implementations).

Look for these vulnerabilities:
1. Reentrancy vulnerabilities
2. Integer overflow/underflow
3. Unchecked external calls
4. Access control issues
5. Front-running vulnerabilities
6. Gas optimization issues
7. Logic errors
8. Sandwich attack vulnerabilities
9. MEV vulnerabilities

Also look for these malicious code patterns:
${maliciousPatternExamples}

${maliciousPatternsText}

CODE TO ANALYZE:
\`\`\`solidity
${solidityCode}
\`\`\`

Provide your analysis in the following JSON format:
{
  "is_vulnerable": boolean,
  "contains_malicious_code": boolean,
  "overall_risk_level": "None" | "Low" | "Medium" | "High" | "Critical",
  "vulnerabilities": [
    {
      "name": "string",
      "description": "string",
      "risk_level": "Low" | "Medium" | "High" | "Critical",
      "location": "string (line numbers or function names)",
      "suggested_fix": "string"
    }
  ],
  "malicious_patterns": [
    {
      "name": "string",
      "description": "string",
      "risk_level": "High" | "Critical",
      "location": "string (line numbers or function names)",
      "impact": "string"
    }
  ],
  "recommendation": "string"
}

Be thorough and precise in your analysis. If you're uncertain about a potential vulnerability or malicious pattern, include it with an appropriate risk level and note your uncertainty.
`;
}

/**
 * Simple hash function for code fingerprinting
 * @param {string} str - String to hash
 * @returns {string} Hash value
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Parses the LLM response into an analysis object
 * @param {string} responseText - The raw response from the LLM
 * @param {string} originalCode - The original Solidity code
 * @param {Object} maliciousCodeCheck - Results of malicious code pattern detection
 * @returns {Object} Complete analysis results
 */
function parseAnalysisResponse(responseText, originalCode, maliciousCodeCheck) {
  try {
    // Clean the response text to handle markdown formatting
    let cleanedText = responseText;
    
    // Remove markdown code block markers if present
    cleanedText = cleanedText.replace(/```json\s*/g, '');
    cleanedText = cleanedText.replace(/```\s*$/g, '');
    
    // Directly parse the JSON response
    const analysis = JSON.parse(cleanedText);
    
    // Add malicious patterns from static analysis if they exist
    if (maliciousCodeCheck && maliciousCodeCheck.containsMaliciousCode) {
      if (!analysis.contains_malicious_code) {
        analysis.contains_malicious_code = true;
      }
      
      // Initialize malicious_patterns array if it doesn't exist
      if (!analysis.malicious_patterns) {
        analysis.malicious_patterns = [];
      }
      
      // Add statically detected patterns
      maliciousCodeCheck.detectedPatterns.forEach(pattern => {
        analysis.malicious_patterns.push({
          name: pattern.name,
          description: pattern.description,
          risk_level: pattern.risk_level,
          location: "Detected by static analysis",
          impact: "See description"
        });
      });
    }
    
    return analysis;
  } catch (error) {
    console.error("Error parsing LLM response:", error);
    console.log("Response text:", responseText);
    
    // If JSON parsing fails, create a basic response with malicious code check results
    return {
      is_vulnerable: maliciousCodeCheck ? maliciousCodeCheck.containsMaliciousCode : false,
      contains_malicious_code: maliciousCodeCheck ? maliciousCodeCheck.containsMaliciousCode : false,
      overall_risk_level: "Medium",
      vulnerabilities: [],
      malicious_patterns: maliciousCodeCheck && maliciousCodeCheck.containsMaliciousCode ? 
        maliciousCodeCheck.detectedPatterns.map(pattern => ({
          name: pattern.name,
          description: pattern.description,
          risk_level: pattern.risk_level,
          location: "Detected by static analysis",
          impact: "See description"
        })) : [],
      recommendation: "Error parsing LLM response. Please check the logs."
    };
  }
}

module.exports = {
  analyzeSolidityCode
};