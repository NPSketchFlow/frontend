import React from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { mapVoiceChatToMessage } from '../app/components/voice-chat/VoiceMessagesArea';
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

describe('mapVoiceChatToMessage', () => {
  test('marks isOwn true when senderId equals currentUserId', () => {
    const chat = {
      chatId: 'c1',
      senderId: 'user-1',
      receiverId: 'user-2',
      filePath: 'voice-data/uploads/file.webm',
      // use a fixed timestamp for deterministic tests
      timestamp: 1670000000000,
    } as any;

    const userMap = new Map<string, any>();
    const msg = mapVoiceChatToMessage(chat, userMap, 'user-1');
    assert.strictEqual(msg.isOwn, true);
  });
  });

  test('marks isOwn true when author username matches currentUserId', () => {
    const chat = {
      chatId: 'c2',
      senderId: 'alice',
      receiverId: 'bob',
      filePath: 'voice-data/uploads/file2.webm',
      timestamp: Date.now(),
    } as any;

    const userMap = new Map<string, any>();
    const msg = mapVoiceChatToMessage(chat, userMap, 'alice');
    assert.strictEqual(msg.isOwn, true);
  });


