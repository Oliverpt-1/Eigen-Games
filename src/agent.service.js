const fs = require('fs');
const path = require('path');

/**
 * Reads the audit-info.txt file and returns its contents
 * @returns {string} The contents of the audit-info.txt file
 */
function readAuditInfoFile() {
  try {
    // Try to find the audit-info.txt file in several possible locations
    const possiblePaths = [
      path.join(__dirname, 'audit-info.txt'),
      path.join(__dirname, '..', 'audit-info.txt'),
      path.join(__dirname, '..', '..', 'audit-info.txt'),
      path.join(process.cwd(), 'audit-info.txt'),
      path.join(process.cwd(), 'src', 'audit-info.txt')
    ];
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log(`Found audit-info.txt at ${filePath}`);
        return fs.readFileSync(filePath, 'utf8');
      }
    }
    
    console.warn('audit-info.txt file not found in expected locations');
    return '';
  } catch (error) {
    console.error('Error reading audit-info.txt:', error.message);
    return '';
  }
}

// Cache the audit info content
const AUDIT_INFO_CONTENT = readAuditInfoFile();

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

  // Include audit info content if available
  const auditInfoSection = AUDIT_INFO_CONTENT ? `
ADDITIONAL SECURITY CONSIDERATIONS FROM AUDIT GUIDELINES:
${AUDIT_INFO_CONTENT}
` : '';

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

${auditInfoSection}

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
  
  // Include audit info content if available
  const auditInfoSection = AUDIT_INFO_CONTENT ? `
ADDITIONAL SECURITY CONSIDERATIONS FROM AUDIT GUIDELINES:
${AUDIT_INFO_CONTENT}
` : '';
  
  return `You are a security expert specializing in Solidity smart contract auditing, with deep expertise in Uniswap V4 hooks. You have been trained on numerous audit reports and known vulnerabilities.

IMPORTANT DISTINCTION: Differentiate between VULNERABILITIES (unintentional security issues) and MALICIOUS CODE (intentionally harmful implementations).

Known V4 Hook Vulnerabilities to consider:
${hookVulnerabilitiesText}

Known Malicious Code Patterns to detect:
${maliciousPatternExamples}

${maliciousPatternsText}

${auditInfoSection}

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