// hook_deployer/deploy.js
const { JsonRpcProvider, Wallet, ContractFactory } = require("ethers");

async function deployContract(abi, bytecode) {
  try {
    console.log("Initializing provider and wallet...");
    const provider = new JsonRpcProvider(process.env.RPC_URL);
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

    console.log("Creating ContractFactory...");
    const factory = new ContractFactory(abi, bytecode, wallet);

    console.log("Deploying contract...");
    const contract = await factory.deploy();

    // Retrieve the deployment transaction details
    const deploymentTx = await contract.deploymentTransaction();
    if (!deploymentTx) {
      throw new Error("Deployment transaction is undefined. Check your ABI/bytecode.");
    }
    console.log("Transaction sent! Hash:", deploymentTx.hash);

    // Wait for the deployment to be mined/confirmed
    await contract.waitForDeployment();
    console.log("Contract deployed at:", contract.target);

    return contract.target;
  } catch (error) {
    console.error("Deployment error:", error);
    throw error;
  }
}

module.exports = deployContract;
