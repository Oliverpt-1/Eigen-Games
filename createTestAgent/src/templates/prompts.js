/**
 * Generates a prompt for the LLM to create a Foundry test suite
 * @param {string} contractCode - The Solidity contract code
 * @param {string} contractName - The name of the contract
 * @param {string} testType - The type of test to generate (unit, integration, fuzz)
 * @returns {string} - The prompt for the LLM
 */
function getTestPrompt(contractCode, contractName, testType) {
  // Example of a good hook contract test - shortened for efficiency
  const hookTestExample = `
// EXAMPLE OF A GOOD HOOK TEST (for reference)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IPoolManager} from "@uniswap/v4-core/contracts/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/contracts/PoolManager.sol";
import {IHooks} from "@uniswap/v4-core/contracts/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/contracts/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/contracts/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/contracts/types/Currency.sol";
import {Counter} from "../src/Counter.sol";
import {HookMiner} from "./utils/HookMiner.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract CounterTest is Test {
    using CurrencyLibrary for Currency;

    // Test contracts
    PoolManager public poolManager;
    Counter public counter;
    MockERC20 public token0;
    MockERC20 public token1;
    PoolKey public poolKey;
    
    function setUp() public {
        // Deploy the pool manager
        poolManager = new PoolManager(500000);
        
        // Deploy tokens
        token0 = new MockERC20("Token 0", "TKN0", 18);
        token1 = new MockERC20("Token 1", "TKN1", 18);
        
        // Ensure token0 address < token1 address
        if (address(token0) > address(token1)) {
            (token0, token1) = (token1, token0);
        }
        
        // Deploy the hook with the correct address for the hook flags
        (address hookAddress, bytes32 salt) = HookMiner.find(
            address(this),
            uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG),
            type(Counter).creationCode,
            abi.encode(address(poolManager))
        );
        
        // Deploy the hook at the mined address
        counter = new Counter{salt: salt}(poolManager);
        
        // Create the pool key
        poolKey = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(counter)),
            hookData: bytes32(0)
        });
        
        // Initialize the pool
        poolManager.initialize(poolKey, 79228162514264337593543950336, "");
    }

    function testHookInitialization() public {
        // Check that the hook has the correct pool manager
        assertEq(address(counter.poolManager()), address(poolManager));
    }
}`;

  // HookMiner utility example - shortened for efficiency
  const hookMinerExample = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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

  // Perform detailed contract analysis
  // Analyze the contract code to determine what kind of contract it is
  const isUniswapV4Hook = contractCode.includes("IHooks") || 
                          contractCode.includes("beforeSwap") || 
                          contractCode.includes("afterSwap") ||
                          contractCode.includes("PoolManager");
  
  const isERC20 = contractCode.includes("ERC20") || 
                 (contractCode.includes("balanceOf") && 
                  contractCode.includes("transfer") && 
                  contractCode.includes("totalSupply"));
  
  const isERC721 = contractCode.includes("ERC721") || 
                  (contractCode.includes("ownerOf") && 
                   contractCode.includes("transferFrom") && 
                   contractCode.includes("tokenURI"));

  const isERC1155 = contractCode.includes("ERC1155") || 
                   (contractCode.includes("balanceOf") && 
                    contractCode.includes("safeTransferFrom") && 
                    contractCode.includes("balanceOfBatch"));

  // Determine if the contract has access control
  const hasAccessControl = contractCode.includes("Ownable") || 
                          contractCode.includes("onlyOwner") || 
                          contractCode.includes("AccessControl") ||
                          contractCode.includes("hasRole");

  // Determine if the contract handles funds
  const handlesFunds = contractCode.includes("payable") || 
                      contractCode.includes("receive()") || 
                      contractCode.includes("fallback()") ||
                      contractCode.includes("msg.value");
                      
  // Extract function names for more targeted testing - improved regex to capture full function signatures
  const functionRegex = /function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s+(?:external|public|internal|private|pure|view|payable|virtual|override|returns\s*\([^)]*\))*)*\s*\{/g;
  const functions = [];
  let functionMatch;
  
  // Reset regex lastIndex
  functionRegex.lastIndex = 0;
  
  while ((functionMatch = functionRegex.exec(contractCode)) !== null) {
    const functionName = functionMatch[1];
    const params = functionMatch[2].trim();
    
    // Skip constructor
    if (functionName !== 'constructor') {
      // Extract function signature
      const signature = `${functionName}(${params})`;
      functions.push({
        name: functionName,
        signature: signature,
        fullMatch: functionMatch[0]
      });
    }
  }
  
  // Extract events for event testing
  const eventRegex = /event\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
  const events = [];
  let eventMatch;
  
  // Reset regex lastIndex
  eventRegex.lastIndex = 0;
  
  while ((eventMatch = eventRegex.exec(contractCode)) !== null) {
    const eventName = eventMatch[1];
    const params = eventMatch[2].trim();
    events.push({
      name: eventName,
      signature: `${eventName}(${params})`,
      fullMatch: eventMatch[0]
    });
  }
  
  // Extract state variables for state testing - improved regex
  const stateVarRegex = /(uint|int|address|bool|string|bytes|mapping)[0-9]*(?:\[\])?\s+(public|private|internal)\s+([a-zA-Z0-9_]+)(?:\s*=\s*[^;]+)?;/g;
  const stateVars = [];
  let stateVarMatch;
  
  // Reset regex lastIndex
  stateVarRegex.lastIndex = 0;
  
  while ((stateVarMatch = stateVarRegex.exec(contractCode)) !== null) {
    stateVars.push({
      type: stateVarMatch[1],
      visibility: stateVarMatch[2],
      name: stateVarMatch[3],
      fullMatch: stateVarMatch[0]
    });
  }
  
  // Identify hook callbacks for Uniswap V4 hooks with improved detection
  const hookCallbacks = [];
  if (isUniswapV4Hook) {
    // More precise hook callback detection
    const hookCallbackRegex = /function\s+(before|after)(Initialize|Swap|Donate|ModifyPosition)/g;
    let hookMatch;
    
    // Reset regex lastIndex
    hookCallbackRegex.lastIndex = 0;
    
    while ((hookMatch = hookCallbackRegex.exec(contractCode)) !== null) {
      const callbackName = hookMatch[1] + hookMatch[2];
      hookCallbacks.push(callbackName);
    }
  }

  // Base prompt with dynamic instructions based on contract analysis
  let basePrompt = `
You are an expert Solidity test engineer. Your task is to create a STRICTLY DYNAMIC test suite for the following Solidity contract:

\`\`\`solidity
${contractCode}
\`\`\`

Contract Name: ${contractName}
Test Type: ${testType}

Based on my analysis, this contract appears to be ${isUniswapV4Hook ? "a Uniswap V4 Hook" : 
                                                  isERC20 ? "an ERC20 token" : 
                                                  isERC721 ? "an ERC721 NFT" : 
                                                  isERC1155 ? "an ERC1155 multi-token" : 
                                                  "a custom smart contract"}.
${hasAccessControl ? "It implements access control mechanisms." : ""}
${handlesFunds ? "It handles ETH/funds." : ""}

CRITICAL INSTRUCTION: You MUST ONLY generate tests for functions that ACTUALLY EXIST in the contract code above. DO NOT test functions that are not explicitly defined in the contract.

I've performed a detailed analysis of the contract and found these specific elements that should be tested:

FUNCTIONS (${functions.length}):
${functions.map((f, i) => `${i+1}. ${f.name}: ${f.signature}`).join('\n')}

EVENTS (${events.length}):
${events.map((e, i) => `${i+1}. ${e.name}: ${e.signature}`).join('\n')}

STATE VARIABLES (${stateVars.length}):
${stateVars.map((v, i) => `${i+1}. ${v.name}: ${v.type} ${v.visibility}`).join('\n')}

${isUniswapV4Hook ? `HOOK CALLBACKS (${hookCallbacks.length}):\n${hookCallbacks.map((c, i) => `${i+1}. ${c}`).join('\n')}` : ''}

Please follow these guidelines:
1. Create a test file named "${contractName}.t.sol" that follows Foundry testing conventions
2. Include only necessary imports for Foundry testing libraries and dependencies
3. Create a test contract that inherits from Test
4. Implement setUp() function with proper initialization of all dependencies
5. Write test functions ONLY for the functions, events, and state variables listed above
6. DO NOT create tests for functions that are not in the list above
7. Use appropriate Foundry assertions and testing utilities
8. Add clear comments explaining the purpose of each test
9. Ensure compatibility with Solidity version ${contractCode.includes("^0.8.24") ? "0.8.24" : 
                                              contractCode.includes("^0.8.19") ? "0.8.19" : 
                                              contractCode.includes("^0.8") ? "0.8.x" : "used in the contract"}
`;

  // Add specific instructions based on contract type
  if (isUniswapV4Hook) {
    basePrompt += `
For Uniswap V4 Hook testing:
1. Use the latest Uniswap V4 interfaces (v4-core and v4-periphery)
2. Create a proper PoolKey struct with all required fields
3. Use HookMiner to deploy the hook at an address with the correct flags
4. Test ONLY these specific hook callbacks that are implemented in the contract: ${hookCallbacks.join(', ')}
5. DO NOT test hook callbacks that are not in the list above
6. Verify that the hook interacts correctly with the PoolManager

Here's a simplified example of a Uniswap V4 Hook test structure:
${hookTestExample}

You'll need to create utility files like HookMiner.sol:
${hookMinerExample}
`;
  } else if (isERC20) {
    basePrompt += `
For ERC20 token testing:
1. Test ONLY the ERC20 functions that are explicitly implemented in this specific contract (see function list above)
2. DO NOT test standard ERC20 functions that are not explicitly overridden in this contract
3. Focus on the unique aspects of this token implementation
`;
  } else if (isERC721 || isERC1155) {
    basePrompt += `
For NFT contract testing:
1. Test ONLY the ${isERC721 ? "ERC721" : "ERC1155"} functions that are explicitly implemented in this specific contract (see function list above)
2. DO NOT test standard functions that are not explicitly overridden in this contract
3. Focus on the unique aspects of this NFT implementation
`;
  }

  // Add specific instructions based on test type
  switch (testType.toLowerCase()) {
    case 'unit':
      basePrompt += `
For unit tests:
1. Test each function in isolation
2. Mock dependencies when necessary
3. Test both success and failure paths
4. Verify state changes after function calls
`;
      break;
    
    case 'integration':
      basePrompt += `
For integration tests:
1. Test interactions between multiple contracts
2. Test the full workflow of complex operations
3. Verify correct state transitions across contract boundaries
4. Test realistic scenarios that involve multiple function calls
`;
      break;
    
    case 'fuzz':
      basePrompt += `
For fuzz tests:
1. Use Foundry's fuzzing capabilities (vm.assume, bound, etc.)
2. Define appropriate bounds for input parameters
3. Test with a wide range of inputs
4. Focus on finding edge cases and vulnerabilities
`;
      break;
      
    default:
      // Default to unit test instructions
      basePrompt += `
For unit tests:
1. Test each function in isolation
2. Mock dependencies when necessary
3. Test both success and failure paths
4. Verify state changes after function calls
`;
  }
  
  basePrompt += `
FINAL CRITICAL INSTRUCTIONS:
1. Create a STRICTLY DYNAMIC test suite that tests ONLY the functions, events, and state variables listed above
2. DO NOT include tests for functionality that is not explicitly defined in the contract
3. Each test should have a clear purpose related to a specific function or feature
4. The test file should be concise and focused on the actual contract functionality
5. If you're unsure if a function exists in the contract, DO NOT include a test for it

Please provide ONLY the complete Solidity test file without any additional explanations.
`;

  return basePrompt;
}

module.exports = {
  getTestPrompt
};