// Consolidated server for compiling and testing Solidity contracts
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
  res.json({ message: 'Solidity compiler and tester service is running' });
});

// Endpoint to compile and test Solidity code
app.post('/api/compile-and-test', async (req, res) => {
  console.log('📝 Received compile and test request');
  const { code, testCode } = req.body;
  
  if (!code) {
    console.error('❌ No contract code provided');
    return res.status(400).json({ error: 'No contract code provided' });
  }
  
  if (!testCode) {
    console.error('❌ No test code provided');
    return res.status(400).json({ error: 'No test code provided' });
  }
  
  // Create a unique ID for this request
  const id = Date.now().toString();
  const workDir = path.join(tempDir, id);
  console.log(`📁 Creating work directory: ${workDir}`);
  
  try {
    // Create necessary directories
    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(path.join(workDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(workDir, 'test'), { recursive: true });
    fs.mkdirSync(path.join(workDir, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(workDir, 'test', 'utils'), { recursive: true });
    
    // Write the contract code
    const contractPath = path.join(workDir, 'src', 'Contract.sol');
    console.log(`📝 Writing contract to: ${contractPath}`);
    fs.writeFileSync(contractPath, code);
    
    // Also write the contract as Counter.sol for compatibility with tests
    const counterPath = path.join(workDir, 'src', 'Counter.sol');
    console.log(`📝 Writing contract to Counter.sol for compatibility: ${counterPath}`);
    fs.writeFileSync(counterPath, code);
    
    // Create empty utility files that might be imported
    const easyPosmPath = path.join(workDir, 'test', 'utils', 'EasyPosm.sol');
    const fixturesPath = path.join(workDir, 'test', 'utils', 'Fixtures.sol');
    
    console.log(`📝 Creating placeholder utility files`);
    fs.writeFileSync(easyPosmPath, `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EasyPosm {
    // Placeholder for EasyPosm
}
`);
    
    fs.writeFileSync(fixturesPath, `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Fixtures {
    // Placeholder for Fixtures
}
`);
    
    // Write the test code
    const testPath = path.join(workDir, 'test', 'Contract.t.sol');
    console.log(`📝 Writing test to: ${testPath}`);
    fs.writeFileSync(testPath, testCode);
    
    // Create a foundry.toml file with proper remappings
    const workDirConfig = path.join(workDir, 'foundry.toml');
    console.log(`📝 Creating foundry.toml in ${workDirConfig}`);
    
    const foundryConfig = `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
remappings = [
    "forge-std/=lib/forge-std/src/",
    "v4-core/=lib/v4-core/",
    "v4-periphery/=lib/v4-periphery/",
    "@uniswap/v4-core/=lib/v4-core/",
    "@uniswap/v4-periphery/=lib/v4-periphery/",
    "permit2/=lib/permit2/"
]
solc = "0.8.24"
`;
    fs.writeFileSync(workDirConfig, foundryConfig);
    
    // Run foundryup to ensure Foundry is installed and up to date
    console.log('🔧 Running foundryup');
    try {
      await execPromise('curl -L https://foundry.paradigm.xyz | bash');
      // Skip the bashrc part since it might not exist on all systems
      await execPromise('foundryup');
    } catch (foundryError) {
      console.log('⚠️ Foundryup may have failed, but continuing anyway:', foundryError.message);
      // Continue anyway as foundry might already be installed
    }
    
    // Clone Uniswap V4 repositories
    console.log('📦 Cloning Uniswap V4 repositories');
    try {
      // Clone v4-core
      await execPromise(`cd ${path.join(workDir, 'lib')} && git clone https://github.com/Uniswap/v4-core.git`);
      console.log('✅ Cloned v4-core repository');
      
      // Clone v4-periphery if needed
      await execPromise(`cd ${path.join(workDir, 'lib')} && git clone https://github.com/Uniswap/v4-periphery.git`);
      console.log('✅ Cloned v4-periphery repository');
      
      // Clone permit2 if needed
      await execPromise(`cd ${path.join(workDir, 'lib')} && git clone https://github.com/Uniswap/permit2.git`);
      console.log('✅ Cloned permit2 repository');
    } catch (cloneError) {
      console.error('❌ Error cloning repositories:', cloneError.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to clone repositories: ' + cloneError.message 
      });
    }
    
    // Run forge install to get dependencies
    console.log('📚 Installing Foundry dependencies');
    try {
      await execPromise(`cd ${workDir} && forge install --no-commit foundry-rs/forge-std`);
    } catch (installError) {
      console.log('⚠️ Forge install warning:', installError.message);
      // Continue anyway as dependencies might already be installed
    }
    
    // Run the tests using forge
    console.log(`🧪 Running tests in: ${workDir}`);
    const { stdout, stderr } = await execPromise(`cd ${workDir} && forge test -vv`);
    
    console.log('🔍 Test execution completed');
    console.log('stdout:', stdout);
    
    if (stderr) {
      console.log('stderr:', stderr);
    }
    
    // Parse test results
    const testResults = parseTestResults(stdout);
    
    // Return results to the frontend
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

// Placeholder endpoint for compile and deploy
app.post('/api/compile-and-deploy', (req, res) => {
  console.log('📝 Received compile and deploy request');
  const { code } = req.body;
  
  if (!code) {
    console.error('❌ No contract code provided');
    return res.status(400).json({ error: 'No contract code provided' });
  }
  
  // TODO: Implement compile and deploy functionality
  
  res.json({
    success: false,
    message: 'Compile and deploy functionality not yet implemented'
  });
});

// Function to parse test results
function parseTestResults(output) {
  console.log('🔍 Parsing test output');
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Solidity compiler and tester server running on port ${PORT}`);
}); 