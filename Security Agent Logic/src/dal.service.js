require('dotenv').config();
const pinataSDK = require("@pinata/sdk");
const { ethers, AbiCoder } = require('ethers');
const axios = require("axios");

var pinataApiKey='';
var pinataSecretApiKey='';
var rpcBaseAddress='';
var privateKey='';
var ipfsGateway='';



function init() {
  pinataApiKey = process.env.PINATA_API_KEY;
  pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
  rpcBaseAddress = process.env.OTHENTIC_CLIENT_RPC_ADDRESS;
  privateKey = process.env.PRIVATE_KEY_PERFORMER;
  ipfsGateway = process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
}

async function sendTask(proofOfTask, data, taskDefinitionId) {

  var wallet = new ethers.Wallet(privateKey);
  var performerAddress = wallet.address;

  data = ethers.hexlify(ethers.toUtf8Bytes(data));
  const message = ethers.AbiCoder.defaultAbiCoder().encode(["string", "bytes", "address", "uint16"], [proofOfTask, data, performerAddress, taskDefinitionId]);
  const messageHash = ethers.keccak256(message);
  const sig = wallet.signingKey.sign(messageHash).serialized;

  const jsonRpcBody = {
    jsonrpc: "2.0",
    method: "sendTask",
    params: [
      proofOfTask,
      data,
      taskDefinitionId,
      performerAddress,
      sig,
    ]
  };
    try {
      const provider = new ethers.JsonRpcProvider(rpcBaseAddress);
      const response = await provider.send(jsonRpcBody.method, jsonRpcBody.params);
      console.log("API response:", response);
  } catch (error) {
      console.error("Error making API request:", error);
  }
}

async function publishJSONToIpfs(data) {
  var proofOfTask = '';
  try {   
    const pinata = new pinataSDK(pinataApiKey, pinataSecretApiKey);
    const response = await pinata.pinJSONToIPFS(data);
    proofOfTask = response.IpfsHash;
    console.log(`proofOfTask: ${proofOfTask}`);
  }
  catch (error) {  
    console.error("Error making API request to pinataSDK:", error);
  }
  return proofOfTask;
}

/**
 * Retrieves JSON data from IPFS using the CID
 * @param {string} cid - The IPFS content identifier
 * @returns {Object} The retrieved JSON data
 */
async function getIPfsTask(cid) {
  try {
    // Ensure we have the gateway URL
    if (!ipfsGateway) {
      init();
    }
    
    // Construct the full URL to the IPFS content
    const url = `${ipfsGateway}${cid}`;
    console.log(`Retrieving data from IPFS: ${url}`);
    
    // Fetch the data
    const response = await axios.get(url);
    
    // Return the data
    return response.data;
  } catch (error) {
    console.error(`Error retrieving data from IPFS (CID: ${cid}):`, error.message);
    throw new Error(`Failed to retrieve data from IPFS: ${error.message}`);
  }
}

module.exports = {
  init,
  publishJSONToIpfs,
  sendTask,
  getIPfsTask
}
