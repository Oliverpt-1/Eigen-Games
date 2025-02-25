import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import Generator from './pages/Generator';
import Marketplace from './pages/Marketplace';
import SafeCheck from './pages/SafeCheck';

function App() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <nav className="border-b border-gray-200/50 bg-white/80 backdrop-blur-xl sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-purple-600/10 via-purple-400/5 to-purple-600/10 p-2 rounded-lg">
                  <Code2 className="w-8 h-8 text-purple-600" />
                </div>
                <div className="ml-3 bg-gradient-to-r from-purple-600/10 via-purple-400/5 to-purple-600/10 py-1 px-3 rounded-lg">
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                    Uniswap V4 Hook Generator
                  </span>
                </div>
              </div>
              <div className="flex space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    isActive('/') 
                      ? 'bg-purple-100/50 text-purple-700' 
                      : 'text-gray-600 hover:bg-gray-100/50'
                  }`}
                >
                  Generator
                </Link>
                <Link
                  to="/marketplace"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    isActive('/marketplace') 
                      ? 'bg-purple-100/50 text-purple-700' 
                      : 'text-gray-600 hover:bg-gray-100/50'
                  }`}
                >
                  Marketplace
                </Link>
                <Link
                  to="/safecheck"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    isActive('/safecheck') 
                      ? 'bg-purple-100/50 text-purple-700' 
                      : 'text-gray-600 hover:bg-gray-100/50'
                  }`}
                >
                  SafeCheck
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Generator />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/safecheck" element={<SafeCheck />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;