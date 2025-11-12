'use client';

import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
}

export default function Modal({ open, title, children, onClose, actions }: ModalProps) {
  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6"
    >
      {/* Backdrop (lighter and slightly blurred for better readability) */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal panel */}
  <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-auto overflow-hidden ring-1 ring-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="text-sm text-gray-700">{children}</div>
        </div>

        {/* Prominent sticky footer */}
        {actions && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shadow-md">
            <div className="flex-1 text-sm text-gray-600">&nbsp;</div>
            <div className="flex items-center gap-3">{actions}</div>
          </div>
        )}
      </div>
    </div>
  );
}
