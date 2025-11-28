import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Character, ComicStyle, PanelData } from "../types";

// Helper to ensure we have a valid client with the latest key
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to detect 429/Quota errors
const isQuotaError = (error: any): boolean => {
    const msg = (error.message || '').toLowerCase();
    const str = JSON.stringify(error).toLowerCase();
    return (
        msg.includes("429") || 
        msg.includes("quota") || 
        msg.includes("resource_exhausted") ||
        str.includes("429") ||
        str.includes("resource_exhausted")
    );
};

const STYLE_PROMPTS: Record<ComicStyle, string> = {
  modern: "Modern American comic book style, digital coloring, highly detailed, sharp focus, vibrant colors.",
  manga: "Manga style, intricate ink lines, dynamic screening, high contrast black and white (or muted colors), detailed background.",
  anime: "Anime art style, cel shaded, vibrant colors, clean lines, high quality illustration, studio ghibli inspired.",
  retro: "Vintage 1950s comic book style, halftime dot pattern, bold outlines, retro color palette, slightly distressed paper texture.",
  grayscale: "Noir comic style, high contrast black and white, dramatic lighting, heavy shadows, ink wash style.",
  cinematic: "Cinematic photorealistic style, 4k resolution, shallow depth of field, dramatic lighting, movie still.",
  pixel_art: "Pixel art style, 16-bit aesthetic, vibrant colors, retro video game look, sharp blocky edges.",
  watercolor: "Watercolor painting style, soft edges, pastel colors, artistic, paper texture visible, hand-painted look.",
  oil_painting: "Classic oil painting style, visible brushstrokes, rich textures, deep colors, impressionistic lighting.",
  '3d_render': "3D cartoon render style, Pixar/Disney animation style, soft lighting, occlusion, cute proportions, high fidelity.",
  sketch: "Pencil sketch style, graphite textures, rough lines, hatching, artistic, monochrome or sepia.",
  cyberpunk: "Cyberpunk aesthetic, neon lights, high contrast, futuristic, dark background with bright accents, glitch effects.",
  ukiyo_e: "Ukiyo-e style, traditional Japanese woodblock print, flat perspective, bold outlines, textured paper, muted natural colors."
};

// Interface for the script generation response
interface ScriptResponse {
  title: string;
  char1: { name: string; appearance: string };
  char2: { name: string; appearance: string };
  panels: Array<{
    setting: string;
    char1Action: string;
    char1Dialogue: string;
    char2Action: string;
    char2Dialogue: string;
  }>;
}

