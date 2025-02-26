// hook_deployer/solidity_service.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Endpoint to compile Solidity code
app.post('/api/compile', (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  // Create a unique ID for this request
  const id = Date.now().toString();
  const workDir = path.join(tempDir, id);
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(path.join(workDir, 'src'), { recursive: true });
  
  // Write the code to a file
  fs.writeFileSync(path.join(workDir, 'src', 'Contract.sol'), code);
  
  // Run the compilation container
  exec(`docker run --rm -v ${workDir}:/app compiler-image`, (error, stdout, stderr) => {
    if (error) {
      return res.json({
        success: false,
        error: stderr || error.message
      });
    }
    
    try {
      // Read the compiled artifact (contains bytecode and ABI)
      const artifactPath = path.join(workDir, 'out', 'Contract.sol', 'Contract.json');
      
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        
        // Return compilation results with bytecode and ABI
        res.json({
          success: true,
          message: 'Compilation successful',
          output: stdout,
          bytecode: artifact.bytecode,
          abi: artifact.abi
        });
      } else {
        res.json({
          success: false,
          error: 'Compilation failed: Artifact file not found'
        });
      }
    } catch (readError) {
      res.json({
        success: false,
        error: `Error reading compilation output: ${readError.message}`
      });
    }
  });
});

// Endpoint to run tests
app.post('/api/test', (req, res) => {
  const { code, testCode, compiledBytecode } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  // Create a unique ID for this request
  const id = Date.now().toString();
  const workDir = path.join(tempDir, id);
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(path.join(workDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(workDir, 'test'), { recursive: true });
  
  // Write the contract code
  fs.writeFileSync(path.join(workDir, 'src', 'Contract.sol'), code);
  
  // Write the test code or use a default test
  const defaultTest = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Contract.sol";

contract ContractTest is Test {
    function testExample() public {
        assertTrue(true);
    }
}`;
  
  fs.writeFileSync(
    path.join(workDir, 'test', 'Contract.t.sol'), 
    testCode || defaultTest
  );
  
  // If compiledBytecode is provided, write it to a file for the test container to use
  if (compiledBytecode) {
    fs.writeFileSync(
      path.join(workDir, 'bytecode.json'),
      JSON.stringify({ bytecode: compiledBytecode })
    );
  }
  
  // Run the testing container
  exec(`docker run --rm -v ${workDir}:/app tester-image`, (error, stdout, stderr) => {
    if (error && !stdout.includes('[PASS]')) {
      return res.json({
        success: false,
        error: stderr || error.message
      });
    }
    
    // Parse test results
    const testResults = parseTestResults(stdout);
    
    // Return test results
    res.json({
      success: true,
      results: testResults
    });
  });
});

// Function to parse test results
function parseTestResults(output) {
  // Simple parsing logic
  const lines = output.split('\n');
  const results = [];
  
  let currentSuite = {
    name: 'Test Suite',
    tests: []
  };
  results.push(currentSuite);
  
  for (const line of lines) {
    if (line.includes('[PASS]')) {
      const testName = line.split('[PASS]')[1].trim();
      currentSuite.tests.push({
        name: testName,
        status: 'success'
      });
    } else if (line.includes('[FAIL]')) {
      const testName = line.split('[FAIL]')[1].trim();
      currentSuite.tests.push({
        name: testName,
        status: 'failure'
      });
    }
  }
  
  return results;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Solidity service running on port ${PORT}`);
}); 