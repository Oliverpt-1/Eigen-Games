import React, { useState } from 'react';
import Editor, { loader } from "@monaco-editor/react";
import { FileText, Package, Upload } from 'lucide-react';

// Define custom theme
const defineCustomTheme = (monaco: any) => {
  monaco.editor.defineTheme('uniguardTheme', {
    base: 'vs', // Use 'vs' as base for light theme
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ec4899', fontStyle: 'bold' }, // Pink
      { token: 'type', foreground: 'ec4899' }, // Pink
      { token: 'function', foreground: '3b82f6' }, // Blue
      { token: 'string', foreground: '3b82f6' }, // Blue
      { token: 'number', foreground: 'ec4899' }, // Pink
      { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' } // Gray
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#111827',
      'editor.lineHighlightBackground': '#f3f4f6',
      'editorCursor.foreground': '#111827',
      'editor.selectionBackground': '#e5e7eb',
      'editor.inactiveSelectionBackground': '#f3f4f6'
    }
  });
};

const defaultHookCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {BaseHook} from "@uniswap/v4-core/contracts/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/contracts/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/contracts/types/PoolKey.sol";

contract Hook is BaseHook {
    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    function getHooksCalls() public pure override returns (Hooks.Calls memory) {
        return Hooks.Calls({
            beforeInitialize: false,
            afterInitialize: false,
            beforeModifyPosition: false,
            afterModifyPosition: false,
            beforeSwap: false,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false
        });
    }
}`;

interface SolidityEditorProps {
  onCodeChange: (code: string) => void;
}

export function SolidityEditor({ onCodeChange }: SolidityEditorProps) {
  const [code, setCode] = useState(defaultHookCode);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [newDependency, setNewDependency] = useState('');

  const handleEditorDidMount = (editor: any, monaco: any) => {
    defineCustomTheme(monaco);
    monaco.editor.setTheme('uniguardTheme');
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onCodeChange(newCode);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCode(content);
      onCodeChange(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".sol"
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-pink-200 rounded-xl cursor-pointer hover:bg-pink-50 transition-colors"
            >
              <Upload size={18} className="text-pink-500" />
              <span className="text-gray-700">Upload Contract</span>
            </label>
          </div>
          <button
            onClick={() => setShowDependencyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-pink-200 rounded-xl hover:bg-pink-50 transition-colors"
          >
            <Package size={18} className="text-pink-500" />
            <span className="text-gray-700">Manage Dependencies</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-gray-400" />
          <span className="text-sm text-gray-500">Hook.sol</span>
        </div>
      </div>

      <div className="h-[400px] border border-pink-200 rounded-xl overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="sol"
          theme="vs"
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            suggest: {
              showClasses: true,
              showFunctions: true,
              showVariables: true,
              showConstants: true,
              showEvents: true,
            },
          }}
        />
      </div>

      {showDependencyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">Manage Dependencies</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDependency}
                  onChange={(e) => setNewDependency(e.target.value)}
                  placeholder="e.g., @openzeppelin/contracts"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button className="px-4 py-2 bg-pink-500 text-white rounded-lg">
                  Add
                </button>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Current Dependencies</h4>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span>@uniswap/v4-core</span>
                    <span className="text-sm text-gray-500">^1.0.0</span>
                  </li>
                  <li className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span>@uniswap/v4-periphery</span>
                    <span className="text-sm text-gray-500">^1.0.0</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDependencyModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg mr-2"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDependencyModal(false)}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}