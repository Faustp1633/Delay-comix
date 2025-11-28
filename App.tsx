import React, { useState, useEffect } from 'react';
import { PanelCount, Character, PanelData, ComicState, ComicStyle } from './types';
import { generatePanelImage, generateComicScript } from './services/geminiService';
import { generateDownloadableImage } from './utils/downloadUtils';
import { ComicPanel } from './components/ComicPanel';
import { PanelEditor } from './components/PanelEditor';
import { Users, Layout, Play, BookOpen, Palette, Sparkles, Loader2, MapPin, RefreshCw, PenTool, X, Download } from 'lucide-react';
import JSZip from 'jszip';

const INITIAL_STATE: ComicState = {
  title: "My Awesome Comic",
  style: 'modern',
  panelCount: PanelCount.THREE,
  char1: { id: 'c1', name: 'Hero', appearance: 'A young man with messy blue hair wearing a futuristic pilot jacket', color: 'indigo' },
  char2: { id: 'c2', name: 'Sidekick', appearance: 'A small floating robot with one glowing green eye', color: 'rose' },
  globalSetting: 'A futuristic city street with neon lights',
  seed: Math.floor(Math.random() * 1000000),
  panels: []
};

// Helper to init panels
const createPanels = (count: number): PanelData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `panel-${Date.now()}-${i}`,
    index: i,
    char1Action: '',
    char1Dialogue: '',
    char1BubblePos: 'top-left',
    char1BubbleShape: 'rounded',
    char1BubbleX: 5,
    char1BubbleY: 5,
    char2Action: '',
    char2Dialogue: '',
    char2BubblePos: 'top-right',
    char2BubbleShape: 'rounded',
    char2BubbleX: 55,
    char2BubbleY: 5,
    setting: '',
    isLoading: false
  }));
};

const STYLES: { id: ComicStyle; label: string }[] = [
  { id: 'modern', label: 'Modern Comic' },
  { id: 'manga', label: 'Manga (B&W/Ink)' },
  { id: 'anime', label: 'Anime Color' },
  { id: 'retro', label: 'Retro (1950s)' },
  { id: 'grayscale', label: 'Noir / Grayscale' },
  { id: 'cinematic', label: 'Cinematic / Realistic' },
  { id: '3d_render', label: '3D Cartoon' },
  { id: 'pixel_art', label: 'Pixel Art' },
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'oil_painting', label: 'Oil Painting' },
  { id: 'sketch', label: 'Pencil Sketch' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'ukiyo_e', label: 'Japanese Woodblock' },
];

