// compile_service/index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

app.post('/compile', (req, res) => {
  const { contractName, sourceCode } = req.body;
  if (!contractName || !sourceCode) {
    return res.status(400).json({ error: "Missing contractName or sourceCode" });
  }
  
  // Create a directory for contracts if it doesn't exist
  const contractsDir = path.join(__dirname, 'contracts');
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }
  
  // Write the Solidity code to a file (e.g., UserHook.sol)
  const filePath = path.join(contractsDir, `${contractName}.sol`);
  fs.writeFileSync(filePath, sourceCode);
  
  // Use solc CLI to compile the contract.
  const compileCommand = `solc --optimize --bin ${filePath}`;
  exec(compileCommand, (err, stdout, stderr) => {
    if (err) {
      console.error("Compilation error:", stderr);
      return res.status(500).json({ error: stderr });
    }
    res.json({ output: stdout });
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Compile service running on port ${PORT}`);
});
