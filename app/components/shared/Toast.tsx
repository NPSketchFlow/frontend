'use client';

import React, { useEffect, useState } from 'react';

export interface ToastItem {
  id: string;
  title: string;
  text?: string;
  timestamp?: number;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onArrived = (ev: Event) => {
      const d = (ev as CustomEvent<ToastItem>).detail;
      if (!d || !d.id) return;
      setToasts((prev) => [{ ...d, timestamp: d.timestamp ?? Date.now() }, ...prev].slice(0, 5));

      // auto-remove after 5s
      setTimeout(() => {
        setToasts((cur) => cur.filter((t) => t.id !== d.id));
      }, 5000);
    };

    window.addEventListener('voice-arrived', onArrived as EventListener);
    return () => window.removeEventListener('voice-arrived', onArrived as EventListener);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col items-end space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="w-80 bg-white border border-gray-200 shadow-lg rounded-lg p-3 animate-slide-in"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">{t.title}</div>
              {t.text && <div className="text-xs text-gray-600 mt-1 truncate">{t.text}</div>}
            </div>
            <div className="text-xs text-gray-400">{new Date(t.timestamp!).toLocaleTimeString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
