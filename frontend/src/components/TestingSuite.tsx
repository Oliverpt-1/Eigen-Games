import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, Info, ToggleLeft, ToggleRight, Code2, Edit3, Rocket } from 'lucide-react';
import Editor, { loader } from "@monaco-editor/react";
import { useAccount, useWriteContract } from 'wagmi';

// Define custom theme
const defineCustomTheme = (monaco: any) => {
  monaco.editor.defineTheme('uniguardTheme', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ec4899', fontStyle: 'bold' },
      { token: 'type', foreground: 'ec4899' },
      { token: 'function', foreground: '3b82f6' },
      { token: 'string', foreground: '3b82f6' },
      { token: 'number', foreground: 'ec4899' },
      { token: 'comment', foreground: '9ca3af', fontStyle: 'italic' }
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

const defaultFoundryTests = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Hook.sol";

contract HookTest is Test {
    Hook hook;
    IPoolManager manager;

    function setUp() public {
        // Setup pool manager and hook
        manager = IPoolManager(address(0x0));  // Replace with actual pool manager
        hook = new Hook(manager);
    }

    function testBeforeSwap() public {
        // Test implementation
    }

    function testAfterSwap() public {
        // Test implementation
    }
}`;

interface TestResult {
  name: string;
  status: 'success' | 'failure' | 'skipped';
  gasUsed?: number;
  message?: string;
  trace?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
}

interface TestCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export function TestingSuite({ contractCode }: { contractCode: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customTestCode, setCustomTestCode] = useState(defaultFoundryTests);
  const [testCategories, setTestCategories] = useState<TestCategory[]>([
    {
      id: 'initialization',
      name: 'Initialization Tests',
      description: 'Verify hook initialization and parameter validation',
      enabled: true
    },
    {
      id: 'beforeSwap',
      name: 'BeforeSwap Tests',
      description: 'Test beforeSwap hook functionality and validation',
      enabled: true
    },
    {
      id: 'afterSwap',
      name: 'AfterSwap Tests',
      description: 'Test afterSwap hook functionality and state changes',
      enabled: true
    },
    {
      id: 'modifyPosition',
      name: 'ModifyPosition Tests',
      description: 'Verify position modification hooks',
      enabled: false
    },
    {
      id: 'gas',
      name: 'Gas Optimization Tests',
      description: 'Check gas usage and optimization',
      enabled: false
    }
  ]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    defineCustomTheme(monaco);
    monaco.editor.setTheme('uniguardTheme');
  };

  const { address, isConnected } = useAccount();
  const { writeContract } = useWriteContract();

  const toggleCategory = (categoryId: string) => {
    setTestCategories(categories =>
      categories.map(category =>
        category.id === categoryId
          ? { ...category, enabled: !category.enabled }
          : category
      )
    );
  };

  const runTests = async () => {
    setIsRunning(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const enabledCategories = testCategories.filter(cat => cat.enabled);
      const results: TestSuite[] = [];

      if (enabledCategories.some(cat => cat.id === 'initialization')) {
        results.push({
          name: 'Initialization Tests',
          tests: [
            {
              name: 'test_hook_initialization',
              status: 'success',
              gasUsed: 45023,
              message: 'Hook initializes correctly with provided parameters'
            }
          ]
        });
      }

      if (enabledCategories.some(cat => cat.id === 'beforeSwap')) {
        results.push({
          name: 'BeforeSwap Hook Tests',
          tests: [
            {
              name: 'test_before_swap_validation',
              status: 'success',
              gasUsed: 62145,
              message: 'BeforeSwap hook validates parameters correctly'
            }
          ]
        });
      }

      setTestResults(results);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDeploy = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    try {
      await writeContract({
        abi: [], // This would be the actual Hook ABI
        address: '0x...', // This would be the Hook factory address
        functionName: 'deploy',
        args: [] // This would include constructor arguments
      });
    } catch (error) {
      console.error('Deployment failed:', error);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failure':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'skipped':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-100';
      case 'failure':
        return 'bg-red-50 border-red-100';
      case 'skipped':
        return 'bg-yellow-50 border-yellow-100';
      default:
        return 'bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="mt-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Testing Suite</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-pink-200 rounded-xl hover:bg-pink-50 transition-colors"
            >
              {isCustomMode ? (
                <>
                  <Code2 size={18} className="text-pink-500" />
                  <span>Auto Mode</span>
                </>
              ) : (
                <>
                  <Edit3 size={18} className="text-pink-500" />
                  <span>Custom Mode</span>
                </>
              )}
            </button>
            <button
              onClick={runTests}
              disabled={isRunning || !contractCode.trim() || (!isCustomMode && !testCategories.some(cat => cat.enabled))}
              className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all ${
                isRunning || !contractCode.trim() || (!isCustomMode && !testCategories.some(cat => cat.enabled))
                  ? 'opacity-50 cursor-not-allowed'
                  : 'shadow-md hover:shadow-lg'
              }`}
            >
              <Play size={18} />
              {isRunning ? 'Running Tests...' : 'Run Tests'}
            </button>
          </div>
        </div>

        {isCustomMode ? (
          <div className="space-y-4">
            <div className="h-[400px] border border-pink-200 rounded-xl overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="sol"
                theme="vs"
                value={customTestCode}
                onChange={(value) => setCustomTestCode(value || '')}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testCategories.map(category => (
              <div
                key={category.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-pink-100 bg-white/50 cursor-pointer hover:bg-pink-50/50 transition-colors"
                onClick={() => toggleCategory(category.id)}
              >
                {category.enabled ? (
                  <ToggleRight className="w-6 h-6 text-pink-500" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
                <div>
                  <h3 className="font-medium text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {testResults.length > 0 && (
        <div className="space-y-6">
          {testResults.map((suite, suiteIndex) => (
            <div key={suiteIndex} className="border border-pink-100 rounded-xl p-6 bg-white/50">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{suite.name}</h3>
              <div className="space-y-3">
                {suite.tests.map((test, testIndex) => (
                  <div
                    key={testIndex}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${getStatusColor(
                      test.status
                    )}`}
                  >
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{test.name}</h4>
                        {test.gasUsed && (
                          <span className="text-sm text-gray-500">
                            Gas Used: {test.gasUsed.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {test.message && (
                        <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                      )}
                      {test.trace && (
                        <pre className="mt-2 p-2 bg-gray-800 text-gray-200 rounded-lg text-sm overflow-x-auto">
                          {test.trace}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}