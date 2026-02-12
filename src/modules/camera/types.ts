export interface CameraConfig {
  video: {
    facingMode: 'user' | 'environment';
    width?: { ideal: number };
    height?: { ideal: number };
  };
}

export interface CameraState {
  stream: MediaStream | null;
  isActive: boolean;
  deviceId: string | null;
}

export type CameraError =
  | 'NO_CAMERA'
  | 'PERMISSION_DENIED'
  | 'NOT_SUPPORTED'
  | 'DEVICE_ERROR';
