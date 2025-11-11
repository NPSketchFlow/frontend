'use client';

import React, { useState, useRef, useEffect } from 'react';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

type RecorderState = 'idle' | 'recording' | 'recorded' | 'playing';

export default function VoiceRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(
    Array(40).fill(0)
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analysis for waveform
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current = new Audio(audioUrl);
        setState('recorded');

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };

      mediaRecorder.start();
      setState('recording');
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Start waveform animation
      animateWaveform();

      // TODO: Send UDP packet to notify server of recording start
      console.log('[UDP] Recording started - notify server');
    } catch (err) {
      setError('Failed to access microphone. Please check permissions.');
      console.error('Recording error:', err);
    }
  };

  const animateWaveform = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Sample and normalize data for waveform display
    const bars = 40;
    const step = Math.floor(dataArray.length / bars);
    const normalized = Array.from({ length: bars }, (_, i) => {
      const value = dataArray[i * step] || 0;
      return (value / 255) * 100;
    });

    setWaveformData(normalized);
    animationRef.current = requestAnimationFrame(animateWaveform);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // TODO: Send UDP packet to notify server of recording stop
      console.log('[UDP] Recording stopped');
    }
  };

  const playRecording = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setState('playing');

      audioRef.current.onended = () => {
        setState('recorded');
      };
    }
  };

  const deleteRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    audioChunksRef.current = [];
    setDuration(0);
    setState('idle');
    setWaveformData(Array(40).fill(0));

    // TODO: Cancel any pending UDP upload
    console.log('[UDP] Recording deleted');
  };

  const sendRecording = async () => {
    if (audioChunksRef.current.length === 0) return;

    try {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: 'audio/webm',
      });

      // TODO: Implement UDP voice message upload
      // - Split blob into chunks (simulate packet loss)
      // - Send chunks via UDP with sequence numbers
      // - Implement retransmission logic
      // - Show progress indicator
      console.log('[UDP] Sending voice message...', {
        size: audioBlob.size,
        duration,
        chunks: Math.ceil(audioBlob.size / 1024),
      });

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Success - reset recorder
      deleteRecording();
      alert('Voice message sent successfully!');

      // TODO: Emit success notification
      console.log('[UDP] Voice message sent successfully');
    } catch (err) {
      setError('Failed to send voice message. Please try again.');
      console.error('Send error:', err);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {error && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Waveform Visualization */}
      <div className="mb-4 flex items-center justify-center h-16 gap-1">
        {waveformData.map((height, index) => (
          <div
            key={index}
            className={`w-1 rounded-full transition-all duration-100 ${
              state === 'recording'
                ? 'bg-red-500'
                : state === 'playing'
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
            style={{
              height: `${Math.max(height, 4)}%`,
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Record/Stop Button */}
          {state === 'idle' || state === 'recorded' ? (
            <IconButton
              onClick={startRecording}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <MicIcon />
            </IconButton>
          ) : (
            <IconButton
              onClick={stopRecording}
              className="bg-gray-800 hover:bg-gray-900 text-white"
            >
              <StopIcon />
            </IconButton>
          )}

          {/* Play Button (only when recorded) */}
          {state === 'recorded' && (
            <IconButton
              onClick={playRecording}
              className="text-blue-600"
            >
              <PlayArrowIcon />
            </IconButton>
          )}

          {/* Delete Button (only when recorded) */}
          {state === 'recorded' && (
            <IconButton
              onClick={deleteRecording}
              className="text-red-600"
            >
              <DeleteIcon />
            </IconButton>
          )}
        </div>

        {/* Duration */}
        <div className="text-sm font-mono text-gray-600">
          {formatDuration(duration)}
        </div>

        {/* Send Button */}
        {state === 'recorded' && (
          <IconButton
            onClick={sendRecording}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <SendIcon />
          </IconButton>
        )}
      </div>

      {/* Status Message */}
      {state === 'recording' && (
        <div className="mt-3 text-center">
          <p className="text-sm text-red-600 animate-pulse">
            Recording...
          </p>
        </div>
      )}

      {state === 'playing' && (
        <div className="mt-3 text-center">
          <p className="text-sm text-blue-600">Playing...</p>
        </div>
      )}
    </div>
  );
}
