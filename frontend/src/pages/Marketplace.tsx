import React, { useState } from 'react';
import { Star, Search, Upload, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Hook {
  id: string;
  name: string;
  description: string;
  author: string;
  rating: number;
  downloads: number;
  createdAt: Date;
  tags: string[];
}

const mockHooks: Hook[] = [
  {
    id: '1',
    name: 'Dynamic Fee Hook',
    description: 'Adjusts fees based on market volatility and pool utilization.',
    author: 'eth_dev',
    rating: 4.8,
    downloads: 1234,
    createdAt: new Date('2024-02-15'),
    tags: ['fees', 'dynamic', 'volatility']
  },
  {
    id: '2',
    name: 'MEV Protection Hook',
    description: 'Prevents sandwich attacks and other MEV exploitation.',
    author: 'security_wizard',
    rating: 4.9,
    downloads: 2341,
    createdAt: new Date('2024-02-20'),
    tags: ['security', 'MEV', 'protection']
  },
  {
    id: '3',
    name: 'Liquidity Incentive Hook',
    description: 'Rewards liquidity providers with bonus tokens.',
    author: 'defi_builder',
    rating: 4.5,
    downloads: 987,
    createdAt: new Date('2024-03-01'),
    tags: ['liquidity', 'rewards', 'incentives']
  }
];

function Marketplace() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'date'>('rating');

  const sortedHooks = [...mockHooks].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'downloads':
        return b.downloads - a.downloads;
      case 'date':
        return b.createdAt.getTime() - a.createdAt.getTime();
      default:
        return 0;
    }
  });

  const filteredHooks = sortedHooks.filter(hook =>
    hook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hook.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hook.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
          Hook Marketplace
        </h1>
        <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          <Upload className="w-4 h-4" />
          <span>Upload Hook</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search hooks by name, description, or tags..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'rating' | 'downloads' | 'date')}
        >
          <option value="rating">Sort by Rating</option>
          <option value="downloads">Sort by Downloads</option>
          <option value="date">Sort by Date</option>
        </select>
      </div>

      {/* Hooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHooks.map(hook => (
          <div key={hook.id} className="bg-white rounded-xl border border-gray-200/60 p-6 hover:shadow-lg transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{hook.name}</h3>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600">{hook.rating}</span>
              </div>
            </div>
            <p className="text-gray-600 mb-4 line-clamp-2">{hook.description}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {hook.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>By {hook.author}</span>
              <span>{formatDistanceToNow(hook.createdAt, { addSuffix: true })}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">{hook.downloads.toLocaleString()} downloads</span>
              <button className="flex items-center space-x-1 text-purple-600 hover:text-purple-700">
                <span>View Details</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Marketplace;