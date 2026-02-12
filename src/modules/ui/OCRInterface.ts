import { CameraManager } from '../camera/CameraManager';
import { OCREngine } from '../ocr/OCREngine';
import type { OCRResult, OCRProgress } from '../ocr/types';
import { getErrorMessage, isAppError } from '../../utils/errors';

export class OCRInterface {
  private container: HTMLElement;
  private cameraManager: CameraManager;
  private ocrEngine: OCREngine;
  private capturedImageData: ImageData | null = null;
  private lastResult: OCRResult | null = null;
  private isStartingCamera = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.cameraManager = new CameraManager();
    this.ocrEngine = new OCREngine();
  }

  /**
   * Initialize the OCR interface
   */
  async initialize(): Promise<void> {
    this.renderIdleView();
  }

  /**
   * Render the idle state view
   */
  private renderIdleView(): void {
    this.container.innerHTML = `
      <div class="ocr-container">
        <h1>Tappad OCR</h1>
        <p>Extract text from photos using your camera</p>
        <button id="start-camera" class="primary-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          Start Camera
        </button>
      </div>
    `;

    this.attachIdleEventListeners();
  }

  /**
   * Render the camera view
   */
  private renderCameraView(): void {
    this.container.innerHTML = `
      <div class="ocr-container">
        <div class="camera-container">
          <video class="video-preview" autoplay playsinline></video>
        </div>
        <div class="button-group">
          <button id="capture-photo" class="primary-button">Capture Photo</button>
          <button id="cancel-camera" class="secondary-button">Cancel</button>
        </div>
      </div>
    `;

    this.attachCameraEventListeners();
  }

  /**
   * Render the captured photo view
   */
  private renderCapturedView(): void {

    if (!this.capturedImageData) {
      this.renderError('No image captured');
      return;
    }

    // Create a canvas to display the captured image
    const canvas = document.createElement('canvas');
    canvas.width = this.capturedImageData.width;
    canvas.height = this.capturedImageData.height;
    const context = canvas.getContext('2d');

    if (context) {
      context.putImageData(this.capturedImageData, 0, 0);
    }

    this.container.innerHTML = `
      <div class="ocr-container">
        <div class="captured-container">
          <canvas class="capture-canvas"></canvas>
        </div>
        <div class="button-group">
          <button id="process-ocr" class="primary-button">Process with OCR</button>
          <button id="retake-photo" class="secondary-button">Retake</button>
        </div>
      </div>
    `;

    // Copy the image to the canvas in the DOM
    const displayCanvas = this.container.querySelector<HTMLCanvasElement>('.capture-canvas');
    if (displayCanvas && context) {
      displayCanvas.width = canvas.width;
      displayCanvas.height = canvas.height;
      const displayContext = displayCanvas.getContext('2d');
      if (displayContext) {
        displayContext.drawImage(canvas, 0, 0);
      }
    }

    this.attachCapturedEventListeners();
  }

  /**
   * Render the processing view
   */
  private renderProcessingView(): void {
    this.container.innerHTML = `
      <div class="ocr-container">
        <div class="processing-container">
          <div class="loading-spinner"></div>
          <p id="progress-message">Initializing OCR...</p>
          <p id="progress-percent">0%</p>
        </div>
      </div>
    `;
  }

  /**
   * Render the results view
   */
  private renderResultsView(): void {

    if (!this.lastResult) {
      this.renderError('No OCR results available');
      return;
    }

    this.container.innerHTML = `
      <div class="ocr-container">
        <h2>Extracted Text</h2>
        <div class="results-info">
          <span>Confidence: ${Math.round(this.lastResult.confidence)}%</span>
        </div>
        <textarea class="results-area" readonly>${this.lastResult.text}</textarea>
        <div class="button-group">
          <button id="copy-text" class="primary-button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy Text
          </button>
          <button id="scan-again" class="secondary-button">Scan Again</button>
        </div>
      </div>
    `;

    this.attachResultsEventListeners();
  }

  /**
   * Render an error message
   */
  private renderError(errorMessage: string): void {
    this.container.innerHTML = `
      <div class="ocr-container">
        <div class="error-message">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2>Error</h2>
          <p>${errorMessage}</p>
        </div>
        <button id="retry" class="primary-button">Try Again</button>
      </div>
    `;

    const retryBtn = this.container.querySelector('#retry');
    retryBtn?.addEventListener('click', () => this.handleReset());
  }

  /**
   * Update progress during OCR processing
   */
  private updateProgress(progress: OCRProgress): void {
    const messageEl = this.container.querySelector<HTMLParagraphElement>('#progress-message');
    const percentEl = this.container.querySelector<HTMLParagraphElement>('#progress-percent');

    if (messageEl) {
      messageEl.textContent = progress.message;
    }

    if (percentEl) {
      percentEl.textContent = `${progress.progress}%`;
    }
  }

  // Event Handlers

  private attachIdleEventListeners(): void {
    const startBtn = this.container.querySelector('#start-camera');
    startBtn?.addEventListener('click', () => this.handleStartCamera());
  }

  private attachCameraEventListeners(): void {
    const captureBtn = this.container.querySelector('#capture-photo');
    const cancelBtn = this.container.querySelector('#cancel-camera');

    captureBtn?.addEventListener('click', () => this.handleCapture());
    cancelBtn?.addEventListener('click', () => this.handleCancel());
  }

  private attachCapturedEventListeners(): void {
    const processBtn = this.container.querySelector('#process-ocr');
    const retakeBtn = this.container.querySelector('#retake-photo');

    processBtn?.addEventListener('click', () => this.handleProcessOCR());
    retakeBtn?.addEventListener('click', () => this.handleRetake());
  }

  private attachResultsEventListeners(): void {
    const copyBtn = this.container.querySelector('#copy-text');
    const scanAgainBtn = this.container.querySelector('#scan-again');

    copyBtn?.addEventListener('click', () => this.handleCopyText());
    scanAgainBtn?.addEventListener('click', () => this.handleReset());
  }

  /**
   * Handle start camera button click
   */
  private async handleStartCamera(): Promise<void> {
    // Prevent multiple simultaneous calls
    if (this.isStartingCamera) {
      console.log('Camera start already in progress, ignoring duplicate call');
      return;
    }

    this.isStartingCamera = true;

    try {
      // Check camera availability first
      const isAvailable = await this.cameraManager.checkCameraAvailability();
      if (!isAvailable) {
        this.renderError(
          'No camera detected. Please ensure your device has a camera and try again.'
        );
        return;
      }

      // Render camera view
      this.renderCameraView();

      // Wait a brief moment for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Find video element first
      const video = this.container.querySelector<HTMLVideoElement>('.video-preview');
      console.log('Video element found:', video);

      if (!video) {
        console.error('Container contents:', this.container.innerHTML);
        throw new Error('Video element not found in DOM');
      }

      // Request camera access (try back camera first, fallback to front if not available)
      try {
        await this.cameraManager.requestCameraAccess({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (error) {
        // Fallback to front camera if back camera not available
        console.log('Back camera not available, trying front camera...');
        await this.cameraManager.requestCameraAccess({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      }

      console.log('Attaching camera to video element...');
      this.cameraManager.attachToVideoElement(video);
      console.log('Camera attached successfully');
    } catch (error) {
      const message = isAppError(error) ? getErrorMessage(error) : 'Failed to start camera';
      this.renderError(message);
      this.cameraManager.stopCamera();
    } finally {
      this.isStartingCamera = false;
    }
  }

  /**
   * Handle capture photo button click
   */
  private handleCapture(): void {
    try {
      this.capturedImageData = this.cameraManager.capturePhoto();
      this.cameraManager.stopCamera();
      this.renderCapturedView();
    } catch (error) {
      console.error('Capture error:', error);
      this.renderError('Failed to capture photo. Please try again.');
    }
  }

  /**
   * Handle cancel camera button click
   */
  private handleCancel(): void {
    this.cameraManager.stopCamera();
    this.renderIdleView();
  }

  /**
   * Handle retake photo button click
   */
  private handleRetake(): void {
    this.capturedImageData = null;
    this.handleStartCamera();
  }

  /**
   * Handle process OCR button click
   */
  private async handleProcessOCR(): Promise<void> {
    if (!this.capturedImageData) {
      this.renderError('No image to process');
      return;
    }

    try {
      this.renderProcessingView();

      // Initialize OCR engine if not already initialized
      if (!this.ocrEngine.isReady()) {
        await this.ocrEngine.initialize((progress) => {
          this.updateProgress(progress);
        });
      }

      // Convert ImageData to Canvas for better Tesseract.js compatibility
      const canvas = document.createElement('canvas');
      canvas.width = this.capturedImageData.width;
      canvas.height = this.capturedImageData.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }

      ctx.putImageData(this.capturedImageData, 0, 0);

      // Perform OCR on the canvas
      const result = await this.ocrEngine.recognizeText(canvas);
      this.lastResult = result;

      // Show results
      this.renderResultsView();
    } catch (error) {
      const message = isAppError(error) ? getErrorMessage(error) : 'OCR processing failed';
      this.renderError(message);
    }
  }

  /**
   * Handle copy text button click
   */
  private async handleCopyText(): Promise<void> {
    if (!this.lastResult) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.lastResult.text);

      // Visual feedback
      const copyBtn = this.container.querySelector('#copy-text');
      if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓ Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy text:', error);
      alert('Failed to copy text to clipboard');
    }
  }

  /**
   * Handle reset/scan again
   */
  private handleReset(): void {
    this.capturedImageData = null;
    this.lastResult = null;
    this.renderIdleView();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.cameraManager.stopCamera();
    await this.ocrEngine.terminate();
  }
}
