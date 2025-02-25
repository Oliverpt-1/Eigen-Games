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
async function analyzeSolidityCode(solidityCode, model = DEFAULT_MODEL) {
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
    
    console.log(`Analysis complete. Found ${analysis.vulnerabilities.length} vulnerabilities.`);
    if (analysis.contains_malicious_code) {
      console.log(`WARNING: Detected ${analysis.malicious_patterns.length} malicious code patterns!`);
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
 * Analyzes Solidity code using the Qwen2.5-Coder-32B-Instruct model via chat completions API
 * @param {string} solidityCode - The Solidity code to analyze
 * @returns {Object} Analysis results with vulnerabilities and recommendations
 */
async function analyzeWithQwenCoder(solidityCode) {
  try {
    console.log(`Analyzing Solidity code using ${QWEN_CODER_MODEL}...`);
    
    // Check for malicious code patterns first
    const maliciousCodeCheck = AuditDatabaseUtils.detectMaliciousPatterns(solidityCode);
    
    // Create the chat message for security analysis
    const securityPrompt = createSecurityChatPrompt(solidityCode, maliciousCodeCheck);
    
    // Call Hyperbolic Chat API
    const response = await axios.post(
      `${HYPERBOLIC_API_URL}/chat/completions`,
      {
        model: QWEN_CODER_MODEL,
        messages: [
          {
            role: 'user',
            content: securityPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        top_p: 0.9,
        stream: false
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${HYPERBOLIC_API_KEY}`
        }
      }
    );

    // Parse the response
    const analysisText = response.data.choices[0].message.content;
    
    // Try to extract JSON from the response
    const analysis = extractJsonFromResponse(analysisText, solidityCode, maliciousCodeCheck);
    
    console.log(`Analysis complete. Found ${analysis.vulnerabilities.length} vulnerabilities.`);
    if (analysis.contains_malicious_code) {
      console.log(`WARNING: Detected ${analysis.malicious_patterns.length} malicious code patterns!`);
    }
    
    return analysis;
  } catch (error) {
    console.error("Error analyzing Solidity code with Qwen Coder:", error.message);
    if (error.response) {
      console.error("API response:", error.response.data);
    }
    throw new Error(`Failed to analyze Solidity code with Qwen Coder: ${error.message}`);
  }
}

/**
 * Creates a chat prompt for security analysis
 * @param {string} solidityCode - The Solidity code to analyze
 * @param {Object} maliciousCodeCheck - Results of malicious code pattern detection
 * @returns {string} The formatted prompt
 */
function createSecurityChatPrompt(solidityCode, maliciousCodeCheck) {
  // Get relevant vulnerabilities from the database
  const hookVulnerabilities = AuditDatabaseUtils.getVulnerabilities('v4Hooks');
  
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
  
  // Format hook vulnerabilities for the prompt
  let hookVulnerabilitiesText = '';
  if (hookVulnerabilities) {
    Object.entries(hookVulnerabilities).forEach(([category, vulnerabilities]) => {
      vulnerabilities.forEach(vuln => {
        hookVulnerabilitiesText += `- ${vuln.name} (${vuln.risk_level}):\n`;
        hookVulnerabilitiesText += `  ${vuln.description}\n`;
        hookVulnerabilitiesText += `  Vulnerable Pattern: \`${vuln.vulnerable_pattern}\`\n`;
        hookVulnerabilitiesText += `  Secure Pattern: \`${vuln.secure_pattern}\`\n\n`;
      });
    });
  }
  
  return `You are a security expert specializing in Solidity smart contract auditing, with deep expertise in Uniswap V4 hooks. You have been trained on numerous audit reports and known vulnerabilities.

IMPORTANT DISTINCTION: Differentiate between VULNERABILITIES (unintentional security issues) and MALICIOUS CODE (intentionally harmful implementations).

Known V4 Hook Vulnerabilities to consider:
${hookVulnerabilitiesText}

Known Malicious Code Patterns to detect:
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

Be thorough and precise in your analysis. If you're uncertain about a potential vulnerability or malicious pattern, include it with an appropriate risk level and note your uncertainty.`;
}

/**
 * Extracts key fields from a text response without parsing the entire JSON
 * @param {string} responseText - The raw response from the LLM
 * @param {string} originalCode - The original Solidity code
 * @param {Object} maliciousCodeCheck - Results of malicious code pattern detection
 * @returns {Object} Simplified analysis results with key fields
 */
function extractJsonFromResponse(responseText, originalCode, maliciousCodeCheck) {
  try {
    // Extract just the key fields using regex instead of parsing the entire JSON
    const isVulnerableMatch = responseText.match(/"is_vulnerable"\s*:\s*(true|false)/i);
    const containsMaliciousMatch = responseText.match(/"contains_malicious_code"\s*:\s*(true|false)/i);
    const riskLevelMatch = responseText.match(/"overall_risk_level"\s*:\s*"([^"]*)"/i);
    
    // Create a simplified response with just the key fields
    const simplifiedResponse = {
      is_vulnerable: isVulnerableMatch ? isVulnerableMatch[1] === 'true' : false,
      contains_malicious_code: containsMaliciousMatch ? containsMaliciousMatch[1] === 'true' : false,
      overall_risk_level: riskLevelMatch ? riskLevelMatch[1] : "Medium",
      analysis_timestamp: Date.now(),
      code_hash: hashCode(originalCode),
      vulnerabilities: [], // Initialize empty array to prevent length access errors
      malicious_patterns: [], // Initialize empty array to prevent length access errors
      vulnerability_count: 0,
      recommendation: "Analysis completed with simplified output."
    };
    
    // Add detected malicious patterns if any
    if (maliciousCodeCheck && maliciousCodeCheck.containsMaliciousCode) {
      if (!simplifiedResponse.contains_malicious_code) {
        simplifiedResponse.contains_malicious_code = true;
      }
      
      simplifiedResponse.malicious_patterns = maliciousCodeCheck.detectedPatterns.map(pattern => ({
        name: pattern.name,
        description: pattern.description,
        risk_level: pattern.risk_level,
        location: "Detected by static analysis",
        impact: "See description"
      }));
    }
    
    // Try to extract some vulnerabilities if possible
    const vulnerabilitiesMatch = responseText.match(/"vulnerabilities"\s*:\s*\[([\s\S]*?)(?:\]\s*,|\]$)/);
    if (vulnerabilitiesMatch && vulnerabilitiesMatch[1]) {
      // Just count the number of vulnerabilities by counting opening braces
      const vulnerabilityCount = (vulnerabilitiesMatch[1].match(/{/g) || []).length;
      simplifiedResponse.vulnerability_count = vulnerabilityCount;
    }
    
    console.log(`Analysis complete. Risk level: ${simplifiedResponse.overall_risk_level}. Vulnerable: ${simplifiedResponse.is_vulnerable}. Malicious: ${simplifiedResponse.contains_malicious_code}.`);
    
    return simplifiedResponse;
  } catch (error) {
    console.error("Error extracting key fields from LLM response:", error);
    
    // Create a fallback response with just the key fields
    return createFallbackResponse(originalCode, maliciousCodeCheck, responseText);
  }
}

/**
 * Creates a fallback response when extraction fails
 * @param {string} originalCode - The original Solidity code
 * @param {Object} maliciousCodeCheck - Results of malicious code pattern detection
 * @param {string} responseText - The raw response text
 * @returns {Object} A fallback response object with key fields
 */
function createFallbackResponse(originalCode, maliciousCodeCheck, responseText) {
  const fallbackResponse = {
    is_vulnerable: maliciousCodeCheck ? maliciousCodeCheck.containsMaliciousCode : false,
    contains_malicious_code: maliciousCodeCheck ? maliciousCodeCheck.containsMaliciousCode : false,
    overall_risk_level: RiskLevel.MEDIUM,
    vulnerability_count: 0,
    vulnerabilities: [], // Initialize empty array to prevent length access errors
    malicious_patterns: [], // Initialize empty array to prevent length access errors
    analysis_timestamp: Date.now(),
    code_hash: hashCode(originalCode),
    recommendation: "Analysis encountered an error and produced simplified output."
  };
  
  // Add detected malicious patterns if any
  if (maliciousCodeCheck && maliciousCodeCheck.containsMaliciousCode) {
    fallbackResponse.malicious_patterns = maliciousCodeCheck.detectedPatterns.map(pattern => ({
      name: pattern.name,
      description: pattern.description,
      risk_level: pattern.risk_level,
      location: "Detected by static analysis",
      impact: "See description"
    }));
  }
  
  return fallbackResponse;
}

/**
 * Parses the LLM response into a simplified analysis object
 * @param {string} responseText - The raw response from the LLM
 * @param {string} originalCode - The original Solidity code
 * @param {Object} maliciousCodeCheck - Results of malicious code pattern detection
 * @returns {Object} Simplified analysis results
 */
function parseAnalysisResponse(responseText, originalCode, maliciousCodeCheck) {
  try {
    // Try to extract key fields using regex instead of parsing the entire JSON
    return extractJsonFromResponse(responseText, originalCode, maliciousCodeCheck);
  } catch (error) {
    console.error("Error parsing LLM response:", error);
    return createFallbackResponse(originalCode, maliciousCodeCheck, responseText);
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

module.exports = {
  analyzeSolidityCode,
  analyzeWithQwenCoder,
  RiskLevel
};