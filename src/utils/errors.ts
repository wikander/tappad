import type { CameraError } from '../modules/camera/types';
import type { OCRError } from '../modules/ocr/types';

type AppError = CameraError | OCRError;

export const ERROR_MESSAGES: Record<AppError, string> = {
  // Camera errors
  NO_CAMERA: 'No camera detected. Please connect a camera and try again.',
  PERMISSION_DENIED:
    'Camera access denied. Please allow camera access in your browser settings and refresh the page.',
  NOT_SUPPORTED:
    "Your browser doesn't support camera access. Please use Chrome, Firefox, Safari, or Edge.",
  DEVICE_ERROR: 'Camera error occurred. Please check your camera and try again.',

  // OCR errors
  INITIALIZATION_FAILED: 'Failed to initialize OCR. Please refresh the page and try again.',
  PROCESSING_FAILED: 'Failed to process image. Please try again with a different image.',
  NO_TEXT_FOUND:
    'No text found in the image. Try capturing a clearer image with better lighting and visible text.',
  INVALID_IMAGE: 'Invalid image format. Please capture a new photo.',
};

export function getErrorMessage(error: Error | AppError): string {
  // If it's an Error object, use its name as the error type
  const errorType = typeof error === 'string' ? error : (error.name as AppError);

  return ERROR_MESSAGES[errorType] || 'An unexpected error occurred. Please try again.';
}

export function isAppError(error: unknown): error is AppError {
  if (typeof error === 'string') {
    return error in ERROR_MESSAGES;
  }

  if (error instanceof Error) {
    return error.name in ERROR_MESSAGES;
  }

  return false;
}
