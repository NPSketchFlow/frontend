import React from 'react';
import { render, screen } from '@testing-library/react';
import VoiceMessage, { VoiceMessageData } from '../app/components/voice-chatComponents/VoiceMessage';

describe('VoiceMessage component', () => {
  const baseMessage: VoiceMessageData = {
    id: 'm1',
    senderId: 'user-a',
    senderName: 'Alice',
    audioUrl: '/audio/test.webm',
    duration: 10,
    timestamp: new Date(),
    isOwn: false,
  };

  test('renders incoming message on the left', () => {
    render(<VoiceMessage message={{ ...baseMessage, isOwn: false }} />);
    const container = screen.getByText(/Alice/i).closest('div');
    expect(container).toBeTruthy();
    // when not own, should NOT have flex-row-reverse class
    expect(container).not.toHaveClass('flex-row-reverse');
  });

  test('renders outgoing message on the right', () => {
    render(<VoiceMessage message={{ ...baseMessage, isOwn: true }} />);
    const container = screen.getByText(/Alice/i).closest('div');
    expect(container).toBeTruthy();
    // when own, should have flex-row-reverse class
    expect(container).toHaveClass('flex-row-reverse');
  });
});
