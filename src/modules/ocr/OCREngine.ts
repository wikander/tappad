import { createWorker, type Worker } from 'tesseract.js';
import type { OCRResult, OCRProgress, OCRError } from './types';

export class OCREngine {
  private worker: Worker | null = null;
  private isInitialized = false;
  private onProgressCallback: ((progress: OCRProgress) => void) | null = null;

  /**
   * Initialize the Tesseract.js worker
   */
  async initialize(onProgress?: (progress: OCRProgress) => void): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    this.onProgressCallback = onProgress || null;

    try {
      this.reportProgress({
        status: 'loading',
        progress: 0,
        message: 'Loading OCR engine...',
      });

      this.worker = await createWorker('eng', 1, {
        logger: (m) => {
          this.handleTesseractLogger(m);
        },
      });

      this.reportProgress({
        status: 'initializing',
        progress: 100,
        message: 'OCR engine ready',
      });

      this.isInitialized = true;
    } catch (error) {
      this.reportProgress({
        status: 'error',
        progress: 0,
        message: 'Failed to initialize OCR engine',
      });
      throw this.createError('INITIALIZATION_FAILED', error);
    }
  }

  /**
   * Recognize text from an image
   */
  async recognizeText(
    image: ImageData | HTMLCanvasElement | HTMLImageElement,
    language = 'eng'
  ): Promise<OCRResult> {
    if (!this.worker || !this.isInitialized) {
      throw new Error('OCR engine not initialized. Call initialize() first.');
    }

    try {
      this.reportProgress({
        status: 'recognizing',
        progress: 0,
        message: 'Processing image...',
      });

      const result = await this.worker.recognize(image);

      this.reportProgress({
        status: 'completed',
        progress: 100,
        message: 'Text extraction complete',
      });

      // Check if any text was found
      if (!result.data.text || result.data.text.trim().length === 0) {
        throw this.createError('NO_TEXT_FOUND');
      }

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        language: language,
      };
    } catch (error) {
      if ((error as Error).name === 'NO_TEXT_FOUND') {
        throw error;
      }

      this.reportProgress({
        status: 'error',
        progress: 0,
        message: 'Failed to process image',
      });
      throw this.createError('PROCESSING_FAILED', error);
    }
  }

  /**
   * Terminate the worker and clean up resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.onProgressCallback = null;
    }
  }

  /**
   * Check if the engine is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }

  /**
   * Handle Tesseract.js logger messages
   */
  private handleTesseractLogger(message: {
    status: string;
    progress: number;
    jobId?: string;
    workerId?: string;
    userJobId?: string;
  }): void {
    const progressMap: Record<string, OCRProgress['status']> = {
      'loading tesseract core': 'loading',
      'initializing tesseract': 'initializing',
      'initialized tesseract': 'initializing',
      'loading language traineddata': 'loading',
      'loaded language traineddata': 'initializing',
      'initializing api': 'initializing',
      'initialized api': 'initializing',
      'recognizing text': 'recognizing',
    };

    const status = progressMap[message.status] || 'recognizing';
    const progress = Math.round(message.progress * 100);

    this.reportProgress({
      status,
      progress,
      message: this.formatProgressMessage(message.status, progress),
    });
  }

  /**
   * Format progress messages for display
   */
  private formatProgressMessage(status: string, progress: number): string {
    const messageMap: Record<string, string> = {
      'loading tesseract core': 'Loading OCR engine',
      'initializing tesseract': 'Initializing',
      'initialized tesseract': 'Ready',
      'loading language traineddata': 'Loading language data',
      'loaded language traineddata': 'Language data loaded',
      'initializing api': 'Starting up',
      'initialized api': 'Ready to process',
      'recognizing text': 'Extracting text',
    };

    const message = messageMap[status] || 'Processing';
    return `${message}... ${progress}%`;
  }

  /**
   * Report progress to the callback
   */
  private reportProgress(progress: OCRProgress): void {
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
  }

  /**
   * Create an error with a specific OCR error type
   */
  private createError(type: OCRError, originalError?: unknown): Error {
    const error = new Error(type);
    error.name = type;

    if (originalError) {
      console.error('OCR Error:', originalError);
    }

    return error;
  }
}
