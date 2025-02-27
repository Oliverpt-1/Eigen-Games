import React, { useState } from 'react';
import { Upload, AlertCircle, FileCode, Loader2, ShieldCheck, ShieldAlert, FileWarning } from 'lucide-react';
import { TestingSuite } from './components/TestingSuite';
import { ConnectWallet } from './components/ConnectWallet';
import { SolidityEditor } from './components/SolidityEditor';
import { AIAgent } from './components/AIAgent';
import { DeployContract } from './components/DeployContract';

interface AuditResult {
  severity: 'high' | 'medium' | 'low' | 'info';
  message: string;
  line?: number;
  description: string;
  recommendation?: string;
}

interface AuditReport {
  status: 'safe' | 'vulnerable' | 'malicious';
  summary: string;
  vulnerabilitiesCount: {
    high: number;
    medium: number;
    low: number;
  };
  results: AuditResult[];
}

function App() {
  const [code, setCode] = useState('');
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe': return <ShieldCheck className="w-8 h-8 text-green-500" />;
      case 'vulnerable': return <ShieldAlert className="w-8 h-8 text-yellow-500" />;
      case 'malicious': return <FileWarning className="w-8 h-8 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-green-50 text-green-700 border-green-200';
      case 'vulnerable': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'malicious': return 'bg-red-50 text-red-700 border-red-200';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <img 
              src="/image/jacked_unicorn.jpg" 
              alt="UniGuard Logo" 
              className="w-20 h-20 mr-4 rounded-full object-cover"
            />
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                UniGuard
              </h1>
              <p className="text-gray-600">
                AI-Powered Security Guardian for Uniswap V4 Hook Contracts
              </p>
            </div>
          </div>
          <ConnectWallet />
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-pink-100 p-8 mb-6">
          <div className="mb-6">
            <label 
              htmlFor="code" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Contract Code
            </label>
            <SolidityEditor onCodeChange={handleCodeChange} />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {report && (
            <div className="mt-8 space-y-6">
              <div className={`flex items-start gap-4 p-6 rounded-xl border ${getStatusColor(report.status)}`}>
                {getStatusIcon(report.status)}
                <div>
                  <h3 className="text-lg font-semibold capitalize mb-1">
                    {report.status} Contract
                  </h3>
                  <p className="text-gray-600">
                    {report.summary}
                  </p>
                  <div className="flex gap-4 mt-3">
                    <div className="px-3 py-1 bg-red-100/50 rounded-lg text-sm">
                      {report.vulnerabilitiesCount.high} High
                    </div>
                    <div className="px-3 py-1 bg-yellow-100/50 rounded-lg text-sm">
                      {report.vulnerabilitiesCount.medium} Medium
                    </div>
                    <div className="px-3 py-1 bg-blue-100/50 rounded-lg text-sm">
                      {report.vulnerabilitiesCount.low} Low
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Detailed Findings</h2>
                {report.results.map((result, index) => (
                  <div
                    key={index}
                    className="border border-pink-100 rounded-xl p-6 hover:shadow-md transition-shadow bg-white/50"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(result.severity)}`}>
                        {result.severity.toUpperCase()}
                      </span>
                      {result.line && (
                        <span className="text-sm text-gray-500">
                          Line {result.line}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      {result.message}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {result.description}
                    </p>
                    {result.recommendation && (
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <strong className="text-sm text-purple-700">Recommendation:</strong>
                        <p className="text-sm text-purple-600 mt-1">
                          {result.recommendation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <TestingSuite contractCode={code} />

          <AIAgent contractCode={code} />

          <div className="flex justify-end mt-8">
            <DeployContract contractCode={code} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;