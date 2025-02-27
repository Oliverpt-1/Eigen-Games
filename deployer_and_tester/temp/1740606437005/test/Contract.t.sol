// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { BasicHook } from "../src/hooks/BasicHook.sol";
import { IPoolManager } from "v4-core/src/interfaces/IPoolManager.sol";
import { PoolKey } from "v4-core/src/types/PoolKey.sol";
import { IPoolManager } from "v4-core/src/interfaces/IPoolManager.sol";
import { Hooks } from "v4-core/src/libraries/Hooks.sol";

contract BasicHookTest is Test {
    BasicHook hook;
    IPoolManager mockPoolManager; // Mocked Pool Manager

    event SwapHookTriggered(address indexed sender, int256 amount0, int256 amount1);

    function setUp() public {
        // Deploy a mock Pool Manager
        mockPoolManager = IPoolManager(address(this));

        // Deploy the hook contract
        hook = new BasicHook(mockPoolManager);
    }

    function testHookDeployment() public {
        assertEq(address(hook).code.length > 0, true, "Hook should be deployed");
    }

    function testBeforeSwapHook() public {
        address sender = address(this);
        int256 amountSpecified = 1000; // Simulate swap amount
        bool zeroForOne = true; // Simulating swap direction

        // Define mock pool key
        PoolKey memory key = PoolKey({
            currency0: address(0x123),
            currency1: address(0x456),
            fee: 3000,
            tickSpacing: 60,
            hooks: address(hook)
        });

        // Define swap params
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
            amountSpecified: amountSpecified,
            sqrtPriceLimitX96: 0,
            zeroForOne: zeroForOne
        });

        // Expect event log
        vm.expectEmit(true, true, false, false);
        emit SwapHookTriggered(sender, amountSpecified, zeroForOne ? 0 : amountSpecified);

        // Call beforeSwap
        (bytes4 selector, , ) = hook.beforeSwap(sender, key, params, "");

        // Validate returned selector
        assertEq(selector, BaseHook.beforeSwap.selector, "Incorrect selector returned");

        // Log swap details
        console.log("Swap Hook Triggered:");
        console.log("Sender:", sender);
        console.log("Amount:", amountSpecified);
    }
}