export const generateComicScript = async (panelCount: number | null, sourceText?: string): Promise<ScriptResponse> => {
  const ai = getAiClient();

  let systemInstruction = `You are a professional comic script writer. `;
  let prompt = "";

  // Dynamic panel count instruction
  const panelInstruction = panelCount 
    ? `exactly ${panelCount} panels` 
    : `an optimal number of panels (between 2 and 9) to best tell the story`;

  if (sourceText) {
      systemInstruction += `Your task is to adapt the provided text (anecdote or story) into a comic script. 
The script must be in RUSSIAN.
You must strictly follow the JSON schema provided.`;
      
      prompt = `
        Create a comic script with ${panelInstruction} based on the following text:
        "${sourceText}"
        
        1. Define 2 characters (Character 1 and Character 2) that best fit the story.
        2. Split the story into panels.
        3. For each panel, provide:
           - Setting (Background description)
           - Action for Character 1
           - Dialogue for Character 1 (if silent, use empty string "")
           - Action for Character 2
           - Dialogue for Character 2 (if silent, use empty string "")
      `;
  } else {
      systemInstruction += `Your task is to recall a funny, classic Russian anecdote (strictly PG-13 / Family Friendly, no offensive content) and adapt it into a comic script.
The script must be in RUSSIAN.
You must strictly follow the JSON schema provided.`;

      prompt = `
        Create a comic script with ${panelInstruction} based on a funny Russian anecdote.
        
        1. Define 2 characters (Character 1 and Character 2) with visual descriptions.
        2. Split the anecdote into panels.
        3. For each panel, provide:
           - Setting (Background description)
           - Action for Character 1
           - Dialogue for Character 1 (if silent, use empty string "")
           - Action for Character 2
           - Dialogue for Character 2 (if silent, use empty string "")
      `;
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Название комикса (тема анекдота)" },
      char1: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          appearance: { type: Type.STRING, description: "Visual description for image generator" }
        },
        required: ["name", "appearance"]
      },
      char2: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          appearance: { type: Type.STRING, description: "Visual description for image generator" }
        },
        required: ["name", "appearance"]
      },
      panels: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            setting: { type: Type.STRING },
            char1Action: { type: Type.STRING },
            char1Dialogue: { type: Type.STRING },
            char2Action: { type: Type.STRING },
            char2Dialogue: { type: Type.STRING }
          },
          // IMPORTANT: Require all fields to ensure the model outputs empty strings for silence instead of omitting keys
          required: ["setting", "char1Action", "char2Action", "char1Dialogue", "char2Dialogue"]
        }
      }
    },
    required: ["title", "char1", "char2", "panels"]
  };

  // RETRY LOOP FOR SCRIPT GENERATION
  let attempts = 0;
  const maxAttempts = 5; // Increased attempts

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schema,
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }
          ]
        },
      });

      const text = response.text;
      if (!text) {
        if (response.candidates?.[0]?.finishReason) {
          console.error("Finish Reason:", response.candidates[0].finishReason);
          if (response.candidates[0].finishReason === "PROHIBITED_CONTENT" || response.candidates[0].finishReason === "SAFETY") {
            throw new Error("Content blocked by safety filters. Please try a different topic or anecdote.");
          }
        }
        throw new Error("Empty response from AI (possibly blocked or schema error)");
      }
      
      return JSON.parse(text) as ScriptResponse;

    } catch (error: any) {
      // Handle Quota Errors with Aggressive Retry
      if (isQuotaError(error)) {
          console.warn(`Script Gen Quota Error on attempt ${attempts}. Waiting...`);
          if (attempts === maxAttempts) {
              throw new Error("API Quota Exceeded. You are generating too fast. Please wait 1-2 minutes and try again.");
          }
          // Backoff: 10s, 20s, 30s, 40s
          const waitTime = 10000 * attempts;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
      }
      
      // Handle other retryable server errors
      if (error.status === 500 || error.status === 503) {
           if (attempts < maxAttempts) {
               await new Promise(resolve => setTimeout(resolve, 3000));
               continue;
           }
      }

      console.error("Script Generation Error:", error);
      throw error;
    }
  }
  throw new Error("Failed to generate script after multiple attempts.");
};

