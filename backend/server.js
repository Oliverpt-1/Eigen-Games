const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Create Express app
const app = express();

// Add middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Create a temp directory for files
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Simple endpoint to check if server is running
app.get('/', (req, res) => {
  res.json({ message: 'Solidity compiler backend is running' });
});

// Endpoint to compile Solidity code
app.post('/api/compile', (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  // Create a unique ID for this request
  const id = Date.now().toString();
  const workDir = path.join(tempDir, id);
  fs.mkdirSync(workDir);
  fs.mkdirSync(path.join(workDir, 'src'));
  
  // Write the code to a file
  fs.writeFileSync(path.join(workDir, 'src', 'Contract.sol'), code);
  
  // For now, just return success (we'll integrate with Docker later)
  res.json({
    success: true,
    message: 'Code received and saved',
    id: id
  });
});

// Endpoint to run tests
app.post('/api/test', (req, res) => {
  const { code, testCode } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  // Create a unique ID for this request
  const id = Date.now().toString();
  const workDir = path.join(tempDir, id);
  fs.mkdirSync(workDir);
  fs.mkdirSync(path.join(workDir, 'src'));
  fs.mkdirSync(path.join(workDir, 'test'));
  
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
  
  // For now, just return mock test results
  res.json({
    success: true,
    message: 'Code and tests received and saved',
    id: id,
    results: [
      {
        name: 'Test Suite',
        tests: [
          {
            name: 'testExample',
            status: 'success',
            gasUsed: 45023,
            message: 'Test passed successfully'
          }
        ]
      }
    ]
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});