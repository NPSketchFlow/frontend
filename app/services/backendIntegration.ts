/**
 * Backend Integration Service
 * Connects voice chat components with the Java NIO backend
 */

import axios from 'axios';
import udpService from './udpService';

// Backend configuration
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080/api';
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE || 'ws://localhost:8080';

export interface BackendConfig {
  apiBase: string;
  wsBase: string;
  timeout: number;
}

export const backendConfig: BackendConfig = {
  apiBase: API_BASE,
  wsBase: WS_BASE,
  timeout: 10000,
};

/**
 * Initialize backend connection
 */
export async function initializeBackend(userId: string): Promise<void> {
  try {
    console.log('[Backend] Initializing connection...', { userId, apiBase: API_BASE });

    // Test REST API connection
    const healthCheck = await axios.get(`${API_BASE}/health`, {
      timeout: 5000,
    }).catch(() => null);

    if (healthCheck) {
      console.log('[Backend] REST API is reachable');
    } else {
      console.warn('[Backend] REST API is not reachable, using fallback mode');
    }

    // Initialize WebSocket/UDP connection
    try {
      await udpService.connect(userId);
      console.log('[Backend] WebSocket/UDP connected');
    } catch (error) {
      console.warn('[Backend] WebSocket/UDP connection failed, using HTTP fallback', error);
    }

    return Promise.resolve();
  } catch (error) {
    console.error('[Backend] Initialization failed:', error);
    throw error;
  }
}

/**
 * Upload voice message to backend
 */
export async function uploadVoiceToBackend(
  audioBlob: Blob,
  senderId: string,
  receiverId?: string
): Promise<{ fileId: string; url: string }> {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, `voice-${Date.now()}.webm`);
    formData.append('senderId', senderId);
    if (receiverId) {
      formData.append('receiverId', receiverId);
    }

    console.log('[Backend] Uploading voice message...', {
      size: audioBlob.size,
      senderId,
      receiverId,
    });

    const response = await axios.post(`${API_BASE}/voice/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        console.log('[Backend] Upload progress:', percentCompleted, '%');
      },
    });

    console.log('[Backend] Voice message uploaded successfully:', response.data);

    return {
      fileId: response.data.fileId || response.data.id,
      url: response.data.url || `${API_BASE}/voice/download/${response.data.fileId}`,
    };
  } catch (error) {
    console.error('[Backend] Voice upload failed:', error);
    throw error;
  }
}

/**
 * Send notification to users
 */
export async function sendNotificationToBackend(
  type: string,
  payload: Record<string, unknown>,
  priority: number = 1
): Promise<void> {
  try {
    await axios.post(`${API_BASE}/notifications/send`, {
      type,
      payload,
      priority,
    });
    console.log('[Backend] Notification sent:', { type, payload });
  } catch (error) {
    console.error('[Backend] Notification send failed:', error);
    throw error;
  }
}

/**
 * Get online users from backend
 */
export async function getOnlineUsersFromBackend(): Promise<
  Array<{
    id: string;
    name: string;
    status: string;
    lastSeen?: string;
  }>
> {
  try {
    const response = await axios.get(`${API_BASE}/online-users`);
    console.log('[Backend] Online users fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('[Backend] Failed to fetch online users:', error);
    return [];
  }
}

/**
 * Download voice message from backend
 */
export async function downloadVoiceFromBackend(fileId: string): Promise<Blob> {
  try {
    const response = await axios.get(`${API_BASE}/voice/download/${fileId}`, {
      responseType: 'blob',
    });
    console.log('[Backend] Voice message downloaded:', fileId);
    return response.data;
  } catch (error) {
    console.error('[Backend] Voice download failed:', error);
    throw error;
  }
}

/**
 * Test backend connection
 */
export async function testBackendConnection(): Promise<{
  restApi: boolean;
  websocket: boolean;
  details: Record<string, unknown>;
}> {
  const result = {
    restApi: false,
    websocket: false,
    details: {} as Record<string, unknown>,
  };

  // Test REST API
  try {
    const response = await axios.get(`${API_BASE}/health`, {
      timeout: 5000,
    });
    result.restApi = true;
    result.details.restApi = response.data;
    console.log('[Backend] REST API test: SUCCESS', response.data);
  } catch (error) {
    console.error('[Backend] REST API test: FAILED', error);
    result.details.restApiError = error instanceof Error ? error.message : String(error);
  }

  // Test WebSocket
  try {
    const wsUrl = `${WS_BASE}/udp?userId=test-user`;
    const ws = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        result.websocket = true;
        result.details.websocket = 'Connected';
        console.log('[Backend] WebSocket test: SUCCESS');
        ws.close();
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('[Backend] WebSocket test: FAILED', error);
        result.details.websocketError = 'Connection failed';
        reject(error);
      };
    });
  } catch (error) {
    console.error('[Backend] WebSocket test: FAILED', error);
    result.details.websocketError = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Check if backend is available
 */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    await axios.get(`${API_BASE}/health`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export default {
  initialize: initializeBackend,
  uploadVoice: uploadVoiceToBackend,
  sendNotification: sendNotificationToBackend,
  getOnlineUsers: getOnlineUsersFromBackend,
  downloadVoice: downloadVoiceFromBackend,
  testConnection: testBackendConnection,
  isAvailable: isBackendAvailable,
  config: backendConfig,
};
