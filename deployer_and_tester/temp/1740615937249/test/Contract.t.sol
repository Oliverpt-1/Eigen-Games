// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "v4-core/src/interfaces/IPoolManager.sol";
import "v4-core/src/types/PoolKey.sol";
import "v4-core/src/types/PoolId.sol";
import "v4-core/src/types/BalanceDelta.sol";
import "v4-core/src/types/BeforeSwapDelta.sol";
import "v4-periphery/src/utils/BaseHook.sol";
import "../src/Counter.sol";

contract CounterHookTest is Test {
    Counter counter;
    IPoolManager poolManager;
    PoolKey poolKey;

    function setUp() public {
        poolManager = IPoolManager(address(new MockPoolManager())); // Mocked pool manager
        counter = new Counter(poolManager);
        poolKey = PoolKey({token0: address(1), token1: address(2), fee: 500});
    }

    function testBeforeSwapIncrementsCount() public {
        PoolId poolId = poolKey.toId();
        assertEq(counter.beforeSwapCount(poolId), 0);
        counter._beforeSwap(address(this), poolKey, IPoolManager.SwapParams(0, 0, false, false), "");
        assertEq(counter.beforeSwapCount(poolId), 1);
    }

    function testAfterSwapIncrementsCount() public {
        PoolId poolId = poolKey.toId();
        assertEq(counter.afterSwapCount(poolId), 0);
        counter._afterSwap(address(this), poolKey, IPoolManager.SwapParams(0, 0, false, false), BalanceDelta(0, 0), "");
        assertEq(counter.afterSwapCount(poolId), 1);
    }

    function testBeforeAddLiquidityIncrementsCount() public {
        PoolId poolId = poolKey.toId();
        assertEq(counter.beforeAddLiquidityCount(poolId), 0);
        counter._beforeAddLiquidity(address(this), poolKey, IPoolManager.ModifyLiquidityParams(0, 0, 0, 0), "");
        assertEq(counter.beforeAddLiquidityCount(poolId), 1);
    }

    function testBeforeRemoveLiquidityIncrementsCount() public {
        PoolId poolId = poolKey.toId();
        assertEq(counter.beforeRemoveLiquidityCount(poolId), 0);
        counter._beforeRemoveLiquidity(address(this), poolKey, IPoolManager.ModifyLiquidityParams(0, 0, 0, 0), "");
        assertEq(counter.beforeRemoveLiquidityCount(poolId), 1);
    }
}

contract MockPoolManager is IPoolManager {
    function execute(address, bytes calldata) external payable returns (bytes memory) {
        return "";
    }
}
