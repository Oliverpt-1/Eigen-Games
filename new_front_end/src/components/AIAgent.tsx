import React, { useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAgent({ contractCode }: { contractCode: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleScan = async () => {
    if (isLoading) return;
    
    setIsAnimating(true);
    setIsLoading(true);

    try {
      // Make a real API call to the Execution Service
      const response = await fetch('http://localhost:4003/task/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskDefinitionId: 0,
          solidityCode: contractCode
        }),
      });

      const data = await response.json();
      
      // Format the response for display
      const analysis = data.data.full_analysis;
      let message = `I've completed the security scan of your contract. Here are my findings:\n\n`;
      
      if (analysis.is_vulnerable) {
        message += `⚠️ This contract is vulnerable with a ${analysis.overall_risk_level} risk level.\n\n`;
      } else {
        message += `✅ No vulnerabilities detected.\n\n`;
      }
      
      if (analysis.vulnerabilities && analysis.vulnerabilities.length > 0) {
        message += `Vulnerabilities found:\n`;
        analysis.vulnerabilities.forEach((vuln: any, index: number) => {
          message += `${index + 1}. ${vuln.name} (${vuln.risk_level}): ${vuln.description}\n`;
          if (vuln.suggested_fix) {
            message += `   Suggestion: ${vuln.suggested_fix}\n`;
          }
        });
        message += `\n`;
      }
      
      if (analysis.malicious_patterns && analysis.malicious_patterns.length > 0) {
        message += `⛔ Malicious patterns detected:\n`;
        analysis.malicious_patterns.forEach((pattern: any, index: number) => {
          message += `${index + 1}. ${pattern.name} (${pattern.risk_level}): ${pattern.description}\n`;
        });
        message += `\n`;
      }
      
      message += `Recommendation: ${analysis.recommendation}`;
      
      setMessages([
        {
          role: 'assistant',
          content: message
        }
      ]);
    } catch (error) {
      console.error('Failed to analyze contract:', error);
      setMessages([
        {
          role: 'assistant',
          content: "I encountered an error while analyzing your contract. Please try again."
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsAnimating(false);
    }
  };

  return (
    <div className="mt-8 border border-pink-100 rounded-xl p-6 bg-white/50">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-6 h-6 text-pink-500" />
        <h2 className="text-xl font-semibold text-gray-900">UniGuard Agent</h2>
      </div>

      <div className="relative h-[300px] mb-4 overflow-y-auto space-y-4 p-4 bg-white rounded-lg border border-pink-100">
        {messages.length === 0 && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 cursor-pointer transition-transform hover:scale-105"
            onClick={handleScan}
          >
            <img 
              src="/image/jacked_unicorn.jpg" 
              alt="UniGuard Mascot" 
              className={`w-32 h-32 rounded-full object-cover mb-4 transition-all ${
                isAnimating ? 'animate-bounce' : ''
              }`}
              style={{ 
                animationDuration: '1s',
                animationTimingFunction: 'cubic-bezier(0.28, 0.84, 0.42, 1)'
              }}
            />
            <div className="text-center font-medium">
              Press me to scan for malicious code or vulnerabilities
            </div>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-xl whitespace-pre-line ${
                message.role === 'assistant'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}