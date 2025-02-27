import React, { useState } from 'react';
import { useAccount } from 'wagmi';

interface DeployContractProps {
  contractCode: string;
}

export function DeployContract({ contractCode }: DeployContractProps) {
  const { isConnected } = useAccount();
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = async () => {
    if (!contractCode.trim()) {
      alert('Please enter contract code before deploying');
      return;
    }

    if (!isConnected) {
      alert('Please connect your wallet before deploying');
      return;
    }

    setIsDeploying(true);
    
    try {
      // For now, just simulate a deployment with a timeout
      // In a real implementation, you would call your deployment service or use ethers/viem
      console.log('Deploying contract:', contractCode);
      
      // Simulate API call to deployment service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Contract deployed successfully! (This is a simulation)');
    } catch (error) {
      console.error('Deployment failed:', error);
      alert('Deployment failed. See console for details.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <button
      onClick={handleDeploy}
      disabled={isDeploying || !isConnected}
      className={`flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl transition-all shadow-md 
        ${isDeploying || !isConnected 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:from-pink-600 hover:to-purple-600 hover:shadow-lg'}`}
    >
      {isDeploying ? 'Deploying...' : 'Deploy Contract'}
    </button>
  );
} 