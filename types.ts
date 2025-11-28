export enum PanelCount {
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  NINE = 9
}

export type ComicStyle = 
  | 'modern' 
  | 'manga' 
  | 'anime' 
  | 'retro' 
  | 'grayscale' 
  | 'cinematic' 
  | 'pixel_art' 
  | 'watercolor' 
  | 'oil_painting' 
  | '3d_render' 
  | 'sketch' 
  | 'cyberpunk' 
  | 'ukiyo_e';

export type BubblePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type BubbleShape = 'rounded' | 'square' | 'thought';

export interface Character {
  id: string;
  name: string;
  appearance: string; // Global description
  color: string; // For UI identification
}

export interface PanelData {
  id: string;
  index: number;
  // Local actions for this specific panel
  char1Action: string;
  char1Dialogue: string;
  char1BubblePos: BubblePosition; // Determines Tail Orientation
  char1BubbleShape: BubbleShape;
  char1BubbleX: number; // Percentage 0-100
  char1BubbleY: number; // Percentage 0-100
  
  char2Action: string;
  char2Dialogue: string;
  char2BubblePos: BubblePosition; // Determines Tail Orientation
  char2BubbleShape: BubbleShape;
  char2BubbleX: number; // Percentage 0-100
  char2BubbleY: number; // Percentage 0-100
  
  setting: string; // Optional specific setting for this panel
  
  // Generation state
  imageUrl?: string;
  isLoading: boolean;
  error?: string;
}

export interface ComicState {
  title: string;
  style: ComicStyle;
  panelCount: PanelCount | number; // Relaxed to number to allow AI to choose
  char1: Character;
  char2: Character;
  globalSetting: string; // Shared location description
  seed: number; // For consistent generation style
  panels: PanelData[];
}