'use client';

import React from 'react';
import SideBar from '../components/layout/SideBar';
import TopNavBar from '../components/layout/TopNavBar';
import ConversationsList from '../components/voice-chat/ConversationsList';
import VoiceMessagesArea from '../components/voice-chat/VoiceMessagesArea';
import VoiceRecorder from '../components/voice-chat/VoiceRecorder';
import OnlineUsersList from '../components/voice-chatComponents/OnlineUsersList';

export default function VoiceChatPage() {
  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar Navigation */}
      <SideBar />

      {/* Main Content Area (offset by sidebar width) */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Top Navigation Bar */}
        <TopNavBar />

        {/* Content - 3 Column Layout */}
        <div className="flex-1 flex overflow-hidden mt-16">
          {/* Conversations List (Left Panel) */}
          <div className="w-80 shrink-0 hidden lg:block">
            <ConversationsList />
          </div>

          {/* Center Panel - Voice Messages + Recorder */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-hidden">
              <VoiceMessagesArea />
            </div>

            {/* Voice Recorder (Fixed at Bottom) */}
            <div className="shrink-0">
              <VoiceRecorder />
            </div>
          </div>

          {/* Right Sidebar - Online Users */}
          <div className="w-80 shrink-0 hidden xl:block">
            <OnlineUsersList />
          </div>
        </div>
      </div>
    </div>
  );
}
