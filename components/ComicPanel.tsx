import React, { useState } from 'react';
import { PanelData, Character, BubblePosition, BubbleShape } from '../types';
import { Download, RefreshCw, Edit2, Loader2, Image as ImageIcon } from 'lucide-react';
import { generateDownloadableImage } from '../utils/downloadUtils';

interface ComicPanelProps {
  panel: PanelData;
  onEdit: (panelId: string) => void;
  onRegenerate: (panelId: string) => void;
}

export const ComicPanel: React.FC<ComicPanelProps> = ({ panel, onEdit, onRegenerate }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!panel.imageUrl) return;
    setIsDownloading(true);
    try {
      const dataUrl = await generateDownloadableImage(panel, {} as Character, {} as Character);
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `comic-panel-${panel.index + 1}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper to dynamically size text to fit in bubble - NOW SMALLER
  const getFontSizeClass = (text: string) => {
    const len = text.length;
    if (len < 20) return "text-xs"; // ~12px
    if (len < 50) return "text-[10px]"; // ~10px
    return "text-[9px]"; // ~9px
  };

  const getShapeClass = (shape?: BubbleShape) => {
      switch(shape) {
          case 'square': return 'rounded-sm'; // Slight round to avoid harsh pixelation look, but mostly square
          case 'thought': return 'rounded-[2rem] border-dashed'; // Cloud-like
          case 'rounded': 
          default: return 'rounded-xl';
      }
  };

  const getTailClass = (pos?: BubblePosition, shape?: BubbleShape, isChar1: boolean = true) => {
     const p = pos || (isChar1 ? 'top-left' : 'top-right');
     const s = shape || 'rounded';

     // If Thought bubble, render circles instead of triangle
     if (s === 'thought') {
         // Dots logic handled in main render or via separate divs. 
         // Returning hidden here to disable standard tail.
         return "hidden"; 
     }

     const size = "w-2.5 h-2.5"; // Smaller tail
     if (p.includes('top')) {
         return p.includes('left') 
            ? `absolute -bottom-2 left-4 ${size} bg-white border-b border-r border-black transform rotate-45`
            : `absolute -bottom-2 right-4 ${size} bg-white border-b border-r border-black transform rotate-45`;
     } else {
         // Bottom bubbles need tails pointing UP
         return p.includes('left')
            ? `absolute -top-2 left-4 ${size} bg-white border-t border-l border-black transform rotate-45`
            : `absolute -top-2 right-4 ${size} bg-white border-t border-l border-black transform rotate-45`;
     }
  };

  const getTailCoverClass = (pos?: BubblePosition, shape?: BubbleShape, isChar1: boolean = true) => {
      const s = shape || 'rounded';
      if (s === 'thought') return "hidden";

      const p = pos || (isChar1 ? 'top-left' : 'top-right');
      const w = "w-4"; // Smaller cover width
      const h = "h-1.5";
      if (p.includes('top')) {
         return p.includes('left')
            ? `absolute bottom-0 left-4 ${w} ${h} bg-white`
            : `absolute bottom-0 right-4 ${w} ${h} bg-white`;
      } else {
         return p.includes('left')
            ? `absolute top-0 left-4 ${w} ${h} bg-white`
            : `absolute top-0 right-4 ${w} ${h} bg-white`;
      }
  };
  
  // Render Thought Tail (Circles)
  const renderThoughtTail = (pos?: BubblePosition, isChar1: boolean = true) => {
      const p = pos || (isChar1 ? 'top-left' : 'top-right');
      const isTop = p.includes('top');
      const isLeft = p.includes('left');
      
      return (
          <div className={`absolute flex flex-col items-center gap-0.5 pointer-events-none z-0 ${isTop ? '-bottom-5' : '-top-5'} ${isLeft ? 'left-6' : 'right-6'}`}>
              {/* Large dot */}
              <div className={`w-2 h-2 bg-white border border-black rounded-full ${isTop ? '' : 'order-last'}`}></div>
              {/* Small dot */}
              <div className={`w-1 h-1 bg-white border border-black rounded-full ${isTop ? 'translate-y-1' : '-translate-y-1'}`}></div>
          </div>
      );
  }

  return (
    <div className="group relative w-full aspect-square bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg overflow-hidden flex flex-col">
      {/* Header / Toolbar (Visible on Hover or Empty) */}
      <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-start z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/50 to-transparent">
        <div className="bg-white/90 text-[10px] font-bold px-1.5 py-0.5 rounded border border-black shadow-sm font-header">
            #{panel.index + 1}
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => onEdit(panel.id)}
            className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-yellow-400 border border-black transition-colors"
            title="Edit Description"
          >
            <Edit2 size={12} />
          </button>
          {panel.imageUrl && (
            <>
                <button 
                    onClick={() => onRegenerate(panel.id)}
                    className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-blue-400 border border-black transition-colors"
                    title="Regenerate Image"
                >
                    <RefreshCw size={12} />
                </button>
                <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-green-400 border border-black transition-colors"
                    title="Download High Quality"
                >
                    {isDownloading ? <Loader2 size={12} className="animate-spin"/> : <Download size={12} />}
                </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full h-full bg-slate-100 flex items-center justify-center overflow-hidden">
        {panel.isLoading ? (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <span className="font-comic text-lg animate-pulse">Drawing...</span>
          </div>
        ) : panel.imageUrl ? (
          <img 
            src={panel.imageUrl} 
            alt={`Panel ${panel.index + 1}`} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            onClick={() => onEdit(panel.id)}
            className="flex flex-col items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
          >
            <ImageIcon size={48} />
            <span className="text-sm font-medium">Empty Panel</span>
            <span className="text-[10px]">Click edit to setup</span>
          </div>
        )}

        {/* Speech Bubbles Overlay - MINIMALIST */}
        {!panel.isLoading && panel.imageUrl && (
            <>
                {/* Watermark */}
                <div className="absolute bottom-2 right-2 text-[10px] font-bold text-white/80 font-sans pointer-events-none z-0 drop-shadow-md tracking-wider">
                    @tipmarketolog
                </div>

                {/* Character 1 Bubble */}
                {panel.char1Dialogue && (
                    <div 
                        className="absolute max-w-[35%] z-10 transition-all duration-300 ease-in-out"
                        style={{
                            left: `${panel.char1BubbleX ?? 5}%`,
                            top: `${panel.char1BubbleY ?? 5}%`
                        }}
                    >
                        <div className={`bg-white border border-black p-2 relative font-comic text-black leading-tight text-center shadow-sm ${getFontSizeClass(panel.char1Dialogue)} ${getShapeClass(panel.char1BubbleShape)} min-w-[60px]`}>
                            {panel.char1Dialogue}
                            <div className={getTailClass(panel.char1BubblePos, panel.char1BubbleShape, true)}></div>
                            <div className={getTailCoverClass(panel.char1BubblePos, panel.char1BubbleShape, true)}></div>
                            {panel.char1BubbleShape === 'thought' && renderThoughtTail(panel.char1BubblePos, true)}
                        </div>
                    </div>
                )}

                {/* Character 2 Bubble */}
                {panel.char2Dialogue && (
                    <div 
                        className="absolute max-w-[35%] z-10 transition-all duration-300 ease-in-out"
                        style={{
                            left: `${panel.char2BubbleX ?? 55}%`,
                            top: `${panel.char2BubbleY ?? 5}%`
                        }}
                    >
                         <div className={`bg-white border border-black p-2 relative font-comic text-black leading-tight text-center shadow-sm ${getFontSizeClass(panel.char2Dialogue)} ${getShapeClass(panel.char2BubbleShape)} min-w-[60px]`}>
                            {panel.char2Dialogue}
                            <div className={getTailClass(panel.char2BubblePos, panel.char2BubbleShape, false)}></div>
                            <div className={getTailCoverClass(panel.char2BubblePos, panel.char2BubbleShape, false)}></div>
                            {panel.char2BubbleShape === 'thought' && renderThoughtTail(panel.char2BubblePos, false)}
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
      
      {/* Footer info if empty */}
      {!panel.imageUrl && !panel.isLoading && (
        <div className="absolute bottom-2 w-full text-center text-[10px] text-slate-400">
             {panel.char1Action || panel.char2Action ? "Ready to generate" : "No description"}
        </div>
      )}
    </div>
  );
};