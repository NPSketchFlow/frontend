import { useEffect, useMemo, useState } from 'react';
import { getWSClient } from '../services/wsClient';
import type { User } from '../types/voice-chat.types';

export interface OnlineUserInfo {
  userId: string;
  username: string;
  status: 'online' | 'offline' | 'away';
  lastActive?: string | null;
}

export function useVoiceWebSocket(userId: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserInfo[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const wsUrl = useMemo(() => {
    if (!userId) return null;
    const base = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080/api';
    const url = base.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws/voice?userId=' + encodeURIComponent(userId);
    return url;
  }, [userId]);

  useEffect(() => {
    if (!wsUrl) return;
    const client = getWSClient(wsUrl);

    const off = client.onMessage((data) => {
      if (!data || typeof data.type !== 'string') return;

      switch (data.type) {
        case 'ONLINE_USERS':
          if (Array.isArray(data.users)) {
            setOnlineUsers(data.users.map((u: any) => ({ username: u.username, status: u.status, lastActive: u.lastActive, userId: u.userId })));
          }
          break;
        case 'USER_STATUS':
          setOnlineUsers((prev) => {
            const other = prev.filter((p) => p.userId !== data.userId);
            other.unshift({ username: data.username ?? data.userId, status: data.status, lastActive: data.timestamp, userId: data.userId });
            return other;
          });
          break;
        case 'NOTIFICATION':
          console.debug('[WS] NOTIFICATION received', data);
          setNotifications((prev) => [data, ...prev]);
          try {
            // If this notification wraps a new voice chat, emit a global event so the active
            // conversation can append the media without reloading. Backend sends a `voiceChat`
            // object alongside the notification when a NEW_VOICE is uploaded.
            const notif = data.notification ?? data;
            if (notif && (notif.type === 'NEW_VOICE' || notif.type === 'NEW_VOICE_UPLOAD' || (data.type === 'NOTIFICATION' && data.notification?.type === 'NEW_VOICE')) ) {
              const voice = data.voiceChat ?? data.notification?.voiceChat ?? data.voiceChat;
              if (voice) {
                // Add senderUsername to the voice object for UI display
                voice.senderUsername = data.senderUsername ?? data.notification?.senderUsername ?? null;
                const ev = new CustomEvent('voice-uploaded', { detail: voice });
                window.dispatchEvent(ev);

                // Also emit a lightweight toast event for UI notifications
                try {
                  const resolvedSenderUsername = data.senderUsername ?? data.notification?.senderUsername ?? voice.senderUsername ?? null;
                  const senderName = resolvedSenderUsername ?? voice.senderId;
                  const toastDetail = {
                    id: (data.notification && data.notification.id) || (data.id ?? `ws-${Date.now()}`),
                    title: 'New voice message',
                    text: data.message ?? (data.notification && data.notification.message) ?? `New voice from ${senderName}`,
                    senderId: voice.senderId,
                    senderUsername: resolvedSenderUsername,
                    receiverId: voice.receiverId,
                    voice,
                    timestamp: data.timestamp ?? data.notification?.timestamp ?? Date.now(),
                  };
                  const t = new CustomEvent('voice-arrived', { detail: toastDetail });
                  window.dispatchEvent(t);
                } catch {
                  // ignore
                }
              }
            }
          } catch (e) {
            // non-fatal
            console.warn('[WS] Failed to dispatch voice-uploaded event', e);
          }
          break;
        default:
          break;
      }
    });

    return () => {
      off();
      // We don't disconnect the shared client to avoid breaking other components
    };
  }, [wsUrl]);

  return { onlineUsers, notifications };
}

export default useVoiceWebSocket;
