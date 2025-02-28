import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, RefreshCw } from 'lucide-react';

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Clear localStorage on component mount to prevent stale connections
  useEffect(() => {
    // Clear wagmi-related localStorage items to prevent stale connections
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('wagmi') || key.includes('wallet')) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  // Handle connection with explicit connector selection
  const handleConnect = async () => {
    try {
      // Find the MetaMask connector if available
      const metaMaskConnector = connectors.find(c => 
        c.name.toLowerCase().includes('metamask') || c.id.toLowerCase().includes('metamask')
      );
      
      // Use MetaMask if available, otherwise use the first connector
      const connector = metaMaskConnector || connectors[0];
      
      await connect({ connector });
    } catch (error) {
      console.error("Connection error:", error);
      alert("Failed to connect wallet. Please try again or refresh the page.");
    }
  };

  // Force reconnection to handle stale connections
  const handleForceReconnect = async () => {
    try {
      setIsReconnecting(true);
      
      // First disconnect
      await disconnect();
      
      // Clear localStorage again
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('wagmi') || key.includes('wallet')) {
          localStorage.removeItem(key);
        }
      });
      
      // Wait a moment before reconnecting
      setTimeout(() => {
        handleConnect().finally(() => {
          setIsReconnecting(false);
        });
      }, 500);
    } catch (error) {
      console.error("Reconnection error:", error);
      setIsReconnecting(false);
      alert("Failed to reconnect. Please refresh the page and try again.");
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleForceReconnect}
          disabled={isReconnecting}
          className="p-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all disabled:opacity-50"
          title="Force reconnect wallet"
        >
          <RefreshCw size={18} className={isReconnecting ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => disconnect()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
        >
          <LogOut size={18} />
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isPending || isReconnecting}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
    >
      {isPending || isReconnecting ? (
        <RefreshCw size={18} className="animate-spin" />
      ) : (
        <Wallet size={18} />
      )}
      {isPending || isReconnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}