export interface MediaDeviceInfoSimple {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput';
}

export function checkSecureContext(): { isSecure: boolean; hasMediaDevices: boolean } {
  const isSecure = window.isSecureContext;
  const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  console.log('[MediaHelper] SecureContext:', isSecure, '| mediaDevices available:', hasMediaDevices);
  return { isSecure, hasMediaDevices };
}

export async function getAvailableMediaDevices(): Promise<{
  cameras: MediaDeviceInfoSimple[];
  microphones: MediaDeviceInfoSimple[];
}> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return { cameras: [], microphones: [] };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras: MediaDeviceInfoSimple[] = [];
    const microphones: MediaDeviceInfoSimple[] = [];

    devices.forEach((d) => {
      if (d.kind === 'videoinput') {
        cameras.push({
          deviceId: d.deviceId,
          label: d.label || `Camera ${cameras.length + 1}`,
          kind: 'videoinput'
        });
      } else if (d.kind === 'audioinput') {
        microphones.push({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${microphones.length + 1}`,
          kind: 'audioinput'
        });
      }
    });

    return { cameras, microphones };
  } catch (err) {
    console.warn('[MediaHelper] enumerateDevices warning:', err);
    return { cameras: [], microphones: [] };
  }
}

export async function startLocalMedia({
  isVideo = true,
  cameraDeviceId,
  micDeviceId
}: {
  isVideo?: boolean;
  cameraDeviceId?: string;
  micDeviceId?: string;
}): Promise<MediaStream> {
  const { hasMediaDevices } = checkSecureContext();
  if (!hasMediaDevices) {
    throw new Error('Camera and microphone access is not supported in this browser or unsecure context.');
  }

  // Build constraints
  const videoConstraints: boolean | MediaTrackConstraints = isVideo
    ? cameraDeviceId
      ? { deviceId: { exact: cameraDeviceId } }
      : { width: { ideal: 1280 }, height: { ideal: 720 } }
    : false;

  const audioConstraints: boolean | MediaTrackConstraints = micDeviceId
    ? { deviceId: { exact: micDeviceId } }
    : true;

  try {
    console.log('[MediaHelper] Requesting getUserMedia with constraints:', { video: videoConstraints, audio: audioConstraints });
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: audioConstraints
    });
    return stream;
  } catch (error: any) {
    console.error('[MediaHelper] getUserMedia Primary Constraints Failed:', {
      name: error.name,
      message: error.message,
      constraint: error.constraint
    });

    // Fallback 1: Try basic constraints without ideal width/height or exact deviceIds
    try {
      console.log('[MediaHelper] Retrying with basic fallback constraints...');
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        video: isVideo ? true : false,
        audio: true
      });
      return fallbackStream;
    } catch (fallbackErr: any) {
      console.error('[MediaHelper] Basic Fallback Failed:', {
        name: fallbackErr.name,
        message: fallbackErr.message
      });
      // Throw original detailed error for UI handling
      throw error;
    }
  }
}
