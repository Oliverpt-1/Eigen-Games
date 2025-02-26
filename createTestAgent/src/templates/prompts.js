/**
 * Generates a prompt for the LLM to create a Foundry test suite
 * @param {string} contractCode - The Solidity contract code
 * @param {string} contractName - The name of the contract
 * @param {string} testType - The type of test to generate (unit, integration, fuzz)
 * @returns {string} - The prompt for the LLM
 */
function getTestPrompt(contractCode, contractName, testType) {
  // Example of a good hook contract test
  const hookTestExample = `
// EXAMPLE OF A GOOD HOOK TEST (for reference)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {IPoolManager} from "@uniswap/v4-core/contracts/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/contracts/PoolManager.sol";
import {IHooks} from "@uniswap/v4-core/contracts/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/contracts/libraries/Hooks.sol";
import {TickMath} from "@uniswap/v4-core/contracts/libraries/TickMath.sol";
import {PoolKey} from "@uniswap/v4-core/contracts/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/contracts/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/contracts/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/contracts/types/BalanceDelta.sol";
import {ExampleHook} from "../src/ExampleHook.sol";
import {HookMiner} from "./utils/HookMiner.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ExampleHookTest is Test {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    // Constants for testing
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;
    uint24 constant POOL_FEE = 3000;
    
    // Test contracts
    PoolManager public poolManager;
    ExampleHook public hook;
    MockERC20 public token0;
    MockERC20 public token1;
    
    // Pool variables
    PoolKey public poolKey;
    PoolId public poolId;
    
    // Test accounts
    address public owner;
    address public user1;

    function setUp() public {
        // Create test accounts
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        
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
        // We need to find an address that has the beforeSwap and afterSwap flags
        (address hookAddress, bytes32 salt) = HookMiner.find(
            address(this),
            uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG),
            type(ExampleHook).creationCode,
            abi.encode(address(poolManager))
        );
        
        // Deploy the hook at the mined address
        hook = new ExampleHook{salt: salt}(poolManager);
        
        // Create the pool key
        poolKey = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: POOL_FEE,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
        
        // Initialize the pool
        poolManager.initialize(poolKey, SQRT_PRICE_1_1, "");
    }

    function testHookInitialization() public {
        // Check that the hook has the correct pool manager
        assertEq(address(hook.poolManager()), address(poolManager));
        
        // Check that the hook has the correct hooks enabled
        Hooks.Calls memory calls = hook.getHooksCalls();
        assertTrue(calls.beforeSwap);
        assertTrue(calls.afterSwap);
        assertFalse(calls.beforeInitialize);
    }

    function testBeforeSwap() public {
        // Create a swap params struct
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: 1 ether,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_RATIO + 1
        });
        
        // Call the beforeSwap hook directly (should revert because it's not called by the pool manager)
        vm.expectRevert(ExampleHook.NotPoolManager.selector);
        hook.beforeSwap(user1, poolKey, params);
    }
}`;

  const basePrompt = `
I need you to create a comprehensive Foundry test suite for the following Solidity contract:

\`\`\`solidity
${contractCode}
\`\`\`

Contract Name: ${contractName}
Test Type: ${testType}

Please follow these guidelines:
1. Create a test file named "${contractName}.t.sol" that follows Foundry testing conventions
2. Include proper imports for Foundry testing libraries
3. Create a test contract that inherits from Test
4. Implement setUp() function with proper initialization
5. Write comprehensive test functions that cover all contract functionality
6. Include tests for edge cases and potential failure modes
7. Use appropriate Foundry assertions and testing utilities
8. Add clear comments explaining the purpose of each test
9. Implement proper test organization and structure

Please provide ONLY the complete Solidity test file without any additional explanations.
`;

  // Add specific instructions based on test type
  let specificInstructions = '';
  
  switch (testType.toLowerCase()) {
    case 'unit':
      specificInstructions = `
Additional instructions for unit tests:
- Test each function in isolation
- Mock dependencies when necessary
- Test both success and failure paths
- Verify state changes after function calls
- Test access control mechanisms
`;
      break;
    
    case 'integration':
      specificInstructions = `
Additional instructions for integration tests:
- Test interactions between multiple contracts
- Test the full workflow of complex operations
- Verify correct state transitions across contract boundaries
- Test realistic scenarios that involve multiple function calls
`;
      break;
    
    case 'fuzz':
      specificInstructions = `
Additional instructions for fuzz tests:
- Use Foundry's fuzzing capabilities (vm.assume, bound, etc.)
- Define appropriate bounds for input parameters
- Test with a wide range of inputs
- Focus on finding edge cases and vulnerabilities
- Include invariant tests where appropriate
`;
      break;
      
    default:
      // Default to unit test instructions
      specificInstructions = `
Additional instructions for unit tests:
- Test each function in isolation
- Mock dependencies when necessary
- Test both success and failure paths
- Verify state changes after function calls
- Test access control mechanisms
`;
  }
  
  return basePrompt + specificInstructions;
}

module.exports = {
  getTestPrompt
}; 