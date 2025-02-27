import React, { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';

interface DeployContractProps {
  contractCode: string;
}

// Define a type for the solc compiler
declare global {
  interface Window {
    solc: any;
  }
}

export function DeployContract({ contractCode }: DeployContractProps) {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isDeploying, setIsDeploying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [solcLoaded, setSolcLoaded] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);

  // Load solc from CDN
  useEffect(() => {
    if (!window.solc) {
      const script = document.createElement('script');
      script.src = 'https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js';
      script.async = true;
      script.onload = () => {
        // Initialize solc
        const solcjs = document.createElement('script');
        solcjs.innerHTML = `
          window.solc = window.Module;
        `;
        document.body.appendChild(solcjs);
        setSolcLoaded(true);
      };
      document.body.appendChild(script);
    } else {
      setSolcLoaded(true);
    }
  }, []);

  const compileCode = async () => {
    // Call the backend API to compile the contract
    return fetch('http://localhost:3000/api/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: contractCode
      })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            throw new Error(errorData.error || 'Failed to compile contract');
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('Compilation result:', data);
        if (data.success) {
          return data.deploymentInfo;
        } else {
          throw new Error(data.error || 'Compilation failed');
        }
      });
  }
  
  const handleDeploy = async () => {
    if (!contractCode.trim()) {
      alert('Please enter contract code before deploying');
      return;
    }

    if (!isConnected || !walletClient) {
      alert('Please connect your wallet before deploying');
      return;
    }

    if (!solcLoaded) {
      alert('Solidity compiler is still loading. Please wait.');
      return;
    }

    setIsDeploying(true);
    setCompileError(null);
    
    try {
      // Call the compile function and get deployment info
      const deploymentInfo = await compileCode();
      console.log('Compilation successful! Deployment info:', deploymentInfo);
      
      // Display a success message instead of deploying
      alert('Compilation successful! Check console for deployment info.');
      
    } catch (error) {
      console.error('Compilation failed:', error);
      setCompileError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <>
      {!solcLoaded && (
        <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
          Loading Solidity compiler...
        </div>
      )}

      {compileError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 whitespace-pre-wrap">
          <strong>Compilation Error:</strong>
          <div className="mt-2 text-sm font-mono">{compileError}</div>
        </div>
      )}

      <button
        onClick={handleDeploy}
        disabled={isDeploying || !isConnected || !solcLoaded}
        className={`flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl transition-all shadow-md 
          ${isDeploying || !isConnected || !solcLoaded
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:from-pink-600 hover:to-purple-600 hover:shadow-lg'}`}
      >
        {isDeploying ? 'Deploying...' : 'Deploy Contract'}
      </button>

      {txHash && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p>Transaction sent! Hash:</p>
          <a 
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            {txHash}
          </a>
        </div>
      )}

      {contractAddress && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <p>Contract deployed at:</p>
          <a 
            href={`https://sepolia.etherscan.io/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-500 underline"
          >
            {contractAddress}
          </a>
        </div>
      )}
    </>
  );
} 