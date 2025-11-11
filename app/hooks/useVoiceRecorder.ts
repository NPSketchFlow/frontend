/**
 * React Hook for Voice Recorder
 * 
 * Manages voice recording state and Web Audio API integration
 * 
 * TODO: Integrate with UDP service for uploading
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import udpService from '../services/udpService';

interface UseVoiceRecorderOptions {
  maxDuration?: number; // in seconds
  onRecordingComplete?: (blob: Blob, duration: number) => void;
  onUploadComplete?: (messageId: string) => void;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}) {
  const {
    maxDuration = 300, // 5 minutes default
    onRecordingComplete,
    onUploadComplete,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    }
  }, [isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        onRecordingComplete?.(audioBlob, duration);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    } catch (err) {
      console.error('[VoiceRecorder] Failed to start:', err);
      setError('Failed to access microphone');
    }
  }, [maxDuration, onRecordingComplete, duration, stopRecording]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording, isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  }, [isRecording, isPaused]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());

    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    audioChunksRef.current = [];
  }, []);

  // Upload voice message
  const uploadVoiceMessage = useCallback(
    async (audioBlob: Blob, senderId: string, receiverId: string) => {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const messageId = `msg-${Date.now()}-${Math.random()}`;

        // TODO: Use actual UDP service
        const result = await udpService.uploadVoiceMessage(
          messageId,
          audioBlob,
          senderId,
          receiverId
        );

        if (result.success) {
          setUploadProgress(100);
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
            onUploadComplete?.(result.messageId);
          }, 500);
        }
      } catch (err) {
        console.error('[VoiceRecorder] Upload failed:', err);
        setError('Failed to upload voice message');
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    isUploading,
    uploadProgress,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    uploadVoiceMessage,
  };
}

export default useVoiceRecorder;
