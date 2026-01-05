
import React, { useState, useEffect } from 'react';
import { Device } from '../types';
import { getSystemInsights } from '../services/geminiService';

interface GeminiInsightsProps {
  devices: Device[];
}

const GeminiInsights: React.FC<GeminiInsightsProps> = ({ devices }) => {
  const [insight, setInsight] = useState<string>('Analyzing system state...');
  const [loading, setLoading] = useState<boolean>(true);
  const [cooldown, setCooldown] = useState<number>(0);

  const fetchInsight = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    const result = await getSystemInsights(devices);
    
    if (result?.includes("QUOTA_EXHAUSTED")) {
      setInsight("Our AI analyst is currently resting due to high demand. Automatic updates will resume shortly.");
      setCooldown(60); // 60 second cooldown on manual refreshes
    } else {
      setInsight(result || 'Unable to generate insights at this moment.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInsight();
    const interval = setInterval(fetchInsight, 300000); // 5 min interval
    return () => clearInterval(interval);
  }, []);

  // Cooldown timer logic
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const isRateLimited = insight.includes("resting due to high demand");

  return (
    <div className={`bg-slate-800/50 border ${isRateLimited ? 'border-amber-500/30' : 'border-indigo-500/30'} rounded-xl p-4 relative overflow-hidden transition-colors duration-500`}>
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <svg className={`w-24 h-24 ${isRateLimited ? 'text-amber-400' : 'text-indigo-400'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
        </svg>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${isRateLimited ? 'bg-amber-500' : 'bg-indigo-500'} flex items-center justify-center transition-colors shadow-lg`}>
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">AI System Analyst</h3>
          <p className={`text-[10px] ${isRateLimited ? 'text-amber-400' : 'text-slate-400'} font-medium`}>
            {isRateLimited ? 'RATE LIMIT ACTIVE' : 'POWERED BY GEMINI 3 FLASH'}
          </p>
        </div>
        <button 
          onClick={fetchInsight} 
          disabled={loading || cooldown > 0}
          className={`ml-auto p-1.5 rounded-md transition-all flex items-center gap-2
            ${loading || cooldown > 0 ? 'text-slate-600 bg-slate-800/50 cursor-not-allowed' : 'hover:bg-slate-700 text-slate-400'}`}
        >
          {cooldown > 0 && <span className="text-[10px] font-mono">{cooldown}s</span>}
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="text-slate-300 text-sm leading-relaxed min-h-[80px]">
        {loading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-700 rounded w-5/6"></div>
          </div>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            {insight.split('\n').map((line, i) => (
              <p key={i} className={`mb-2 ${isRateLimited ? 'text-slate-400 italic' : ''}`}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiInsights;
