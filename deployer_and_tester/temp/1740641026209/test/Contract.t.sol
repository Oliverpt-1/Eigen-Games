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

    function testGetHookPermissions() public {
        Hooks.Permissions memory permissions = counter.getHookPermissions();
        assertEq(permissions.beforeInitialize, false);
        assertEq(permissions.afterInitialize, false);
        assertEq(permissions.beforeAddLiquidity, false);
        assertEq(permissions.afterAddLiquidity, false);
        assertEq(permissions.beforeRemoveLiquidity, false);
        assertEq(permissions.afterRemoveLiquidity, false);
        assertEq(permissions.beforeSwap, true);
        assertEq(permissions.afterSwap, true);
        assertEq(permissions.beforeDonate, false);
        assertEq(permissions.afterDonate, false);
        assertEq(permissions.beforeSwapReturnDelta, false);
        assertEq(permissions.afterSwapReturnDelta, false);
        assertEq(permissions.afterAddLiquidityReturnDelta, false);
        assertEq(permissions.afterRemoveLiquidityReturnDelta, false);
    }

    function testBeforeSwap() public {
        IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: 1000,
            sqrtPriceLimitX96: 0
        });

        bytes memory hookData = bytes("");

        // Call the swap function to trigger _beforeSwap
        poolManager.swap(poolKey, swapParams, hookData);

        // Verify that the beforeSwapCount is incremented
        PoolId poolId = poolKey.toId();
        assertEq(counter.beforeSwapCount(poolId), 1);
    }

    function testAfterSwap() public {
        IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: 1000,
            sqrtPriceLimitX96: 0
        });

        bytes memory hookData = bytes("");

        // Call the swap function to trigger _afterSwap
        poolManager.swap(poolKey, swapParams, hookData);

        // Verify that the afterSwapCount is incremented
        PoolId poolId = poolKey.toId();
        assertEq(counter.afterSwapCount(poolId), 1);
    }
}