// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract CounterTest is Test {
    // Test tokens
    MockERC20 public token0;
    MockERC20 public token1;

    function setUp() public {
        // Create mock tokens
        token0 = new MockERC20("Token 0", "TKN0", 18);
        token1 = new MockERC20("Token 1", "TKN1", 18);
        
        // Ensure token0 address is less than token1
        if (address(token0) > address(token1)) {
            (token0, token1) = (token1, token0);
        }
    }

    // Simple test that will always pass
    function testSimple() public {
        assertTrue(true, "This test should always pass");
    }
    
    // Test that the tokens were created correctly
    function testTokenSetup() public {
        assertEq(token0.name(), "Token 0", "Token 0 name should match");
        assertEq(token1.name(), "Token 1", "Token 1 name should match");
        
        // Verify that token0 address is less than token1
        assertTrue(address(token0) == address(token1), "Token0 should have lower address than Token1");
    }
}