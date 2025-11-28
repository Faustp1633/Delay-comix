import React from 'react';
import { PanelData, Character, BubblePosition, BubbleShape } from '../types';
import { X, Sparkles, Trash2, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight, Square, Circle, Cloud, Move, Eye, Image as ImageIcon } from 'lucide-react';

interface PanelEditorProps {
  panel: PanelData;
  char1: Character;
  char2: Character;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<PanelData>) => void;
  onGenerate: (id: string) => void;
}

interface PosButtonProps {
  current: BubblePosition;
  target: BubblePosition;
  onClick: () => void;
}

const PosButton: React.FC<PosButtonProps> = ({ current, target, onClick }) => {
  const isActive = current === target;
  return (
      <button
          onClick={onClick}
          className={`p-1.5 rounded-md border transition-all ${isActive ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
          title={`Quick Position: ${target}`}
          type="button"
      >
          {target === 'top-left' && <ArrowUpLeft size={14} />}
          {target === 'top-right' && <ArrowUpRight size={14} />}
          {target === 'bottom-left' && <ArrowDownLeft size={14} />}
          {target === 'bottom-right' && <ArrowDownRight size={14} />}
      </button>
  );
};

interface ShapeButtonProps {
    current: BubbleShape;
    target: BubbleShape;
    onClick: () => void;
}

const ShapeButton: React.FC<ShapeButtonProps> = ({ current, target, onClick }) => {
    const isActive = current === target;
    return (
        <button
            onClick={onClick}
            className={`p-1.5 rounded-md border transition-all ${isActive ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
            title={`Shape: ${target}`}
            type="button"
        >
            {target === 'square' && <Square size={14} />}
            {target === 'rounded' && <Circle size={14} />}
            {target === 'thought' && <Cloud size={14} />}
        </button>
    );
};

export const PanelEditor: React.FC<PanelEditorProps> = ({ 
  panel, char1, char2, isOpen, onClose, onUpdate, onGenerate
}) => {
  if (!isOpen) return null;

  // --- PREVIEW LOGIC (Duplicated from ComicPanel to ensure WYSIWYG) ---
  const getFontSizeClass = (text: string) => {
    const len = text.length;
    if (len < 20) return "text-xs";
    if (len < 50) return "text-[10px]";
    return "text-[9px]";
  };

  const getShapeClass = (shape?: BubbleShape) => {
      switch(shape) {
          case 'square': return 'rounded-sm';
          case 'thought': return 'rounded-[2rem] border-dashed';
          case 'rounded': 
          default: return 'rounded-xl';
      }
  };

  const getTailClass = (pos?: BubblePosition, shape?: BubbleShape, isChar1: boolean = true) => {
     const p = pos || (isChar1 ? 'top-left' : 'top-right');
     const s = shape || 'rounded';
     if (s === 'thought') return "hidden";
     const size = "w-2.5 h-2.5";
     if (p.includes('top')) {
         return p.includes('left') 
            ? `absolute -bottom-2 left-4 ${size} bg-white border-b border-r border-black transform rotate-45`
            : `absolute -bottom-2 right-4 ${size} bg-white border-b border-r border-black transform rotate-45`;
     } else {
         return p.includes('left')
            ? `absolute -top-2 left-4 ${size} bg-white border-t border-l border-black transform rotate-45`
            : `absolute -top-2 right-4 ${size} bg-white border-t border-l border-black transform rotate-45`;
     }
  };

  const getTailCoverClass = (pos?: BubblePosition, shape?: BubbleShape, isChar1: boolean = true) => {
      const s = shape || 'rounded';
      if (s === 'thought') return "hidden";
      const p = pos || (isChar1 ? 'top-left' : 'top-right');
      const w = "w-4";
      const h = "h-1.5";
      if (p.includes('top')) {
         return p.includes('left') ? `absolute bottom-0 left-4 ${w} ${h} bg-white` : `absolute bottom-0 right-4 ${w} ${h} bg-white`;
      } else {
         return p.includes('left') ? `absolute top-0 left-4 ${w} ${h} bg-white` : `absolute top-0 right-4 ${w} ${h} bg-white`;
      }
  };
  
  const renderThoughtTail = (pos?: BubblePosition, isChar1: boolean = true) => {
      const p = pos || (isChar1 ? 'top-left' : 'top-right');
      const isTop = p.includes('top');
      const isLeft = p.includes('left');
      return (
          <div className={`absolute flex flex-col items-center gap-0.5 pointer-events-none z-0 ${isTop ? '-bottom-5' : '-top-5'} ${isLeft ? 'left-6' : 'right-6'}`}>
              <div className={`w-2 h-2 bg-white border border-black rounded-full ${isTop ? '' : 'order-last'}`}></div>
              <div className={`w-1 h-1 bg-white border border-black rounded-full ${isTop ? 'translate-y-1' : '-translate-y-1'}`}></div>
          </div>
      );
  }

  // Helper to set both preset and coordinates
  const handleQuickPos = (id: string, pos: BubblePosition, isChar1: boolean) => {
      let x = 5;
      let y = 5;
      if (pos === 'top-right') { x = 55; y = 5; }
      if (pos === 'bottom-left') { x = 5; y = 70; }
      if (pos === 'bottom-right') { x = 55; y = 70; }

      const updates: Partial<PanelData> = isChar1 
        ? { char1BubblePos: pos, char1BubbleX: x, char1BubbleY: y }
        : { char2BubblePos: pos, char2BubbleX: x, char2BubbleY: y };
      
      onUpdate(id, updates);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl h-[90vh] flex flex-col rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-comic tracking-wide">
                Edit Panel #{panel.index + 1}
            </h2>
            <p className="text-xs text-slate-500">Edit actions, dialogues, and fine-tune bubble positions.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content Area - Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left: Live Preview */}
            <div className="md:w-1/2 bg-slate-100 border-b md:border-b-0 md:border-r border-slate-200 p-6 flex flex-col items-center justify-center relative overflow-y-auto">
                <div className="absolute top-4 left-4 flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider bg-white/80 px-2 py-1 rounded-md backdrop-blur-sm z-20">
                    <Eye size={14}/> Live Preview
                </div>

                <div className="relative w-full max-w-md aspect-square bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] rounded-lg overflow-hidden shrink-0">
                    {panel.imageUrl ? (
                        <img src={panel.imageUrl} className="w-full h-full object-cover" alt="Panel Preview" />
                    ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center border-2 border-dashed border-slate-300">
                            <ImageIcon size={48} className="mb-2 opacity-50"/>
                            <span className="text-sm">Generate image to see preview</span>
                        </div>
                    )}

                    {/* PREVIEW BUBBLES & WATERMARK */}
                    {panel.imageUrl && (
                        <>
                            {/* Watermark */}
                            <div className="absolute bottom-2 right-2 text-[10px] font-bold text-white/80 font-sans pointer-events-none z-0 drop-shadow-md tracking-wider">
                                @tipmarketolog
                            </div>

                            {/* Char 1 Bubble */}
                            {panel.char1Dialogue && (
                                <div 
                                    className="absolute max-w-[35%] z-10 transition-all duration-100 ease-out cursor-move"
                                    style={{ left: `${panel.char1BubbleX ?? 5}%`, top: `${panel.char1BubbleY ?? 5}%` }}
                                >
                                    <div className={`bg-white border border-black p-2 relative font-comic text-black leading-tight text-center shadow-sm ${getFontSizeClass(panel.char1Dialogue)} ${getShapeClass(panel.char1BubbleShape)} min-w-[60px]`}>
                                        {panel.char1Dialogue}
                                        <div className={getTailClass(panel.char1BubblePos, panel.char1BubbleShape, true)}></div>
                                        <div className={getTailCoverClass(panel.char1BubblePos, panel.char1BubbleShape, true)}></div>
                                        {panel.char1BubbleShape === 'thought' && renderThoughtTail(panel.char1BubblePos, true)}
                                    </div>
                                </div>
                            )}
                             {/* Char 2 Bubble */}
                            {panel.char2Dialogue && (
                                <div 
                                    className="absolute max-w-[35%] z-10 transition-all duration-100 ease-out cursor-move"
                                    style={{ left: `${panel.char2BubbleX ?? 55}%`, top: `${panel.char2BubbleY ?? 5}%` }}
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
                {panel.imageUrl && (
                    <p className="text-xs text-slate-500 mt-4 text-center max-w-xs">
                        Use the <strong>Pos X</strong> and <strong>Pos Y</strong> sliders on the right to move speech bubbles.
                    </p>
                )}
            </div>

            {/* Right: Controls */}
            <div className="md:w-1/2 p-6 overflow-y-auto bg-white">
                <div className="space-y-8">
                    
                    {/* Setting */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Scene Setting (Background)</label>
                        <input 
                            type="text" 
                            value={panel.setting}
                            onChange={(e) => onUpdate(panel.id, { setting: e.target.value })}
                            placeholder="e.g., A busy futuristic coffee shop, raining outside..."
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                        />
                    </div>

                    {/* Character 1 Controls */}
                    <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                            <h3 className="font-bold text-indigo-900">{char1.name || "Character 1"}</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-indigo-700 uppercase mb-1">Action</label>
                                <textarea 
                                    rows={2}
                                    value={panel.char1Action}
                                    onChange={(e) => onUpdate(panel.id, { char1Action: e.target.value })}
                                    placeholder="Action description..."
                                    className="w-full p-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-xs font-semibold text-indigo-700 uppercase">Dialogue & Bubble</label>
                                </div>
                                
                                {/* Bubble Tools */}
                                <div className="bg-white/80 p-3 rounded-lg border border-indigo-100 mb-2 space-y-3">
                                     <div className="flex items-center justify-between">
                                        <div className="flex gap-1">
                                            {(['square', 'rounded', 'thought'] as BubbleShape[]).map(shape => (
                                                <ShapeButton key={shape} current={panel.char1BubbleShape || 'rounded'} target={shape} onClick={() => onUpdate(panel.id, { char1BubbleShape: shape })} />
                                            ))}
                                        </div>
                                        <div className="flex gap-1">
                                            {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as BubblePosition[]).map(pos => (
                                                <PosButton key={pos} current={panel.char1BubblePos || 'top-left'} target={pos} onClick={() => handleQuickPos(panel.id, pos, true)} />
                                            ))}
                                        </div>
                                     </div>
                                     
                                     {/* Sliders */}
                                     <div className="space-y-2 pt-2 border-t border-indigo-50">
                                         <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-indigo-400 w-8">POS X</span>
                                            <input 
                                                type="range" min="0" max="90" step="1"
                                                value={panel.char1BubbleX ?? 5}
                                                onChange={(e) => onUpdate(panel.id, { char1BubbleX: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="text-[10px] w-6 text-right">{panel.char1BubbleX}%</span>
                                         </div>
                                         <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-indigo-400 w-8">POS Y</span>
                                            <input 
                                                type="range" min="0" max="90" step="1"
                                                value={panel.char1BubbleY ?? 5}
                                                onChange={(e) => onUpdate(panel.id, { char1BubbleY: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="text-[10px] w-6 text-right">{panel.char1BubbleY}%</span>
                                         </div>
                                     </div>
                                </div>

                                <textarea 
                                    rows={2}
                                    value={panel.char1Dialogue}
                                    onChange={(e) => onUpdate(panel.id, { char1Dialogue: e.target.value })}
                                    placeholder="Dialogue..."
                                    className="w-full p-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-comic resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Character 2 Controls */}
                    <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/50">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                            <h3 className="font-bold text-rose-900">{char2.name || "Character 2"}</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-rose-700 uppercase mb-1">Action</label>
                                <textarea 
                                    rows={2}
                                    value={panel.char2Action}
                                    onChange={(e) => onUpdate(panel.id, { char2Action: e.target.value })}
                                    placeholder="Action description..."
                                    className="w-full p-2 text-sm border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-xs font-semibold text-rose-700 uppercase">Dialogue & Bubble</label>
                                </div>
                                
                                {/* Bubble Tools */}
                                <div className="bg-white/80 p-3 rounded-lg border border-rose-100 mb-2 space-y-3">
                                     <div className="flex items-center justify-between">
                                        <div className="flex gap-1">
                                            {(['square', 'rounded', 'thought'] as BubbleShape[]).map(shape => (
                                                <ShapeButton key={shape} current={panel.char2BubbleShape || 'rounded'} target={shape} onClick={() => onUpdate(panel.id, { char2BubbleShape: shape })} />
                                            ))}
                                        </div>
                                        <div className="flex gap-1">
                                            {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as BubblePosition[]).map(pos => (
                                                <PosButton key={pos} current={panel.char2BubblePos || 'top-right'} target={pos} onClick={() => handleQuickPos(panel.id, pos, false)} />
                                            ))}
                                        </div>
                                     </div>
                                     
                                     {/* Sliders */}
                                     <div className="space-y-2 pt-2 border-t border-rose-50">
                                         <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-rose-400 w-8">POS X</span>
                                            <input 
                                                type="range" min="0" max="90" step="1"
                                                value={panel.char2BubbleX ?? 55}
                                                onChange={(e) => onUpdate(panel.id, { char2BubbleX: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-rose-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="text-[10px] w-6 text-right">{panel.char2BubbleX}%</span>
                                         </div>
                                         <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-rose-400 w-8">POS Y</span>
                                            <input 
                                                type="range" min="0" max="90" step="1"
                                                value={panel.char2BubbleY ?? 5}
                                                onChange={(e) => onUpdate(panel.id, { char2BubbleY: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-rose-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="text-[10px] w-6 text-right">{panel.char2BubbleY}%</span>
                                         </div>
                                     </div>
                                </div>

                                <textarea 
                                    rows={2}
                                    value={panel.char2Dialogue}
                                    onChange={(e) => onUpdate(panel.id, { char2Dialogue: e.target.value })}
                                    placeholder="Dialogue..."
                                    className="w-full p-2 text-sm border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none font-comic resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3 shrink-0">
             <button 
                onClick={() => onUpdate(panel.id, { 
                    char1Action: '', char1Dialogue: '', 
                    char2Action: '', char2Dialogue: '', 
                    setting: '' 
                })}
                className="px-4 py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 text-sm"
            >
                <Trash2 size={16} />
                Clear
            </button>
            <button 
                onClick={onClose}
                className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors text-sm"
            >
                Save Draft
            </button>
            <button 
                onClick={() => {
                    onClose();
                    onGenerate(panel.id);
                }}
                className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-95 text-sm"
            >
                <Sparkles size={16} className="text-yellow-400" />
                Generate Panel
            </button>
        </div>

      </div>
    </div>
  );
};