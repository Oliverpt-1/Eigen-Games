require('dotenv').config();
const axios = require("axios");

var ipfsGateway = '';

function init() {
  ipfsGateway = process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
}

/**
 * Retrieves security analysis results from IPFS using the CID
 * @param {string} cid - The IPFS content identifier
 * @returns {Object} The retrieved security analysis results
 */
async function getIPfsTask(cid) {
  try {
    // Ensure we have the gateway URL
    if (!ipfsGateway) {
      init();
    }
    
    // Construct the full URL to the IPFS content
    const url = `${ipfsGateway}${cid}`;
    console.log(`Retrieving security analysis from IPFS: ${url}`);
    
    // Fetch the data
    const response = await axios.get(url);
    
    // Return the complete analysis results
    return response.data;
  } catch (error) {
    console.error(`Error retrieving security analysis from IPFS (CID: ${cid}):`, error.message);
    throw new Error(`Failed to retrieve security analysis from IPFS: ${error.message}`);
  }
}
  
module.exports = {
  init,
  getIPfsTask
}