```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IPoolManager} from "@uniswap/v4-core/contracts/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/contracts/PoolManager.sol";
import {IHooks} from "@uniswap/v4-core/contracts/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/contracts/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/contracts/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/contracts/types/Currency.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {HookMiner} from "./utils/HookMiner.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/contracts/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/contracts/types/BeforeSwapDelta.sol";
import {IPoolManager} from "@uniswap/v4-core/contracts/interfaces/IPoolManager.sol";

contract HooksTest is Test {
    using CurrencyLibrary for Currency;

    // Test contracts
    PoolManager public poolManager;
    MockERC20 public token0;
    MockERC20 public token1;
    PoolKey public poolKey;
    IHooks public hook;
    bytes32 public hookData;

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
            uint160(
                Hooks.BEFORE_INITIALIZE_FLAG |
                Hooks.AFTER_INITIALIZE_FLAG |
                Hooks.BEFORE_ADD_LIQUIDITY_FLAG |
                Hooks.AFTER_ADD_LIQUIDITY_FLAG |
                Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG |
                Hooks.AFTER_REMOVE_LIQUIDITY_FLAG |
                Hooks.BEFORE_SWAP_FLAG |
                Hooks.AFTER_SWAP_FLAG |
                Hooks.BEFORE_DONATE_FLAG |
                Hooks.AFTER_DONATE_FLAG |
                Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG |
                Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG |
                Hooks.AFTER_ADD_LIQUIDITY_RETURNS_DELTA_FLAG |
                Hooks.AFTER_REMOVE_LIQUIDITY_RETURNS_DELTA_FLAG
            ),
            type(MockHook).creationCode,
            abi.encode(address(poolManager))
        );
        
        // Deploy the hook at the mined address
        hook = IHooks(new MockHook{salt: salt}(poolManager));
        
        // Create the pool key
        poolKey = PoolKey({
            currency0: Currency.wrap(address(token0)),
            currency1: Currency.wrap(address(token1)),
            fee: 3000,
            tickSpacing: 60,
            hooks: hook,
            hookData: bytes32(0)
        });
        
        // Initialize the pool
        poolManager.initialize(poolKey, 79228162514264337593543950336, "");
    }

    function testValidateHookPermissions() public {
        Hooks.Permissions memory permissions = Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: true,
            beforeAddLiquidity: true,
            afterAddLiquidity: true,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: true,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: true,
            afterDonate: true,
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: true,
            afterAddLiquidityReturnDelta: true,
            afterRemoveLiquidityReturnDelta: true
        });

        Hooks.validateHookPermissions(hook, permissions);
    }

    function testValidateHookPermissionsFailure() public {
        Hooks.Permissions memory permissions = Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: true,
            afterAddLiquidity: true,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: true,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: true,
            afterDonate: true,
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: true,
            afterAddLiquidityReturnDelta: true,
            afterRemoveLiquidityReturnDelta: true
        });

        vm.expectRevert(Hooks.HookAddressNotValid.selector);
        Hooks.validateHookPermissions(hook, permissions);
    }

    function testIsValidHookAddress() public {
        assertTrue(Hooks.isValidHookAddress(hook, 3000));
    }

    function testIsValidHookAddressFailure() public {
        assertFalse(Hooks.isValidHookAddress(IHooks(address(0)), 3000));
    }

    function testCallHook() public {
        bytes memory data = abi.encodeCall(IHooks.beforeInitialize, (address(this), poolKey, 79228162514264337593543950336));
        bytes memory result = Hooks.callHook(hook, data);
        assertEq(result, "");
    }

    function testCallHookWithReturnDelta() public {
        bytes memory data = abi.encodeCall(IHooks.afterAddLiquidity, (address(this), poolKey, IPoolManager.ModifyLiquidityParams(100, 0, 0, 0, 0), BalanceDeltaLibrary.ZERO_DELTA, BalanceDeltaLibrary.ZERO_DELTA, ""));
        int256 delta = Hooks.callHookWithReturnDelta(hook, data, true);
        assertEq(delta, 0);
    }

    function testAfterModifyLiquidity() public {
        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams(100, 0, 0, 0, 0);
        (BalanceDelta callerDelta, BalanceDelta hookDelta) = Hooks.afterModifyLiquidity(hook, poolKey, params, BalanceDeltaLibrary.ZERO_DELTA, BalanceDeltaLibrary.ZERO_DELTA, "");
        assertEq(callerDelta.unwrap(), 0);
        assertEq(hookDelta.unwrap(), 0);
    }

    function testBeforeSwap() public {
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams(100, true, 0, 0);
        (int256 amountToSwap, BeforeSwapDelta hookReturn, uint24 lpFeeOverride) = Hooks.beforeSwap(hook, poolKey, params, "");
        assertEq(amountToSwap, 100);
        assertEq(hookReturn.unwrap(), 0);
        assertEq(lpFeeOverride, 0);
    }

    function testAfterSwap() public {
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams(100, true, 0, 0);
        BeforeSwapDelta beforeSwapHookReturn = BeforeSwapDeltaLibrary.ZERO_DELTA;
        (BalanceDelta swapDelta, BalanceDelta hookDelta) = Hooks.afterSwap(hook, poolKey, params, BalanceDeltaLibrary.ZERO_DELTA, "", beforeSwapHookReturn);
        assertEq(swapDelta.unwrap(), 0);
        assertEq(hookDelta.unwrap(), 0);
    }

    function testHasPermission() public {
        assertTrue(Hooks.hasPermission(hook, Hooks.BEFORE_INITIALIZE_FLAG));
        assertFalse(Hooks.hasPermission(hook, Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG << 1));
    }
}

contract MockHook is IHooks {
    IPoolManager public immutable poolManager;

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    function beforeInitialize(
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96
    ) external override returns (bytes4) {
        return IHooks.beforeInitialize.selector;
    }

    function afterInitialize(
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        int24 tick
    ) external override returns (bytes4) {
        return IHooks.afterInitialize.selector;
    }

    function beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4) {
        return IHooks.beforeAddLiquidity.selector;
    }

    function afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) external override returns (bytes4, int256) {
        return (IHooks.afterAddLiquidity.selector, 0);
    }

    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPool