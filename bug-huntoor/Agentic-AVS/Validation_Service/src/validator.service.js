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
    
    // Check only the essential boolean fields
    if (
      typeof analysisResult.is_vulnerable !== 'boolean' ||
      typeof analysisResult.contains_malicious_code !== 'boolean' ||
      !analysisResult.overall_risk_level
    ) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Error validating security analysis:", err?.message);
    return false;
  }
}

module.exports = {
  validate,
};