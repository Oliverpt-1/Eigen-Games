import React, { useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { deployContract, getBytecode } from '@wagmi/core';
import { config } from '../config/wagmi';

interface DeployContractProps {
  contractCode: string;
}

export function DeployContract({ contractCode }: DeployContractProps) {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isDeploying, setIsDeploying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  // ✅ Call the backend API to compile the contract
  const compileCode = async () => {
    try {
      console.log("Making API request to compile contract...");
      const response = await fetch("http://localhost:3000/api/compile-for-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: contractCode }),
      });
      
      console.log("API response received:", response.status, response.statusText);
      
      const data = await response.json();
      console.log("API response data:", data);
      
      if (!response.ok || !data.success) {
        console.error("API error:", data.error || "Compilation failed");
        throw new Error(data.error || "Compilation failed");
      }

      console.log("API response parsed successfully:", data.abi, data.bytecode, data.contractName);
      
      return {
        abi: data.abi,
        bytecode: data.bytecode,
        contractName: data.contractName,
      };
    } catch (error) {
      console.error("Error in compileCode:", error);
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  };

  // ✅ Deploy the compiled contract to Sepolia using wagmi's deployContract
  const handleDeploy = async () => {
    if (!contractCode.trim()) return alert("Please enter contract code before deploying");
    if (!isConnected || !address) return alert("Please connect your wallet before deploying");
    if (!publicClient) return alert("Public client not available");

    setIsDeploying(true);
    setCompileError(null);

    try {
      // ✅ Compile contract using backend API
      const deploymentInfo = await compileCode();
      console.log("✅ Compilation successful:", deploymentInfo);

      // Ensure bytecode is properly formatted with 0x prefix
      console.log("Bytecode type:", typeof deploymentInfo.bytecode);
      console.log("Bytecode sample:", deploymentInfo.bytecode.substring(0, 50) + "...");
      
      const bytecode = deploymentInfo.bytecode.startsWith('0x') 
        ? deploymentInfo.bytecode as `0x${string}`
        : `0x${deploymentInfo.bytecode}` as `0x${string}`;
      
      console.log("Formatted bytecode sample:", bytecode.substring(0, 50) + "...");

      // ✅ Add constructor parameter (IPoolManager address on Sepolia)
      const poolManagerAddress = "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543";

      console.log("🚀 Deploying contract with IPoolManager:", poolManagerAddress);

      // ✅ Use wagmi's deployContract action with the shared config
      const hash = await deployContract(config, {
        abi: deploymentInfo.abi,
        args: [poolManagerAddress],
        bytecode: bytecode,
        account: address,
        gas: 30_000_000n
      });
      
      setTxHash(hash);
      console.log("📨 Transaction sent:", hash);

      // ✅ Wait for transaction confirmation
      console.log("⏳ Waiting for transaction to be mined...");
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash,
          timeout: 60_000 // Add timeout parameter (60 seconds)
        });

        if (receipt.contractAddress) {
          setContractAddress(receipt.contractAddress);
          console.log("✅ Contract deployed at:", receipt.contractAddress);
        } else {
          console.error("❌ Deployment failed, no contract address returned.");
        }
      } else {
        console.log("⚠️ Public client not available, cannot wait for transaction receipt");
        console.log("📝 Check transaction on Etherscan: https://sepolia.etherscan.io/tx/" + hash);
      }
    } catch (error) {
      console.error("❌ Deployment failed:", error);
      setCompileError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <>
      {compileError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 whitespace-pre-wrap">
          <strong>Compilation Error:</strong>
          <div className="mt-2 text-sm font-mono">{compileError}</div>
        </div>
      )}

      <button
        onClick={handleDeploy}
        disabled={isDeploying || !isConnected}
        className={`flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl transition-all shadow-md 
          ${isDeploying || !isConnected ? "opacity-50 cursor-not-allowed" : "hover:from-pink-600 hover:to-purple-600 hover:shadow-lg"}`}
      >
        {isDeploying ? "Deploying..." : "Deploy Contract"}
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
          <div className="mt-2">
            <a
              href={`https://sepolia.etherscan.io/address/${contractAddress}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 text-sm underline"
            >
              View Contract on Etherscan
            </a>
          </div>
        </div>
      )}
    </>
  );
}
