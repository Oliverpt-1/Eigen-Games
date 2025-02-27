require('dotenv').config();
const agentService = require('./agent.service');
const dalService = require('./dal.service');

/**
 * AVS Agent Service
 * 
 * This service handles the integration between the security agent and the Othentic AVS Framework.
 * It receives Solidity code, sends it to the agent for analysis, and submits the results to the AVS network.
 */
class AVSAgentService {
  /**
   * Executes a security analysis task on the provided Solidity code
   * 
   * @param {string} solidityCode - The Solidity code to analyze
   * @param {number} taskDefinitionId - The task definition ID in the AVS framework
   * @param {string} model - Optional model to use for analysis
   * @returns {Object} The result of the task execution including the proofOfTask
   */
  async executeSecurityAnalysisTask(solidityCode, taskDefinitionId = 0, model = null) {
    if (!solidityCode) {
      throw new Error("Solidity code is required for security analysis");
    }

    //console.log(`Executing security analysis task with taskDefinitionId: ${taskDefinitionId}`);
    //console.log(`Analyzing Solidity code (${solidityCode.length} characters)`);

    try {
      // Call the agent service to analyze the Solidity code
      let result;
      if (model === 'qwen') {
        // Use Qwen Coder model if specified
        result = await agentService.analyzeWithQwenCoder(solidityCode);
      } else {
        // Use default model
        result = await agentService.analyzeSolidityCode(solidityCode);
      }

      // Store the full analysis result in IPFS and get the CID as proof of task
      const proofOfTask = await dalService.publishJSONToIpfs(result);
      
      // Prepare a summary of the analysis for the task data
      const data = JSON.stringify({
        vulnerabilities_count: result.vulnerabilities ? result.vulnerabilities.length : 0,
        risk_level: result.overall_risk_level,
        is_vulnerable: result.is_vulnerable,
        contains_malicious_code: result.contains_malicious_code
      });
      
      // Submit the task to the AVS network
      await dalService.sendTask(proofOfTask, data, taskDefinitionId);
      
      // Return the complete result
      return {
        proofOfTask,
        data,
        taskDefinitionId,
        analysis_summary: {
          vulnerabilities_count: result.vulnerabilities ? result.vulnerabilities.length : 0,
          risk_level: result.overall_risk_level,
          is_vulnerable: result.is_vulnerable,
          contains_malicious_code: result.contains_malicious_code
        },
        full_analysis: result
      };
    } catch (error) {
      console.error("Error in security analysis task execution:", error);
      throw new Error(`Security analysis task execution failed: ${error.message}`);
    }
  }

  /**
   * Retrieves a previously executed analysis from IPFS
   * 
   * @param {string} cid - The IPFS content identifier for the analysis
   * @returns {Object} The analysis results
   */
  async getAnalysisResults(cid) {
    if (!cid) {
      throw new Error("CID is required to retrieve analysis results");
    }

    try {
      return await dalService.getIPfsTask(cid);
    } catch (error) {
      console.error(`Error retrieving analysis results (CID: ${cid}):`, error);
      throw new Error(`Failed to retrieve analysis results: ${error.message}`);
    }
  }
}

module.exports = new AVSAgentService();


//Receives Solidity code

// Make call to agent.service.js with the Solidity code

// Receives the response from agent.service.js

// Store the response in the database

// Generate a proofOfTask (e.g., storing results in IPFS and returning the CID)

//Once the task is executed, submit the proofOfTask to the p2p network using the sendTask RPC call. A new task is generated off-chain when the Performer node initiates the sendTask RPC call. This is the format for the RPC call:
//** 

// 
// Copy
//{
//    "jsonrpc": "2.0",
//    "method": "sendTask",
//    "params": [
//      <proofOfTask>, 
//      <data>, 
//      <taskDefinitionId>, 
//      <performerAddress>, 
//      <signature>
//    ]
//  }
// 
// */

//The Execution Service should be containerized using Docker for ease of deployment and scalability. This ensures the service is isolated and easily managed, replicated, and scaled across different environments. Refer to the example in the Simple Price Oracle AVS repository for guidance on how to set up your containerized service.