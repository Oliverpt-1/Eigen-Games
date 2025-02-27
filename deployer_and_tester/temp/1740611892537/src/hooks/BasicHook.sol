// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { BaseHook } from "v4-periphery/src/base/hooks/BaseHook.sol";
import { Hooks } from "v4-core/src/libraries/Hooks.sol";
import { IPoolManager } from "v4-core/src/interfaces/IPoolManager.sol";
import { PoolKey } from "v4-core/src/types/PoolKey.sol";
import { PoolId, PoolIdLibrary } from "v4-core/src/types/PoolId.sol";
import { BalanceDelta } from "v4-core/src/types/BalanceDelta.sol";
import { BeforeSwapDelta, BeforeSwapDeltaLibrary } from "v4-core/src/types/BeforeSwapDelta.sol";

contract BasicHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    // Event for logging swap details
    event SwapHookTriggered(
        address indexed sender,
        int256 amount0,
        int256 amount1
    );

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    // Define which hooks are implemented
    function getHookPermissions()
        public
        pure
        override
        returns (Hooks.Permissions memory)
    {
        return
            Hooks.Permissions({
                beforeInitialize: false,
                afterInitialize: false,
                beforeAddLiquidity: false,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: true,
                afterSwap: false,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            });
    }

    // Implement the beforeSwap hook
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata data
    )
        external
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        // Emit event for logging swap details
        emit SwapHookTriggered(
            sender,
            params.amountSpecified,
            params.zeroForOne ? 0 : params.amountSpecified
        );

        // Return standard Uniswap hook signature
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.empty(), 0);
    }
}
