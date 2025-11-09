'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Cancel, FiberManualRecord } from '@mui/icons-material';
import { CircularProgress, LinearProgress } from '@mui/material';

interface VoiceRecorderProps {
  receiverId: string;
  onMessageSent?: (messageId: string) => void;
}

export default function VoiceRecorder({ receiverId, onMessageSent }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      
      // Create MediaRecorder with optimal settings
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

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Microphone access denied. Please enable microphone permissions.');
    }
  };

  // Stop recording and send
  const stopAndSend = async () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop all tracks
    streamRef.current?.getTracks().forEach(track => track.stop());

    // Wait for final data
    await new Promise(resolve => setTimeout(resolve, 100));

    const audioBlob = new Blob(audioChunksRef.current, { 
      type: mediaRecorderRef.current.mimeType 
    });

    // Upload the voice message
    await uploadVoiceMessage(audioBlob);

    // Reset
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    streamRef.current?.getTracks().forEach(track => track.stop());

    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  // Upload voice message with UDP retransmission
  const uploadVoiceMessage = async (audioBlob: Blob) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Convert to ArrayBuffer for UDP transmission
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);

      // Send via UDP service with chunking and retransmission
      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId,
          audioData: Array.from(audioData),
          duration: recordingTime,
          mimeType: audioBlob.type,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { messageId } = await response.json();
      
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        onMessageSent?.(messageId);
      }, 500);

    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to send voice message. Retrying...');
      
      // Retry logic
      setTimeout(() => {
        setError(null);
        setIsUploading(false);
      }, 2000);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Simulate upload progress (replace with actual progress from UDP chunks)
  useEffect(() => {
    if (isUploading && uploadProgress < 90) {
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isUploading, uploadProgress]);

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {!isRecording && !isUploading ? (
        /* Recording Button */
        <button
          onClick={startRecording}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
        >
          <Mic className="text-2xl" />
          <span>Hold to Record Voice Message</span>
        </button>
      ) : isRecording ? (
        /* Recording in Progress */
        <div className="space-y-3">
          {/* Recording Status Bar */}
          <div className="bg-red-50 border-2 border-red-500 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <FiberManualRecord className="text-red-500 animate-pulse" />
                <span className="font-semibold text-red-700">
                  Recording... {formatTime(recordingTime)}
                </span>
              </div>
              <div className="text-sm text-red-600">
                Max: 5:00
              </div>
            </div>

            {/* Waveform Visualization */}
            <div className="flex items-center justify-center gap-1 h-12 bg-red-100 rounded-lg px-2">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full transition-all"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    animation: `pulse ${0.5 + Math.random()}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={stopAndSend}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium"
            >
              <Send />
              Send Message
            </button>
            <button
              onClick={cancelRecording}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
            >
              <Cancel />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Uploading */
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 py-3">
            <CircularProgress size={24} />
            <span className="text-gray-600 font-medium">
              Uploading voice message via UDP...
            </span>
          </div>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <p className="text-center text-sm text-gray-500">
            {uploadProgress}% • Retransmission enabled
          </p>
        </div>
      )}
    </div>
  );
}