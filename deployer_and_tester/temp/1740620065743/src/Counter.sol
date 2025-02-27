
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IHooks } from "v4-core/src/interfaces/IHooks.sol";
import { IPoolManager } from "v4-core/src/interfaces/IPoolManager.sol";
import { PoolKey } from "v4-core/src/types/PoolKey.sol";
import { PoolId } from "v4-core/src/types/PoolId.sol";
import { BalanceDelta } from "v4-core/src/types/BalanceDelta.sol";
import { BaseHook } from "v4-periphery/src/utils/BaseHook.sol";

contract Counter is BaseHook {
    mapping(PoolId => uint256) public beforeSwapCount;
    mapping(PoolId => uint256) public afterSwapCount;
    mapping(PoolId => uint256) public beforeAddLiquidityCount;
    mapping(PoolId => uint256) public afterAddLiquidityCount;
    mapping(PoolId => uint256) public beforeRemoveLiquidityCount;
    mapping(PoolId => uint256) public afterRemoveLiquidityCount;

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    function getHooksCalls() public pure override returns (Hooks.Calls memory) {
        return Hooks.Calls({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: true,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: true,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false
        });
    }

    function beforeSwap(address, PoolKey calldata key, IPoolManager.SwapParams calldata, bytes calldata)
        external
        override
        returns (bytes4)
    {
        beforeSwapCount[key.toId()]++;
        return BaseHook.beforeSwap.selector;
    }

    function afterSwap(address, PoolKey calldata key, IPoolManager.SwapParams calldata, BalanceDelta, bytes calldata)
        external
        override
        returns (bytes4)
    {
        afterSwapCount[key.toId()]++;
        return BaseHook.afterSwap.selector;
    }

    function beforeAddLiquidity(address, PoolKey calldata key, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external
        override
        returns (bytes4)
    {
        beforeAddLiquidityCount[key.toId()]++;
        return BaseHook.beforeAddLiquidity.selector;
    }

    function afterAddLiquidity(address, PoolKey calldata key, IPoolManager.ModifyLiquidityParams calldata, BalanceDelta, bytes calldata)
        external
        override
        returns (bytes4)
    {
        afterAddLiquidityCount[key.toId()]++;
        return BaseHook.afterAddLiquidity.selector;
    }

    function beforeRemoveLiquidity(address, PoolKey calldata key, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external
        override
        returns (bytes4)
    {
        beforeRemoveLiquidityCount[key.toId()]++;
        return BaseHook.beforeRemoveLiquidity.selector;
    }

    function afterRemoveLiquidity(address, PoolKey calldata key, IPoolManager.ModifyLiquidityParams calldata, BalanceDelta, bytes calldata)
        external
        override
        returns (bytes4)
    {
        afterRemoveLiquidityCount[key.toId()]++;
        return BaseHook.afterRemoveLiquidity.selector;
    }
}