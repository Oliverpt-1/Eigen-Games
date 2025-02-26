// Consolidated server for compiling, testing, and deploying Solidity contracts
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const deployContract = require('./deploy');

// Create Express app
const app = express();

// Add middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(bodyParser.json());

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Simple endpoint to check if server is running
app.get('/', (req, res) => {
  res.json({ message: 'Solidity compiler, tester, and deployer service is running' });
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
  console.log('📝 Received test request');
  const { code, testCode } = req.body;
  
  if (!code) {
    console.error('❌ No code provided');
    return res.status(400).json({ error: 'No code provided' });
  }
  
  // Create a unique ID for this request
  const id = Date.now().toString();
  const workDir = path.join(tempDir, id);
  console.log(`📁 Creating work directory: ${workDir}`);
  
  try {
    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(path.join(workDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(workDir, 'test'), { recursive: true });
    
    // Write the contract code
    const contractPath = path.join(workDir, 'src', 'Contract.sol');
    console.log(`📝 Writing contract to: ${contractPath}`);
    fs.writeFileSync(contractPath, code);
    console.log('Contract code:');
    console.log(code);
    
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
    
    const testPath = path.join(workDir, 'test', 'Contract.t.sol');
    console.log(`📝 Writing test to: ${testPath}`);
    fs.writeFileSync(testPath, testCode || defaultTest);
    console.log('Test code:');
    console.log(testCode || defaultTest);

    // Copy foundry.toml to work directory
    const foundryConfig = path.join(__dirname, 'foundry.toml');
    const workDirConfig = path.join(workDir, 'foundry.toml');
    console.log(`📝 Copying foundry.toml from ${foundryConfig} to ${workDirConfig}`);
    fs.copyFileSync(foundryConfig, workDirConfig);
    
    // Run the testing container
    const dockerCmd = `docker run --rm -v ${workDir}:/app tester-image`;
    console.log(`🐳 Running Docker command: ${dockerCmd}`);
    
    exec(dockerCmd, (error, stdout, stderr) => {
      console.log('🔍 Docker execution completed');
      console.log('stdout:', stdout);
      console.log('stderr:', stderr);
      
      // Always try to parse test results, even if there's an error
      // because Forge might output test failures but still exit with non-zero
      const testResults = parseTestResults(stdout);
      
      // If we have test results, consider it a success even if there are failing tests
      if (testResults.length > 0 && testResults[0].tests.length > 0) {
        res.json({
          success: true,
          results: testResults,
          details: {
            stdout,
            stderr,
            workDir,
            contractPath,
            testPath
          }
        });
      } else if (error) {
        // Only consider it an error if we couldn't parse any test results
        console.error('❌ Test execution failed:', error);
        console.error('Error details:', stderr);
        return res.json({
          success: false,
          error: stderr || error.message,
          details: {
            stdout,
            stderr,
            workDir,
            contractPath,
            testPath
          }
        });
      }
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        workDir,
        error: error.stack
      }
    });
  }
});

// Function to parse test results
function parseTestResults(output) {
  console.log('🔍 Parsing test output:', output);
  const lines = output.split('\n');
  const results = [];
  
  let currentSuite = {
    name: 'Test Suite',
    tests: []
  };
  results.push(currentSuite);
  
  let currentTest = null;
  let collectingTrace = false;
  let trace = [];
  
  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Detect test running
    if (line.includes('Running')) {
      console.log('📋 Found test suite:', line);
      currentSuite.name = line.trim();
    }
    // Detect test result
    else if (line.includes('[PASS]') || line.includes('[FAIL]')) {
      if (collectingTrace && currentTest) {
        currentTest.trace = trace.join('\n');
        trace = [];
        collectingTrace = false;
      }

      const status = line.includes('[PASS]') ? 'success' : 'failure';
      const testName = line.split(status === 'success' ? '[PASS]' : '[FAIL]')[1].trim();
      
      // Extract gas information if present
      const gasMatch = line.match(/\((\d+) gas\)/);
      const gasUsed = gasMatch ? parseInt(gasMatch[1]) : undefined;
      
      currentTest = {
        name: testName,
        status: status,
        gasUsed: gasUsed
      };
      
      console.log(`${status === 'success' ? '✅' : '❌'} Test: ${testName} ${gasUsed ? `(${gasUsed} gas)` : ''}`);
      currentSuite.tests.push(currentTest);
      collectingTrace = true;
    }
    // Collect error messages and traces
    else if (collectingTrace && currentTest && line.trim()) {
      trace.push(line.trim());
    }
    // Detect overall test summary
    else if (line.includes('Test result:')) {
      console.log('📊 Test summary:', line);
      currentSuite.summary = line.trim();
    }
  }
  
  // Add final trace if we were collecting one
  if (collectingTrace && currentTest && trace.length > 0) {
    currentTest.trace = trace.join('\n');
  }
  
  return results;
}

// Endpoint to deploy a contract
app.post('/api/deploy', async (req, res) => {
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Consolidated server running on port ${PORT}`);
}); 