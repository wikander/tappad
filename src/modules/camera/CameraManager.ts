import type { CameraConfig, CameraState, CameraError } from './types';

export class CameraManager {
  private state: CameraState = {
    stream: null,
    isActive: false,
    deviceId: null,
  };

  private videoElement: HTMLVideoElement | null = null;

  /**
   * Check if camera API is available in the browser
   */
  async checkCameraAvailability(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      return videoDevices.length > 0;
    } catch (error) {
      console.error('Error checking camera availability:', error);
      return false;
    }
  }

  /**
   * Request camera access with the specified configuration
   */
  async requestCameraAccess(config: CameraConfig): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw this.createError('NOT_SUPPORTED');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(config);
      this.state.stream = stream;
      this.state.isActive = true;

      // Get device ID from the stream
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        this.state.deviceId = videoTrack.getSettings().deviceId || null;
      }

      return stream;
    } catch (error) {
      throw this.createError(this.handleStreamError(error as Error));
    }
  }

  /**
   * Attach the camera stream to a video element
   */
  attachToVideoElement(video: HTMLVideoElement): void {
    if (!this.state.stream) {
      throw new Error('No active camera stream');
    }

    this.videoElement = video;
    video.srcObject = this.state.stream;
    video.play().catch((error) => {
      console.error('Error playing video:', error);
    });
  }

  /**
   * Capture a photo from the current video stream
   */
  capturePhoto(): ImageData {
    if (!this.videoElement) {
      throw new Error('No video element attached');
    }

    if (!this.state.stream || !this.state.isActive) {
      throw new Error('Camera is not active');
    }

    // Create a canvas to capture the frame
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    // Draw the current video frame to the canvas
    context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

    // Get the image data
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Get the current video element dimensions
   */
  getVideoDimensions(): { width: number; height: number } | null {
    if (!this.videoElement) {
      return null;
    }

    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
    };
  }

  /**
   * Stop the camera and clean up resources
   */
  stopCamera(): void {
    if (this.state.stream) {
      this.state.stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.state.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.state.isActive = false;
    this.state.deviceId = null;
  }

  /**
   * Get the current camera state
   */
  getState(): Readonly<CameraState> {
    return { ...this.state };
  }

  /**
   * Check if camera is currently active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Handle stream-related errors and categorize them
   */
  private handleStreamError(error: Error): CameraError {
    const errorName = error.name;

    switch (errorName) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'PERMISSION_DENIED';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'NO_CAMERA';
      case 'NotSupportedError':
        return 'NOT_SUPPORTED';
      default:
        console.error('Camera error:', error);
        return 'DEVICE_ERROR';
    }
  }

  /**
   * Create an error with a specific camera error type
   */
  private createError(type: CameraError): Error {
    const error = new Error(type);
    error.name = type;
    return error;
  }
}
