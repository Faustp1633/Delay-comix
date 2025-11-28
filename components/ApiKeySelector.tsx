import React, { useState, useEffect } from 'react';
import { Key, AlertTriangle, ExternalLink } from 'lucide-react';

// Define local interface to use for casting, avoiding global namespace conflict
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
  const [hasKey, setHasKey] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkKey = async () => {
    try {
      const aistudio = (window as any).aistudio as AIStudio | undefined;
      if (aistudio) {
        const selected = await aistudio.hasSelectedApiKey();
        setHasKey(selected);
        if (selected) {
          onKeySelected();
        }
      }
    } catch (e) {
      console.error("Error checking API key:", e);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkKey();
    // Poll quickly in case user selected it in another tab or just now
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio as AIStudio | undefined;
    if (aistudio) {
      try {
        await aistudio.openSelectKey();
        // Assume success after interaction
        setHasKey(true);
        onKeySelected();
      } catch (e) {
        console.error("Key selection failed", e);
        // Retry logic often not needed if UI handles re-click
      }
    }
  };

  if (isChecking) return null; // Or a spinner

  if (hasKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-200">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-600">
          <Key size={32} />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-2">API Key Required</h2>
        <p className="text-slate-600 mb-6">
          To generate high-quality comic images, please select a paid Google Cloud Project API key.
        </p>

        <button
          onClick={handleSelectKey}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 mb-4"
        >
          <Key size={20} />
          Select API Key
        </button>

        <div className="text-xs text-slate-500 flex flex-col items-center gap-2">
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
          >
            <ExternalLink size={12} />
            Billing Documentation
          </a>
          <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded">
             <AlertTriangle size={12} />
             <span>Standard npm environment requires valid key selection</span>
          </div>
        </div>
      </div>
    </div>
  );
};