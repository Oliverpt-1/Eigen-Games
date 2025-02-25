import React, { useState, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import { Copy, Download, Settings2, Rocket } from 'lucide-react';

interface HookPermissions {
  beforeSwap: boolean;
  afterSwap: boolean;
  beforeInitialize: boolean;
  afterInitialize: boolean;
  beforeModifyPosition: boolean;
  afterModifyPosition: boolean;
}

function Generator() {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [selectedHookType, setSelectedHookType] = useState<'swap' | 'liquidity'>('swap');
  const [permissions, setPermissions] = useState<HookPermissions>({
    beforeSwap: false,
    afterSwap: false,
    beforeInitialize: false,
    afterInitialize: false,
    beforeModifyPosition: false,
    afterModifyPosition: false
  });

  // Initialize customCode with generated code when component mounts
  useEffect(() => {
    if (!customCode) {
      setCustomCode(generateCode());
    }
  }, []);

  // Update customCode when permissions or hook type changes
  useEffect(() => {
    if (!isCustomMode) {
      setCustomCode(generateCode());
    }
  }, [permissions, selectedHookType]);

  const handlePermissionChange = (permission: keyof HookPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };

  const generateCode = () => {
    const hookName = selectedHookType === 'swap' ? 'SwapHook' : 'LiquidityHook';
    const baseImports = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BaseHook} from "@uniswap/v4-core/contracts/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/contracts/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/contracts/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/contracts/types/PoolId.sol";
import {Hooks} from "@uniswap/v4-core/contracts/libraries/Hooks.sol";`;

    const swapImports = selectedHookType === 'swap' ? `
import {Currency} from "@uniswap/v4-core/contracts/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/contracts/types/BalanceDelta.sol";` : '';

    const liquidityImports = selectedHookType === 'liquidity' ? `
import {Position} from "@uniswap/v4-core/contracts/libraries/Position.sol";` : '';

    const hookFlags = Object.entries(permissions)
      .filter(([_, enabled]) => enabled)
      .map(([hook]) => `Hooks.${hook.toUpperCase()}`)
      .join(' | ');

    return `${baseImports}${swapImports}${liquidityImports}

contract ${hookName} is BaseHook {
    using PoolIdLibrary for PoolKey;

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    function getHooksCalls() public pure override returns (Hooks.Calls memory) {
        return Hooks.Calls({
            beforeInitialize: ${permissions.beforeInitialize},
            afterInitialize: ${permissions.afterInitialize},
            beforeModifyPosition: ${permissions.beforeModifyPosition},
            afterModifyPosition: ${permissions.afterModifyPosition},
            beforeSwap: ${permissions.beforeSwap},
            afterSwap: ${permissions.afterSwap},
            noOp: false
        });
    }

    ${permissions.beforeInitialize ? `
    function beforeInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96)
        external
        override
        returns (bytes4)
    {
        // Implementation
        return BaseHook.beforeInitialize.selector;
    }` : ''}

    ${permissions.afterInitialize ? `
    function afterInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96, int24 tick)
        external
        override
        returns (bytes4)
    {
        // Implementation
        return BaseHook.afterInitialize.selector;
    }` : ''}

    ${permissions.beforeModifyPosition ? `
    function beforeModifyPosition(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyPositionParams calldata params
    ) external override returns (bytes4) {
        // Implementation
        return BaseHook.beforeModifyPosition.selector;
    }` : ''}

    ${permissions.afterModifyPosition ? `
    function afterModifyPosition(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyPositionParams calldata params,
        BalanceDelta delta
    ) external override returns (bytes4) {
        // Implementation
        return BaseHook.afterModifyPosition.selector;
    }` : ''}

    ${permissions.beforeSwap ? `
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params
    ) external override returns (bytes4) {
        // Implementation
        return BaseHook.beforeSwap.selector;
    }` : ''}

    ${permissions.afterSwap ? `
    function afterSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta
    ) external override returns (bytes4) {
        // Implementation
        return BaseHook.afterSwap.selector;
    }` : ''}
}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Panel - Permissions */}
      <div className={`lg:col-span-4 transition-all duration-300 ${isCustomMode ? 'opacity-30 scale-98 pointer-events-none' : 'opacity-100 scale-100'}`}>
        {/* Hook Types */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 mb-6">
          <div className="bg-gradient-to-r from-purple-600/10 via-purple-400/5 to-purple-600/10 py-1 px-3 rounded-lg inline-block mb-4">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
              Hook Types
            </h2>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedHookType('swap')}
              className={`w-full px-4 py-2 rounded-lg text-left transition-colors ${
                selectedHookType === 'swap'
                  ? 'bg-purple-100/50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100/50'
              }`}
            >
              Swap Hooks
            </button>
            <button
              onClick={() => setSelectedHookType('liquidity')}
              className={`w-full px-4 py-2 rounded-lg text-left transition-colors ${
                selectedHookType === 'liquidity'
                  ? 'bg-purple-100/50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100/50'
              }`}
            >
              Liquidity Hooks
            </button>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6">
          <div className="bg-gradient-to-r from-purple-600/10 via-purple-400/5 to-purple-600/10 py-1 px-3 rounded-lg inline-block mb-4">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
              Permissions
            </h2>
          </div>
          <div className="space-y-3">
            {Object.entries(permissions).map(([key, value]) => (
              <label
                key={key}
                className="flex items-center space-x-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handlePermissionChange(key as keyof HookPermissions)}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-gray-700 group-hover:text-gray-900">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Code Preview */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200/60 overflow-hidden">
        <div className="border-b border-gray-200/60 p-4 flex justify-between items-center">
          <div className="bg-gradient-to-r from-purple-600/10 via-purple-400/5 to-purple-600/10 py-1 px-3 rounded-lg">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
              Generated Code
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsCustomMode(!isCustomMode)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isCustomMode
                  ? 'bg-purple-100/50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100/50'
              }`}
            >
              Custom Mode
            </button>
            <div className="flex space-x-2">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 rounded-lg transition-colors">
                <Copy className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 rounded-lg transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 rounded-lg transition-colors">
                <Settings2 className="w-5 h-5" />
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                <Rocket className="w-4 h-4" />
                <span>Deploy</span>
              </button>
            </div>
          </div>
        </div>
        <div className="h-[600px]">
          <Editor
            height="100%"
            defaultLanguage="sol"
            value={customCode}
            onChange={(value) => setCustomCode(value || '')}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
              readOnly: !isCustomMode,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default Generator;