export const generatePanelImage = async (
  char1: Character,
  char2: Character,
  char1Action: string,
  char2Action: string,
  setting: string,
  globalSetting: string,
  panelIndex: number,
  style: ComicStyle,
  seed: number,
  referenceImageUrl?: string
): Promise<string> => {
  const ai = getAiClient();

  // Combine global and local setting
  const sceneDescription = setting && setting.trim() !== "" 
    ? `${globalSetting ? globalSetting + ". " : ""}${setting}` 
    : globalSetting || "Generic abstract background";

  // Construct a prompt that enforces consistency and style
  let prompt = `${STYLE_PROMPTS[style] || STYLE_PROMPTS['modern']} \n`;
  prompt += `Global Location: ${sceneDescription}. \n\n`;
  
  // Character 1
  prompt += `CHARACTER 1 (${char1.name}): ${char1.appearance}. \n`;
  if (char1Action.trim()) {
    prompt += `Action: ${char1Action}. \n`;
  } else {
    prompt += `Action: Standing naturally, listening or observing. \n`;
  }

  // Character 2
  prompt += `CHARACTER 2 (${char2.name}): ${char2.appearance}. \n`;
  if (char2Action.trim()) {
    prompt += `Action: ${char2Action}. \n`;
  } else if (!char1Action.trim() && !char2Action.trim()) {
      prompt += `Action: Standing naturally. \n`;
  }

  // Layout instructions to ensure bubbles don't cover faces
  prompt += `\nCOMPOSITION: \n`;
  prompt += `1. FRAMING: Medium-Wide Shot. \n`;
  prompt += `2. SPACE: Leave upper 30% empty for speech bubbles.\n`;
  prompt += `3. Don't crop heads.\n`;
  prompt += `4. No text in artwork.\n`;
  
  // Consistency Instructions
  if (referenceImageUrl) {
    prompt += `5. CONSISTENCY (CRITICAL): A reference image (Panel 1) is provided. \n`;
    prompt += `   - CHARACTERS: Draw characters EXACTLY as shown in the reference (same clothes, hair, features).\n`;
    prompt += `   - BACKGROUND: You MUST reuse the same background/location from the reference image. Match colors, walls, and style exactly. \n`;
  } else {
    prompt += `5. CONSISTENCY: Use the exact visual descriptions provided above for Character 1 and Character 2.\n`;
  }

  const parts: any[] = [];

  // Attach reference image if provided (to maintain consistency with Panel 1)
  if (referenceImageUrl) {
      // Safe split for base64
      const matches = referenceImageUrl.match(/^data:image\/([a-zA-Z]*);base64,([^\"]*)$/);
      const base64Data = matches ? matches[2] : referenceImageUrl.split(',')[1];
      
      if (base64Data) {
            parts.push({
              inlineData: {
                  mimeType: "image/png",
                  data: base64Data
              }
          });
      }
  }
  
  // Add prompt text
  parts.push({ text: prompt });

  let attempts = 0;
  // Significantly increased max attempts for robust Quota handling (free tier often limits heavily)
  const maxAttempts = 8;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: parts,
        },
        config: {
          // Use seed for consistency across panels
          seed: seed,
          imageConfig: {
              aspectRatio: "1:1",
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }
          ]
        },
      });

      const candidate = response.candidates?.[0];

      if (!candidate) {
          throw new Error("No candidates returned from API.");
      }
      
      const finishReason = candidate.finishReason;

      // SUCCESS CASE
      if (finishReason === "STOP") {
          // Extract Image
           if (candidate.content?.parts) {
              for (const part of candidate.content.parts) {
                  if (part.inlineData) {
                      return `data:image/png;base64,${part.inlineData.data}`;
                  }
              }
          }
      }

      // FAILURE CASES (Immediate Throw)
      if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT") {
          throw new Error("Image generation blocked by safety filters. Try adjusting the prompt or character description.");
      }
      
      if (finishReason === "RECITATION") {
          throw new Error("Image generation blocked due to potential copyright/recitation.");
      }

      // Check for Text Refusal (often disguised as STOP or OTHER)
      let textOutput = "";
       if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
              if (part.text) textOutput += part.text;
          }
      }
      if (textOutput && textOutput.trim().length > 0) {
           throw new Error(`AI returned text instead of image: "${textOutput.substring(0, 100)}..."`);
      }

      // RETRYABLE ERRORS (IMAGE_OTHER, OTHER, or just unknown)
      console.warn(`Attempt ${attempts} failed with reason: ${finishReason}`);
      
      if (attempts === maxAttempts) {
         throw new Error(`No image data received from API. (Finish Reason: ${finishReason || 'Unknown'})`);
      }
      
      // Wait before retry (standard backoff)
      await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      continue;

    } catch (error: any) {
      // 1. Check for Quota/Rate Limits
      if (isQuotaError(error)) {
          console.warn(`Quota limit hit on attempt ${attempts}. Pausing significantly...`);
          if (attempts === maxAttempts) {
              throw new Error("API Quota Exceeded. You are generating too fast. Please wait 1-2 minutes and try again.");
          }
          // Very Aggressive Wait for images: 15s + 5s per attempt
          // If free tier is 2 RPM, we need to wait at least 30s.
          const waitTime = 15000 + (attempts * 5000); 
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
      }

      // 2. If it's a specific fatal error we threw, rethrow it
      if (error.message.includes("blocked by safety") || error.message.includes("AI returned text")) {
          throw error;
      }
      
      console.error(`Attempt ${attempts} Error:`, error);
      
      if (attempts === maxAttempts) {
          throw error;
      }
      // Standard Backoff
      await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
    }
  }

  throw new Error("Unexpected error in image generation loop");
};