'use client';

import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import {
  uploadVoice,
  sendNotification,
  type UploadVoiceResponse,
  type UserResponse,
} from '../../services/api';
import Modal from '../layout/Modal';

type RecorderState = 'idle' | 'recording' | 'recorded' | 'playing';

interface VoiceRecorderProps {
  currentUserId: string;
  selectedUserId: string | null;
  users: UserResponse[];
  onRecipientChange: (userId: string | null) => void;
  onUploadComplete?: (voiceChat: UploadVoiceResponse['voiceChat']) => void;
}

export default function VoiceRecorder({
  currentUserId,
  selectedUserId,
  users,
  onRecipientChange,
  onUploadComplete,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(
    Array(40).fill(0)
  );
  const [isUploading, setIsUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    message?: string;
    fileId?: string;
    playbackUrl?: string | null;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recipientOptions = users;
  const selectedRecipientId = selectedUserId ?? '';
  const isSendDisabled = state !== 'recorded' || !selectedRecipientId || isUploading;

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

  const handleRecipientSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    onRecipientChange(value || null);
    setError(null);
  };

  const sendRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      return;
    }

    if (!selectedRecipientId) {
      setError('Pick a teammate to send your voice note to.');
      return;
    }

    try {
      setError(null);
      setIsUploading(true);
      const audioBlob = new Blob(audioChunksRef.current, {
        type: 'audio/webm',
      });

      console.log('[Backend] Uploading voice message...', {
        size: audioBlob.size,
        duration,
        chunks: Math.ceil(audioBlob.size / 1024),
      });

      const audioFile = new File([audioBlob], 'voice-message.webm', {
        type: 'audio/webm',
      });

      const result: UploadVoiceResponse = await uploadVoice(audioFile, currentUserId, selectedRecipientId);

      console.log('[Backend] Voice message uploaded successfully:', result);

      await sendNotification(result.fileId, currentUserId);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('voice-uploaded', { detail: result.voiceChat }));
      }

      onUploadComplete?.(result.voiceChat);

      const recipientName = recipientOptions.find((user) => user.userId === selectedRecipientId)?.username ?? selectedRecipientId;

      // Show a nicer modal popup with details and optional playback link
      let playbackUrl: string | null = null;
      if (result && typeof result === 'object') {
        const r = (result as unknown) as Record<string, unknown>;
        if (r.voiceChat && typeof r.voiceChat === 'object') {
          const vc = r.voiceChat as Record<string, unknown>;
          if (typeof vc.fileUrl === 'string') playbackUrl = vc.fileUrl;
        }
        if (!playbackUrl && typeof r.fileUrl === 'string') playbackUrl = r.fileUrl as string;
      }

      setModalData({
        title: 'Voice message sent',
        message: `Sent to ${recipientName}. File ID: ${result.fileId}`,
        fileId: result.fileId,
        playbackUrl,
      });
      setModalOpen(true);

      // Clean up local recording after showing modal
      deleteRecording();
    } catch (err) {
      setError('Failed to send voice message. Please check if backend is running.');
      console.error('[Backend] Send error:', err);
      setState('recorded');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="bg-white border-t border-gray-200 p-4">
      {error && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Send voice message to
        </label>
        <select
          value={selectedRecipientId}
          onChange={handleRecipientSelect}
          disabled={recipientOptions.length === 0 || state === 'recording' || isUploading}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">Select a teammate</option>
          {recipientOptions.map((user) => (
            <option key={user.userId} value={user.userId}>
              {user.username}
            </option>
          ))}
        </select>
        {selectedRecipientId === '' && recipientOptions.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Choose who should receive this clip to enable the send button.
          </p>
        )}
        {recipientOptions.length === 0 && (
          <p className="mt-1 text-xs text-gray-500">
            No teammates available yet. Ask an admin to add users in the dashboard.
          </p>
        )}
      </div>

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
            disabled={isSendDisabled}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <SendIcon />
            )}
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
      {/* Modal for upload confirmation */}
      <Modal
        open={modalOpen}
        title={modalData?.title}
        onClose={() => {
          setModalOpen(false);
          setModalData(null);
        }}
        actions={
          <>
            {modalData?.playbackUrl && (
              <a
                href={modalData.playbackUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Play
              </a>
            )}
            {modalData?.fileId && !modalData?.playbackUrl && (
              <a
                href={`/api/voice/download/${modalData.fileId}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Download
              </a>
            )}
            <button
              onClick={() => {
                setModalOpen(false);
                setModalData(null);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 text-sm"
            >
              Close
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <p>{modalData?.message}</p>
          {modalData?.fileId && (
            <p className="text-xs text-gray-500">ID: {modalData.fileId}</p>
          )}
        </div>
      </Modal>
    </>
  );
}
