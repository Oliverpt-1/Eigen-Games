import React, { useState } from 'react';
import Editor from "@monaco-editor/react";
import { Shield, AlertTriangle, CheckCircle, Upload } from 'lucide-react';

interface SecurityCheck {
  severity: 'high' | 'medium' | 'low' | 'safe';
  message: string;
  line?: number;
}

function SafeCheck() {
  const [code, setCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<SecurityCheck[]>([]);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setResults([
        {
          severity: 'high',
          message: 'Potential reentrancy vulnerability detected',
          line: 42
        },
        {
          severity: 'medium',
          message: 'Unchecked return value from external call',
          line: 67
        },
        {
          severity: 'low',
          message: 'Consider using SafeMath for arithmetic operations',
          line: 89
        },
        {
          severity: 'safe',
          message: 'Access control implementation looks secure'
        }
      ]);
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const getSeverityColor = (severity: SecurityCheck['severity']) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-orange-600 bg-orange-50';
      case 'low':
        return 'text-yellow-600 bg-yellow-50';
      case 'safe':
        return 'text-green-600 bg-green-50';
    }
  };

  const getSeverityIcon = (severity: SecurityCheck['severity']) => {
    switch (severity) {
      case 'high':
      case 'medium':
        return <AlertTriangle className="w-5 h-5" />;
      case 'low':
        return <Shield className="w-5 h-5" />;
      case 'safe':
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent mb-2">
            SafeCheck Analysis
          </h1>
          <p className="text-gray-600">
            Analyze your Solidity code for potential security vulnerabilities
          </p>
        </div>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
            <input
              type="file"
              accept=".sol"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            onClick={handleAnalyze}
            disabled={!code || isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Code'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
          <div className="p-4 border-b border-gray-200/60">
            <h2 className="text-lg font-semibold text-gray-900">Source Code</h2>
          </div>
          <div className="h-[600px]">
            <Editor
              height="100%"
              defaultLanguage="sol"
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
          <div className="p-4 border-b border-gray-200/60">
            <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
          </div>
          <div className="h-[600px] overflow-y-auto p-4">
            {isAnalyzing ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg flex items-start space-x-3 ${getSeverityColor(result.severity)}`}
                  >
                    {getSeverityIcon(result.severity)}
                    <div>
                      <div className="font-medium capitalize">{result.severity} Severity</div>
                      <p className="text-sm mt-1">{result.message}</p>
                      {result.line && (
                        <p className="text-sm mt-1">Line: {result.line}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Shield className="w-12 h-12 mb-4" />
                <p>No analysis results yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SafeCheck;