export default function App() {
  const [state, setState] = useState<ComicState>({
    ...INITIAL_STATE,
    panels: createPanels(INITIAL_STATE.panelCount as number)
  });
  
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  
  // Custom Anecdote Modal State
  const [showAnecdoteInput, setShowAnecdoteInput] = useState(false);
  const [customAnecdote, setCustomAnecdote] = useState("");

  // When panel count changes, reset panels
  const handlePanelCountChange = (count: PanelCount) => {
    if (confirm("Changing grid size will reset current panels. Continue?")) {
        setState(prev => ({
            ...prev,
            panelCount: count,
            panels: createPanels(count)
        }));
    }
  };

  const updateCharacter = (charKey: 'char1' | 'char2', field: keyof Character, value: string) => {
    setState(prev => ({
      ...prev,
      [charKey]: { ...prev[charKey], [field]: value }
    }));
  };

  const updatePanel = (id: string, updates: Partial<PanelData>) => {
    setState(prev => ({
      ...prev,
      panels: prev.panels.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const regenerateSeed = () => {
    setState(prev => ({ ...prev, seed: Math.floor(Math.random() * 1000000) }));
  };

  // Handles both random and custom script generation
  const handleGenerateScript = async (customText?: string) => {
    setIsGeneratingScript(true);
    if (customText) setShowAnecdoteInput(false);

    try {
        // Pass null for panelCount to let AI decide the optimal length (2-9 panels)
        const script = await generateComicScript(null, customText);
        
        setState(prev => {
            // Map script panels to existing panel objects to keep IDs valid
            const newPanels = prev.panels.map((p, i) => {
                const scriptPanel = script.panels[i];
                return {
                    ...p,
                    char1Action: scriptPanel?.char1Action || '',
                    char1Dialogue: scriptPanel?.char1Dialogue || '',
                    char2Action: scriptPanel?.char2Action || '',
                    char2Dialogue: scriptPanel?.char2Dialogue || '',
                    setting: scriptPanel?.setting || '',
                    imageUrl: undefined, // Reset images on new script
                    isLoading: false
                };
            });

            // If the script has more or fewer panels than current state, recreate panel array
            let finalPanels = newPanels;
            if (script.panels.length !== prev.panels.length) {
                 finalPanels = script.panels.map((sp, i) => ({
                    id: `panel-${Date.now()}-${i}`,
                    index: i,
                    char1Action: sp.char1Action || '',
                    char1Dialogue: sp.char1Dialogue || '',
                    char1BubblePos: 'top-left',
                    char1BubbleShape: 'rounded',
                    char1BubbleX: 5,
                    char1BubbleY: 5,
                    char2Action: sp.char2Action || '',
                    char2Dialogue: sp.char2Dialogue || '',
                    char2BubblePos: 'top-right',
                    char2BubbleShape: 'rounded',
                    char2BubbleX: 55,
                    char2BubbleY: 5,
                    setting: sp.setting || '',
                    isLoading: false
                 }));
            }

            // Use the setting from the first panel as the Global Setting to ensure consistency
            const firstPanelSetting = script.panels[0]?.setting || prev.globalSetting;

            return {
                ...prev,
                title: script.title,
                char1: { ...prev.char1, name: script.char1.name, appearance: script.char1.appearance },
                char2: { ...prev.char2, name: script.char2.name, appearance: script.char2.appearance },
                globalSetting: firstPanelSetting,
                panels: finalPanels,
                panelCount: finalPanels.length
            };
        });
    } catch (e) {
        console.error("Script generation failed", e);
        alert("Could not generate script. Please try again.");
    } finally {
        setIsGeneratingScript(false);
    }
  };

  const handleGeneratePanel = async (panelId: string) => {
    const panel = state.panels.find(p => p.id === panelId);
    if (!panel) return;
    
    // Validate
    if (!panel.char1Action && !panel.char2Action && !state.char1.appearance && !state.char2.appearance) {
        alert("Please describe at least one character action or ensure global descriptions are set.");
        return;
    }

    // Set Loading
    updatePanel(panelId, { isLoading: true, error: undefined });

    try {
      // Logic for Reference Image (Consistency)
      // If we are generating any panel after the first one, and the first one exists, use it as reference.
      let referenceImageUrl: string | undefined = undefined;
      
      // We look at the very first panel (index 0). 
      // If we are currently editing panel 0, we can't use it as reference (circular).
      // If we are editing panel > 0, we check if panel 0 has an image.
      if (panel.index > 0) {
          const firstPanel = state.panels[0];
          if (firstPanel.imageUrl) {
              referenceImageUrl = firstPanel.imageUrl;
          }
      }

      const imageUrl = await generatePanelImage(
        state.char1,
        state.char2,
        panel.char1Action,
        panel.char2Action,
        panel.setting,
        state.globalSetting,
        panel.index,
        state.style,
        state.seed,
        referenceImageUrl // Pass reference image if found
      );

      updatePanel(panelId, { imageUrl, isLoading: false });
    } catch (error) {
      console.error(error);
      updatePanel(panelId, { isLoading: false, error: "Failed to generate image. Try again." });
      alert("Failed to generate image. Please try again.");
    }
  };

  const handleDownloadAll = async () => {
    const panelsToDownload = state.panels.filter(p => p.imageUrl);
    if (panelsToDownload.length === 0) {
      alert("No generated images to download!");
      return;
    }

    setIsDownloadingAll(true);
    const zip = new JSZip();
    const folder = zip.folder("comic-panels");

    try {
      const promises = panelsToDownload.map(async (panel) => {
        // Generate high-res image with bubbles
        const dataUrl = await generateDownloadableImage(panel, state.char1, state.char2);
        if (dataUrl) {
           const base64Data = dataUrl.split(',')[1];
           folder?.file(`panel-${panel.index + 1}.png`, base64Data, {base64: true});
        }
      });

      await Promise.all(promises);
      
      const content = await zip.generateAsync({type: "blob"});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = "comic-strip.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (e) {
      console.error("ZIP Generation error:", e);
      alert("Failed to create ZIP archive.");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const getGridClass = (count: number) => {
    switch (count) {
      case 2: return "grid-cols-1 md:grid-cols-2 max-w-4xl";
      case 3: return "grid-cols-1 md:grid-cols-3 max-w-6xl";
      case 4: return "grid-cols-1 sm:grid-cols-2 max-w-3xl";
      case 5: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-5xl";
      case 6: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-5xl";
      case 9: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-5xl";
      default: return "grid-cols-3";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-30 border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <BookOpen className="text-yellow-400" />
                <h1 className="text-2xl font-header tracking-wider">ComicGen AI</h1>
            </div>
            <div className="flex items-center gap-4 text-sm">
                <span className="opacity-70 hidden sm:inline">Powered by Gemini Flash 2.5</span>
            </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Configuration Area */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <Users className="text-slate-400" />
                    <h2 className="text-xl font-bold text-slate-800">1. Setup Characters & Style</h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Add Anecdote Button */}
                    <button
                        onClick={() => setShowAnecdoteInput(true)}
                        disabled={isGeneratingScript}
                        className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <PenTool size={16} className="text-blue-500"/>
                        Ввести анекдот
                    </button>

                    {/* Auto Script Button */}
                    <button
                        onClick={() => handleGenerateScript(undefined)}
                        disabled={isGeneratingScript}
                        className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isGeneratingScript ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16} className="text-yellow-300"/>}
                        ИИ Сценарий (Random)
                    </button>

                    {/* Style Selector */}
                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                        <Palette size={16} className="text-slate-500 ml-2" />
                        <select 
                            value={state.style}
                            onChange={(e) => setState(prev => ({ ...prev, style: e.target.value as ComicStyle }))}
                            className="bg-transparent border-none text-sm font-semibold text-slate-800 focus:ring-0 cursor-pointer outline-none"
                        >
                            {STYLES.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                {/* Character 1 */}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center justify-between">
                        Character 1
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    </label>
                    <input 
                        className="w-full p-2 border border-slate-200 rounded-md text-sm font-medium"
                        value={state.char1.name}
                        onChange={(e) => updateCharacter('char1', 'name', e.target.value)}
                        placeholder="Name"
                    />
                    <textarea 
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={state.char1.appearance}
                        onChange={(e) => updateCharacter('char1', 'appearance', e.target.value)}
                        placeholder="Describe appearance (e.g. Robot with red eyes...)"
                    />
                </div>

                 {/* Character 2 */}
                 <div className="space-y-3">
                    <label className="text-sm font-bold text-rose-900 uppercase tracking-wider flex items-center justify-between">
                        Character 2
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    </label>
                    <input 
                        className="w-full p-2 border border-slate-200 rounded-md text-sm font-medium"
                        value={state.char2.name}
                        onChange={(e) => updateCharacter('char2', 'name', e.target.value)}
                        placeholder="Name"
                    />
                    <textarea 
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm h-24 focus:ring-2 focus:ring-rose-500 outline-none"
                        value={state.char2.appearance}
                        onChange={(e) => updateCharacter('char2', 'appearance', e.target.value)}
                        placeholder="Describe appearance"
                    />
                </div>

                {/* Global Setting & Consistency */}
                <div className="md:col-span-2 space-y-3 border-t border-slate-100 pt-4">
                     <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                           <MapPin size={16} />
                           Common Location (Background)
                        </label>
                        <button 
                            onClick={regenerateSeed} 
                            className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-1"
                            title="Regenerate random seed for new visual style"
                        >
                            <RefreshCw size={12} /> New Seed: {state.seed}
                        </button>
                     </div>
                     <input 
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 outline-none"
                        value={state.globalSetting}
                        onChange={(e) => setState(prev => ({...prev, globalSetting: e.target.value}))}
                        placeholder="e.g. A busy coffee shop in Tokyo, sunny day..."
                    />
                </div>
            </div>
        </section>

        {/* Storyboard */}
        <section className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Layout className="text-slate-400" />
                    <h2 className="text-xl font-bold text-slate-800">2. Storyboard & Generation</h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Panel Count Selector */}
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-xs font-semibold px-2 text-slate-500">Panels:</span>
                        {[2, 3, 4, 5, 6, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handlePanelCountChange(num as PanelCount)}
                                className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-all ${
                                    state.panelCount === num 
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>

                    {/* Download ALL Button */}
                    <button
                        onClick={handleDownloadAll}
                        disabled={isDownloadingAll || state.panels.every(p => !p.imageUrl)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 disabled:bg-slate-300"
                        title="Download all panels as a ZIP archive"
                    >
                        {isDownloadingAll ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
                        Download All (ZIP)
                    </button>
                </div>
            </div>

            <div className={`grid gap-6 mx-auto ${getGridClass(state.panelCount as number)}`}>
                {state.panels.map((panel) => (
                    <ComicPanel 
                        key={panel.id} 
                        panel={panel}
                        onEdit={(id) => setEditingPanelId(id)}
                        onRegenerate={handleGeneratePanel}
                    />
                ))}
            </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-center py-6 mt-12 border-t border-slate-800">
          <p className="text-sm">Created with Gemini 2.5 Flash & React</p>
      </footer>

      {/* Panel Editor Modal */}
      {editingPanelId && (
          <PanelEditor 
            isOpen={!!editingPanelId}
            onClose={() => setEditingPanelId(null)}
            panel={state.panels.find(p => p.id === editingPanelId)!}
            char1={state.char1}
            char2={state.char2}
            onUpdate={updatePanel}
            onGenerate={handleGeneratePanel}
          />
      )}

      {/* Anecdote Input Modal */}
      {showAnecdoteInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Добавить Анекдот</h3>
                    <button onClick={() => setShowAnecdoteInput(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-500 mb-2">
                        Вставьте текст вашего анекдота или истории. ИИ распределит диалоги и сцены по кадрам.
                    </p>
                    <textarea 
                        className="w-full p-4 border border-slate-300 rounded-lg h-40 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 resize-none"
                        placeholder="Жили у бабуси..."
                        value={customAnecdote}
                        onChange={(e) => setCustomAnecdote(e.target.value)}
                    />
                </div>
                <div className="p-4 bg-slate-50 rounded-b-xl flex justify-end gap-2">
                    <button 
                        onClick={() => setShowAnecdoteInput(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={() => handleGenerateScript(customAnecdote)}
                        disabled={!customAnecdote.trim()}
                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <Sparkles size={16} />
                        Создать Сценарий
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}