'use client';

import React, { useState, useRef, useEffect } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import DownloadIcon from '@mui/icons-material/Download';
import IconButton from '@mui/material/IconButton';
import UserAvatar from '../shared/UserAvatar';

export interface VoiceMessageData {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  audioUrl: string;
  duration: number; // in seconds
  timestamp: Date;
  isOwn: boolean;
  isLoading?: boolean;
  downloadProgress?: number; // 0-100
}

interface VoiceMessageProps {
  message: VoiceMessageData;
}

export default function VoiceMessage({ message }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    const audio = new Audio(message.audioUrl);
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    // TODO: Download audio chunks via UDP
    console.log('[UDP] Fetching voice message chunks...', {
      messageId: message.id,
      expectedDuration: message.duration,
    });

    return () => {
      audio.pause();
      audio.remove();
    };
  }, [message.audioUrl, message.id, message.duration]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);

      // TODO: Send UDP packet to track message play status
      console.log('[UDP] Voice message played:', message.id);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      // TODO: Implement UDP download with progress tracking
      // - Request chunks from server
      // - Reassemble audio file
      // - Handle retransmission on packet loss
      console.log('[UDP] Downloading voice message...', message.id);

      // Simulate download
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Trigger browser download
      const link = document.createElement('a');
      link.href = message.audioUrl;
      link.download = `voice-message-${message.id}.webm`;
      link.click();

      console.log('[UDP] Download complete');
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = message.duration > 0 ? (currentTime / message.duration) * 100 : 0;

  return (
    <div
      className={`flex items-start space-x-3 mb-4 ${
        message.isOwn ? 'flex-row-reverse space-x-reverse' : ''
      }`}
    >
      {/* Avatar */}
      <UserAvatar
        name={message.senderName}
        avatarUrl={message.senderAvatar}
        status="online"
        size="sm"
        showStatus={false}
      />

      {/* Message Bubble */}
      <div
        className={`flex flex-col max-w-sm ${
          message.isOwn ? 'items-end' : 'items-start'
        }`}
      >
        {/* Sender Name */}
        {!message.isOwn && (
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 px-2">
            {message.senderName}
          </span>
        )}

        {/* Voice Message Card */}
        <div
          className={`relative rounded-2xl p-3 shadow-sm ${
            message.isOwn
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
          } ${message.isLoading ? 'opacity-50' : ''}`}
        >
          {message.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-2xl">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <div className="flex items-center space-x-2 min-w-[200px]">
            {/* Play/Pause Button */}
            <IconButton
              onClick={togglePlayPause}
              disabled={message.isLoading}
              size="small"
              className={`${
                message.isOwn
                  ? 'text-white hover:bg-blue-700'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {isPlaying ? (
                <PauseIcon fontSize="small" />
              ) : (
                <PlayArrowIcon fontSize="small" />
              )}
            </IconButton>

            {/* Waveform & Progress Bar */}
            <div className="flex-1">
              <div className="relative h-8 flex items-center gap-0.5">
                {Array.from({ length: 20 }).map((_, i) => {
                  const barHeight = 30 + Math.random() * 70;
                  const isPassed = (i / 20) * 100 <= progress;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-100 ${
                        isPassed
                          ? message.isOwn
                            ? 'bg-white'
                            : 'bg-blue-500'
                          : message.isOwn
                          ? 'bg-blue-400'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      style={{ height: `${barHeight}%` }}
                    />
                  );
                })}
              </div>

              {/* Time */}
              <div className="flex justify-between text-xs mt-1 opacity-75">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(message.duration)}</span>
              </div>
            </div>

            {/* Download Button */}
            <IconButton
              onClick={handleDownload}
              disabled={isDownloading}
              size="small"
              className={`${
                message.isOwn
                  ? 'text-white hover:bg-blue-700'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <DownloadIcon fontSize="small" />
              )}
            </IconButton>
          </div>

          {/* Download Progress */}
          {message.downloadProgress !== undefined &&
            message.downloadProgress < 100 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div
                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${message.downloadProgress}%` }}
                  />
                </div>
              </div>
            )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-500 dark:text-gray-500 mt-1 px-2">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
