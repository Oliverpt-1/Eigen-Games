// hook_deployer/index.js
require('dotenv').config();
console.log("RPC_URL:", process.env.RPC_URL); // Debug: print RPC_URL

const express = require('express');
const bodyParser = require('body-parser');
const deployContract = require('./deploy');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();

app.use(bodyParser.json());

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

app.post('/deploy', async (req, res) => {
  const { abi, bytecode } = req.body;
  if (!abi || !bytecode) {
    return res.status(400).json({ error: 'Missing ABI or bytecode' });
  }
  
  try {
    const deployedAddress = await deployContract(abi, bytecode);
    res.json({ success: true, address: deployedAddress });
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to compile and deploy in one step
app.post('/api/compile-and-deploy', (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  // Create temp directory for this request
  const id = Date.now().toString();
  const workDir = path.join(tempDir, id);
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(path.join(workDir, 'src'), { recursive: true });
  
  // Write the code to a file
  fs.writeFileSync(path.join(workDir, 'src', 'Contract.sol'), code);
  
  // Run the compilation container
  exec(`docker run --rm -v ${workDir}:/app compiler-image`, async (error, stdout, stderr) => {
    if (error) {
      return res.json({
        success: false,
        error: stderr || error.message
      });
    }
    
    try {
      // Read the compiled artifact (contains bytecode and ABI)
      const artifactPath = path.join(workDir, 'out', 'Contract.sol', 'Contract.json');
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      
      // Deploy using your existing deploy function
      const deployedAddress = await deployContract(artifact.abi, artifact.bytecode);
      
      res.json({
        success: true,
        address: deployedAddress,
        message: 'Contract compiled and deployed successfully'
      });
    } catch (deployError) {
      res.json({
        success: false,
        error: deployError.message
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`hook_deployer server running on port ${PORT}`);
});
