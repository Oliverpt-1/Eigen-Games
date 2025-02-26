// hook_deployer/index.js
require('dotenv').config();
console.log("RPC_URL:", process.env.RPC_URL); // Debug: print RPC_URL

const express = require('express');
const bodyParser = require('body-parser');
const deployContract = require('./deploy');

const app = express();

app.use(bodyParser.json());

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`hook_deployer server running on port ${PORT}`);
});
