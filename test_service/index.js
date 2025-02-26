// test_service/index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

/**
 * POST /test
 * Expects JSON:
 * {
 *   "contractName": "UserHook",
 *   "sourceCode": "pragma solidity ^0.8.0; contract UserHook { ... }"
 * }
 * Writes the user's code into the Foundry project and runs tests.
 */
app.post('/test', (req, res) => {
  const { contractName, sourceCode } = req.body;
  if (!contractName || !sourceCode) {
    return res.status(400).json({ error: "Missing contractName or sourceCode" });
  }
  
  // Define the path to the Foundry project (assumed to be test_service/foundry_project)
  const foundryProjectDir = path.join(__dirname, 'foundry_project');
  const srcDir = path.join(foundryProjectDir, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }
  
  // Write the user's contract into the Foundry project as, for example, UserHook.sol
  const contractFilePath = path.join(srcDir, `${contractName}.sol`);
  fs.writeFileSync(contractFilePath, sourceCode);
  console.log(`Injected ${contractName}.sol into Foundry project.`);
  
  // Run Foundry tests using "forge test" inside the Foundry project directory
  exec("forge test", { cwd: foundryProjectDir }, (err, stdout, stderr) => {
    if (err) {
      console.error("Foundry test error:", stderr);
      return res.status(500).json({ error: stderr });
    }
    res.json({ output: stdout });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Test service running on port ${PORT}`);
});
