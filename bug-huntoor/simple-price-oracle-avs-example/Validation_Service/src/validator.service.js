require('dotenv').config();
const dalService = require("./dal.service");

// Risk level weights for scoring
const RISK_LEVEL_WEIGHTS = {
  "None": 0,
  "Low": 1,
  "Medium": 2,
  "High": 3,
  "Critical": 4
};

/**
 * Validates a security analysis result
 * @param {string} proofOfTask - The IPFS CID of the task to validate
 * @returns {boolean} Whether the analysis is approved
 */
async function validate(proofOfTask) {
  try {
    // Retrieve the security analysis results from IPFS
    const analysisResult = await dalService.getIPfsTask(proofOfTask);
    console.log(`Validating security analysis for CID: ${proofOfTask}`);
    
    // Basic validation checks
    if (!analysisResult || !analysisResult.vulnerabilities) {
      console.error("Invalid analysis result format");
      return false;
    }
    
    // Check for required fields
    if (
      typeof analysisResult.is_vulnerable !== 'boolean' ||
      typeof analysisResult.contains_malicious_code !== 'boolean' ||
      !analysisResult.overall_risk_level ||
      !Array.isArray(analysisResult.vulnerabilities) ||
      !analysisResult.recommendation
    ) {
      console.error("Missing required fields in analysis result");
      return false;
    }
    
    // Validate risk level
    if (!RISK_LEVEL_WEIGHTS.hasOwnProperty(analysisResult.overall_risk_level)) {
      console.error(`Invalid risk level: ${analysisResult.overall_risk_level}`);
      return false;
    }
    
    // Validate vulnerabilities
    for (const vuln of analysisResult.vulnerabilities) {
      if (!vuln.name || !vuln.description || !vuln.risk_level || !vuln.location) {
        console.error("Invalid vulnerability format");
        return false;
      }
      
      // Check risk level of each vulnerability
      if (!RISK_LEVEL_WEIGHTS.hasOwnProperty(vuln.risk_level)) {
        console.error(`Invalid vulnerability risk level: ${vuln.risk_level}`);
        return false;
      }
    }
    
    // Validate malicious patterns if present
    if (analysisResult.contains_malicious_code) {
      if (!Array.isArray(analysisResult.malicious_patterns)) {
        console.error("Malicious code detected but no malicious_patterns array provided");
        return false;
      }
      
      if (analysisResult.malicious_patterns.length === 0) {
        console.error("Inconsistent: marked as containing malicious code but no patterns listed");
        return false;
      }
      
      // Validate each malicious pattern
      for (const pattern of analysisResult.malicious_patterns) {
        if (!pattern.name || !pattern.description || !pattern.risk_level || !pattern.location) {
          console.error("Invalid malicious pattern format");
          return false;
        }
        
        // Malicious patterns should be high or critical risk
        if (RISK_LEVEL_WEIGHTS[pattern.risk_level] < RISK_LEVEL_WEIGHTS["High"]) {
          console.error(`Invalid malicious pattern risk level: ${pattern.risk_level}. Must be High or Critical.`);
          return false;
        }
      }
    } else if (analysisResult.malicious_patterns && analysisResult.malicious_patterns.length > 0) {
      console.error("Inconsistent: marked as not containing malicious code but malicious patterns are listed");
      return false;
    }
    
    // Validate consistency between overall risk and vulnerabilities
    const highestVulnRisk = analysisResult.vulnerabilities.reduce((highest, vuln) => {
      const riskWeight = RISK_LEVEL_WEIGHTS[vuln.risk_level];
      return riskWeight > highest ? riskWeight : highest;
    }, 0);
    
    // If malicious patterns exist, consider their risk levels too
    let highestMaliciousRisk = 0;
    if (analysisResult.malicious_patterns && analysisResult.malicious_patterns.length > 0) {
      highestMaliciousRisk = analysisResult.malicious_patterns.reduce((highest, pattern) => {
        const riskWeight = RISK_LEVEL_WEIGHTS[pattern.risk_level];
        return riskWeight > highest ? riskWeight : highest;
      }, 0);
    }
    
    // Use the highest risk level from either vulnerabilities or malicious patterns
    const highestOverallRisk = Math.max(highestVulnRisk, highestMaliciousRisk);
    const overallRiskWeight = RISK_LEVEL_WEIGHTS[analysisResult.overall_risk_level];
    
    // If there are vulnerabilities but overall risk is None, that's inconsistent
    if ((analysisResult.vulnerabilities.length > 0 || 
        (analysisResult.malicious_patterns && analysisResult.malicious_patterns.length > 0)) && 
        overallRiskWeight === 0) {
      console.error("Inconsistent: vulnerabilities or malicious patterns present but overall risk is None");
      return false;
    }
    
    // If highest risk is much higher than overall risk, that's inconsistent
    if (highestOverallRisk > overallRiskWeight + 1) {
      console.error(`Inconsistent risk levels: highest risk (${highestOverallRisk}) much higher than overall risk (${overallRiskWeight})`);
      return false;
    }
    
    // If is_vulnerable is true but no vulnerabilities, that's inconsistent
    if (analysisResult.is_vulnerable && analysisResult.vulnerabilities.length === 0) {
      console.error("Inconsistent: marked as vulnerable but no vulnerabilities listed");
      return false;
    }
    
    // If is_vulnerable is false but vulnerabilities exist, that's inconsistent
    if (!analysisResult.is_vulnerable && analysisResult.vulnerabilities.length > 0) {
      console.error("Inconsistent: marked as not vulnerable but vulnerabilities are listed");
      return false;
    }
    
    // If malicious code is detected, overall risk should be at least High
    if (analysisResult.contains_malicious_code && overallRiskWeight < RISK_LEVEL_WEIGHTS["High"]) {
      console.error(`Inconsistent: contains malicious code but overall risk is only ${analysisResult.overall_risk_level}`);
      return false;
    }
    
    console.log("Security analysis validation passed");
    return true;
  } catch (err) {
    console.error("Error validating security analysis:", err?.message);
    return false;
  }
}

module.exports = {
  validate,
};