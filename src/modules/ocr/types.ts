export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
}

export interface OCRProgress {
  status: 'loading' | 'initializing' | 'recognizing' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
}

export type OCRError =
  | 'INITIALIZATION_FAILED'
  | 'PROCESSING_FAILED'
  | 'NO_TEXT_FOUND'
  | 'INVALID_IMAGE';
