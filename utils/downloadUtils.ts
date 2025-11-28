import { PanelData, Character, BubblePosition, BubbleShape } from "../types";

// Helper to wrap text into lines and check dimensions
function getLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const width = ctx.measureText(currentLine + " " + words[i]).width;
        if (width < maxWidth) {
            currentLine += " " + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);
    return lines;
}

// This function draws the image and the speech bubbles onto a canvas to create a downloadable image file
export const generateDownloadableImage = async (
  panel: PanelData,
  char1: Character,
  char2: Character
): Promise<string | null> => {
  if (!panel.imageUrl) return null;

  // Ensure font is loaded before drawing
  try {
      await document.fonts.load('16px "Neucha"');
  } catch (e) {
      console.warn("Font loading failed, falling back to sans-serif");
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!ctx) return reject("No Canvas Context");

      // Set canvas to high res (Gemini usually returns 1024x1024)
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw Base Image
      ctx.drawImage(img, 0, 0);

      // --- SCALE FACTORS (To match CSS Preview) ---
      // In CSS (ComicPanel), bubbles are relative to container width (approx 300-400px visible).
      // Here (Canvas), width is 1024px.
      // We must scale all constants (font size, padding, border radius) proportionally.
      
      // Scale Factor: HighRes / ReferencePreviewWidth (approx 320px for mobile/grid)
      const SCALE = canvas.width / 320; 

      // CSS: p-2 (8px). 8 * 3.2 = ~25px
      const PADDING = 8 * SCALE; 
      
      // CSS: rounded-xl (12px). 12 * 3.2 = ~38px
      const RADIUS_XL = 12 * SCALE;
      const RADIUS_SM = 2 * SCALE;
      const RADIUS_THOUGHT = 32 * SCALE;

      // CSS: min-w-[60px]. 60 * 3.2 = 192px
      const MIN_WIDTH = 60 * SCALE;
      
      // Helper for bubble drawing with Auto-Fit
      const drawBubble = (text: string, pos: BubblePosition, shape: BubbleShape, posX?: number, posY?: number) => {
        if (!text.trim()) return;

        // Constraints - Strictly match CSS max-w-[35%]
        const maxBubbleWidth = canvas.width * 0.35; 
        
        // --- FONT SIZE LOGIC (Proportional to CSS logic) ---
        // CSS Logic: 
        // len < 20: text-xs (12px).  12 * SCALE = ~38px
        // len < 50: text-[10px].     10 * SCALE = ~32px
        // else:     text-[9px].      9 * SCALE = ~29px
        
        const len = text.length;
        let fontSize = 29; // Default (Smallest)
        
        if (len < 20) fontSize = 38; // text-xs equivalent
        else if (len < 50) fontSize = 32; // text-[10px] equivalent
        else fontSize = 29; // text-[9px] equivalent

        // Apply Font
        ctx.font = `bold ${Math.floor(fontSize)}px "Neucha", "Comic Sans MS", sans-serif`;
        const lineHeight = fontSize * 1.1; // CSS leading-tight is usually 1.25, but Neucha has large ascenders
        
        // Wrap text based on max width minus padding
        const lines = getLines(ctx, text, maxBubbleWidth - (PADDING * 2));
        
        // Measure actual dimensions
        let textBlockWidth = 0;
        lines.forEach(l => {
            const w = ctx.measureText(l).width;
            if (w > textBlockWidth) textBlockWidth = w;
        });

        const bubbleWidth = Math.max(textBlockWidth + (PADDING * 2), MIN_WIDTH);
        const bubbleHeight = (lines.length * lineHeight) + (PADDING * 2);

        ctx.textBaseline = 'top';

        // Calculate Position X/Y based on percentage
        let x = 30;
        let y = 30;

        if (posX !== undefined && posY !== undefined) {
             x = canvas.width * (posX / 100);
             y = canvas.height * (posY / 100);
        } else {
            // Fallback
             x = 30; y = 30;
        }

        // --- DRAWING THE BUBBLE ---
        
        // Determine Radius based on shape
        let radius = RADIUS_XL;
        if (shape === 'square') radius = RADIUS_SM;
        if (shape === 'thought') radius = RADIUS_THOUGHT;

        // 1. Draw Shadow (CSS: shadow-sm usually small, but here we used shadow-[2px_2px_...])
        // Let's match border-black border (1px CSS -> ~3px Canvas)
        const borderWidth = 1 * SCALE; 
        
        ctx.lineWidth = borderWidth; 

        // Background
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        
        if (shape === 'thought') {
            ctx.setLineDash([5 * SCALE, 3 * SCALE]); // Dashed line for thoughts
        } else {
            ctx.setLineDash([]);
        }

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, bubbleWidth, bubbleHeight, radius);
        } else {
            ctx.rect(x, y, bubbleWidth, bubbleHeight);
        }
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]); // Reset

        // --- DRAWING TAIL (Proportional) ---
        // CSS: w-2.5 h-2.5 (10px). 10 * SCALE = ~32px
        const tailSize = 10 * SCALE; 

        if (shape === 'thought') {
            // Draw Dots (Thought Bubbles)
            const dotSizeL = 8 * SCALE * 0.4; // CSS w-2 is 8px.
            const dotSizeS = 4 * SCALE * 0.4; // CSS w-1 is 4px.
            
            let dotX = 0;
            let dotY = 0;
            
            // Anchor point logic
            if (pos.includes('right')) {
                dotX = x + bubbleWidth - (40 * SCALE * 0.5);
            } else {
                dotX = x + (40 * SCALE * 0.5);
            }

            if (pos.includes('bottom')) {
                 dotY = y - (15 * SCALE * 0.5); // Above bubble
            } else {
                 dotY = y + bubbleHeight + (15 * SCALE * 0.5); // Below bubble
            }

            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#000000";
            
            // Large Dot
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSizeL, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Small Dot (further out)
            const offsetY = pos.includes('bottom') ? -(15 * SCALE * 0.5) : (15 * SCALE * 0.5);
            ctx.beginPath();
            ctx.arc(dotX + (pos.includes('right') ? (10 * SCALE * 0.5) : -(10 * SCALE * 0.5)), dotY + offsetY, dotSizeS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

        } else {
            // Standard Triangle Tail
            // CSS: Absolute positioned, rotated 45deg.
            // Canvas: Drawing a triangle manually is cleaner than rotating context.
            
            ctx.beginPath();
            // Offset from edge (CSS left-4 = 16px) -> 16 * SCALE
            const tailOffset = 16 * SCALE; 
            
            // Tail is drawn from edge of box
            if (pos.includes('bottom')) {
                 // Bubble is BELOW tail. Tail points UP.
                 const tailBaseY = y; 
                 // CSS: -top-2 (8px outside). We draw a triangle sticking out.
                 const tailHeight = 8 * SCALE; 
                 
                 // Simulate the CSS rotated square look (triangle)
                 // Base on bubble
                 const baseX1 = pos.includes('left') ? x + tailOffset : x + bubbleWidth - tailOffset - tailSize;
                 const baseX2 = baseX1 + tailSize;
                 const tipX = pos.includes('left') ? baseX1 : baseX2; // Skewed slightly
                 const tipY = y - tailHeight;

                 ctx.moveTo(baseX1, tailBaseY);
                 ctx.lineTo(tipX, tipY);
                 ctx.lineTo(baseX2, tailBaseY);
            } else {
                 // Bubble is ABOVE tail. Tail points DOWN. (Standard)
                 const tailBaseY = y + bubbleHeight;
                 const tailHeight = 8 * SCALE;

                 const baseX1 = pos.includes('left') ? x + tailOffset : x + bubbleWidth - tailOffset - tailSize;
                 const baseX2 = baseX1 + tailSize;
                 const tipX = pos.includes('left') ? baseX1 : baseX2;
                 const tipY = y + bubbleHeight + tailHeight;

                 ctx.moveTo(baseX1, tailBaseY);
                 ctx.lineTo(tipX, tipY);
                 ctx.lineTo(baseX2, tailBaseY);
            }
            
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            
            // Draw borders only on the outside edges
            ctx.strokeStyle = "#000000";
            // We can't just stroke() because it would draw the line closing the bubble.
            // We need to re-stroke the whole bubble + tail merge, or stroke lines carefully.
            // Simplest hack: Stroke triangle, then fill over the connection.
            ctx.stroke();
            
            // Cover overlap (remove border line inside bubble)
            ctx.fillStyle = "#ffffff";
            const coverH = borderWidth * 2; 
            const coverW = tailSize - (borderWidth * 2);
            
            // We draw a small white rect over the border where tail meets bubble
            const coverX = pos.includes('left') ? x + tailOffset + borderWidth : x + bubbleWidth - tailOffset - tailSize + borderWidth;
            
            if (pos.includes('bottom')) {
                 ctx.fillRect(coverX, y - (coverH/2), coverW, coverH);
            } else {
                 ctx.fillRect(coverX, y + bubbleHeight - (coverH/2), coverW, coverH);
            }
        }

        // Draw Text
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center"; 
        const textCenterX = x + (bubbleWidth / 2);
        
        lines.forEach((line, index) => {
            const lineY = y + PADDING + (index * lineHeight);
            ctx.fillText(line, textCenterX, lineY);
        });
      };

      // Draw Bubbles
      if (panel.char1Dialogue) drawBubble(panel.char1Dialogue, panel.char1BubblePos || 'top-left', panel.char1BubbleShape || 'rounded', panel.char1BubbleX, panel.char1BubbleY);
      if (panel.char2Dialogue) drawBubble(panel.char2Dialogue, panel.char2BubblePos || 'top-right', panel.char2BubbleShape || 'rounded', panel.char2BubbleX, panel.char2BubbleY);

      // --- WATERMARK ---
      const wmFontSize = 14 * SCALE;
      ctx.font = `bold ${Math.floor(wmFontSize)}px sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      
      // Add a slight drop shadow for contrast against bright backgrounds
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      
      ctx.fillText("@tipmarketolog", canvas.width - (10 * SCALE), canvas.height - (10 * SCALE));
      
      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = panel.imageUrl;
  });
};