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
    
    // Write the contract code
    const contractPath = path.join(workDir, 'src', 'Contract.sol');
    console.log(`📝 Writing contract to: ${contractPath}`);
    fs.writeFileSync(contractPath, code);
    
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
    "@uniswap/v4-core/contracts/=lib/v4-core/src/",
    "@uniswap/v4-periphery/=lib/v4-periphery/",
    "@uniswap/v4-periphery/contracts/=lib/v4-periphery/src/",
    "permit2/=lib/permit2/"
]
# Allow auto-detection of solidity version from source files
ignore_error = "InvalidSolcVersion"
`;
    fs.writeFileSync(workDirConfig, foundryConfig);
    
    // Ensure Foundry is installed
    console.log('🔧 Checking Foundry installation');
    try {
      await execPromise('forge --version');
    } catch (foundryError) {
      console.log('⚠️ Foundry not found, installing...');
      try {
        await execPromise('curl -L https://foundry.paradigm.xyz | bash');
        await execPromise('foundryup');
      } catch (installError) {
        console.error('❌ Failed to install Foundry:', installError.message);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to install Foundry: ' + installError.message 
        });
      }
    }
    
    // Clone necessary repositories
    console.log('📦 Setting up dependencies');
    try {
      // Clone v4-core
      await execPromise(`cd ${path.join(workDir, 'lib')} && git clone --depth 1 https://github.com/Uniswap/v4-core.git`);
      console.log('✅ Cloned v4-core repository');
      
      // Fix Solidity version in v4-core files
      const v4CoreDir = path.join(workDir, 'lib', 'v4-core');
      console.log('🔧 Fixing Solidity version in v4-core files');
      fixSolidityVersionRecursively(v4CoreDir);
      
      // Clone v4-periphery (with depth=1 for faster cloning)
      await execPromise(`cd ${path.join(workDir, 'lib')} && git clone --depth 1 https://github.com/Uniswap/v4-periphery.git`);
      console.log('✅ Cloned v4-periphery repository');
      
      // Clone permit2 (with depth=1 for faster cloning)
      await execPromise(`cd ${path.join(workDir, 'lib')} && git clone --depth 1 https://github.com/Uniswap/permit2.git`);
      console.log('✅ Cloned permit2 repository');
      
      // Create test utility files
      console.log('📝 Creating test utility files');
      createTestUtilityFiles(workDir);
      
    } catch (cloneError) {
      console.error('❌ Error setting up dependencies:', cloneError.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to set up dependencies: ' + cloneError.message 
      });
    }
    
    // Install Foundry dependencies
    console.log('📚 Installing Foundry dependencies');
    try {
      await execPromise(`cd ${workDir} && forge install --no-commit foundry-rs/forge-std`);
    } catch (installError) {
      console.log('⚠️ Forge install warning:', installError.message);
      // Continue anyway as dependencies might already be installed
    }
    
    // Run the tests
    console.log(`🧪 Running tests in: ${workDir}`);
    const { stdout, stderr } = await execPromise(`cd ${workDir} && forge test -vv`);
    
    console.log('🔍 Test execution completed');
    
    if (stderr) {
      console.log('stderr:', stderr);
    }
      
    // Parse and return test results
    const testResults = parseTestResults(stdout);
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
        workDir: workDir || null,
        error: error.stack
      }
    });
  }
});

// Function to create test utility files
function createTestUtilityFiles(workDir) {
  // Create test/utils directory
  const testUtilsDir = path.join(workDir, 'test', 'utils');
  fs.mkdirSync(testUtilsDir, { recursive: true });
  
  // Create HookMiner.sol file
  const hookMinerPath = path.join(testUtilsDir, 'HookMiner.sol');
  const hookMinerContent = `// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19 <0.9.0;

library HookMiner {
    // Find an address with the specified flags
    function find(
        address deployer,
        uint160 flags,
        bytes memory creationCode,
        bytes memory constructorArgs
    ) internal pure returns (address hookAddress, bytes32 salt) {
        // Concatenate the creation code and constructor arguments
        bytes memory bytecode = abi.encodePacked(creationCode, constructorArgs);
        
        // Calculate the address prefix we're looking for
        bytes memory addressPrefix = abi.encodePacked(
            bytes1(0xFF),
            deployer,
            bytes32(0)
        );
        
        // Iterate until we find a salt that gives us the desired flags
        uint256 nonce = 0;
        while (true) {
            salt = bytes32(nonce);
            bytes32 addressBytes = keccak256(abi.encodePacked(addressPrefix, salt, keccak256(bytecode)));
            
            // Check if the last 20 bytes of the address have the desired flags
            if (uint160(uint256(addressBytes)) & flags == flags) {
                hookAddress = address(uint160(uint256(addressBytes)));
                break;
            }
            
            nonce++;
        }
    }
}`;
  fs.writeFileSync(hookMinerPath, hookMinerContent);
  console.log('✅ Created HookMiner.sol');

  // Create MockERC20.sol file
  const mockERC20Dir = path.join(testUtilsDir, 'mocks');
  fs.mkdirSync(mockERC20Dir, { recursive: true });
  const mockERC20Path = path.join(mockERC20Dir, 'MockERC20.sol');
  const mockERC20Content = `// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19 <0.9.0;

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}`;
  fs.writeFileSync(mockERC20Path, mockERC20Content);
  console.log('✅ Created MockERC20.sol');
}

// Function to recursively fix Solidity version in all .sol files
function fixSolidityVersionRecursively(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recursively process subdirectories
      fixSolidityVersionRecursively(fullPath);
    } else if (file.endsWith('.sol')) {
      // Fix Solidity version in .sol files
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        const originalContent = content;
        
        // Replace exact version requirements with more flexible ones
        content = content.replace(/pragma solidity =0\.8\.2[0-9];/g, 'pragma solidity >=0.8.19 <0.9.0;');
        content = content.replace(/pragma solidity 0\.8\.2[0-9];/g, 'pragma solidity >=0.8.19 <0.9.0;');
        content = content.replace(/pragma solidity =0\.8\.26;/g, 'pragma solidity >=0.8.19 <0.9.0;');
        content = content.replace(/pragma solidity 0\.8\.26;/g, 'pragma solidity >=0.8.19 <0.9.0;');
        
        // Only write if content was changed
        if (content !== originalContent) {
          fs.writeFileSync(fullPath, content);
          console.log(`✅ Fixed Solidity version in: ${fullPath}`);
        }
      } catch (error) {
        console.error(`❌ Error fixing Solidity version in ${fullPath}:`, error.message);
      }
    }
  }
}

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