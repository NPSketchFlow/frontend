# Voice Messaging & Notifications UI - NPSketchFlow

## 🎯 Overview

A production-ready voice messaging system built with Next.js, TypeScript, Tailwind CSS, and Material-UI. Features real-time notifications, online user tracking, and UDP-based voice message transmission (placeholder implementation ready for backend integration).

## 📦 Components Structure

```
app/
├── components/
│   ├── shared/
│   │   ├── UserAvatar.tsx          # Reusable avatar with status indicator
│   │   └── SearchInput.tsx         # Styled search input component
│   │
│   ├── layout/
│   │   ├── TopNavBar.tsx           # Top navigation with notifications
│   │   ├── NotificationPopup.tsx   # Dropdown notification center
│   │   └── SideBar.tsx             # Left sidebar (existing)
│   │
│   ├── voice-chat/
│   │   ├── VoiceRecorder.tsx       # Audio recording with Web Audio API
│   │   ├── VoiceMessagesArea.tsx   # Message list container
│   │   └── ConversationsList.tsx   # Left panel conversations
│   │
│   └── voice-chatComponents/
│       ├── VoiceMessage.tsx        # Individual message bubble
│       └── OnlineUsersList.tsx     # Right panel with user list
│
├── hooks/
│   ├── useNotifications.ts         # Notification state management
│   ├── useVoiceRecorder.ts         # Recording logic hook
│   └── useOnlineUsers.ts           # User presence tracking
│
├── services/
│   └── udpService.ts               # UDP service with chunking/retransmission
│
├── types/
│   └── voice-chat.types.ts         # TypeScript type definitions
│
└── voice-chat/
    └── page.tsx                    # Main voice chat page (3-column layout)
```

## 🎨 Design Features

### Layout
- **3-Column Responsive Layout:**
  - Left: Conversations list (hidden on mobile/tablet)
  - Center: Voice messages + recorder
  - Right: Online users with latency (hidden on smaller screens)
  
### Styling
- **Clean Discord/Google Meet Inspired Design**
- Tailwind CSS for layout and spacing
- Material-UI icons for consistent iconography
- Dark mode support built-in
- Smooth transitions and animations
- Waveform visualizations during recording/playback

### Key Components

#### 1. **TopNavBar** (`components/layout/TopNavBar.tsx`)
- Profile avatar with dropdown
- Notification bell with badge count
- Integration with NotificationPopup

#### 2. **NotificationPopup** (`components/layout/NotificationPopup.tsx`)
- Real-time notification list
- Unread indicators with blue dots
- Timestamp formatting (relative time)
- Mark as read functionality
- Auto-close on outside click

#### 3. **VoiceRecorder** (`components/voice-chat/VoiceRecorder.tsx`)
- Web Audio API integration
- Real-time waveform animation
- Record/stop/play/delete/send controls
- Duration tracking with auto-stop at max duration
- Error handling for microphone permissions
- Upload progress simulation

#### 4. **VoiceMessage** (`components/voice-chatComponents/VoiceMessage.tsx`)
- Play/pause with progress tracking
- Waveform visualization showing progress
- Download functionality
- Own vs. received message styling
- Loading states for download progress

#### 5. **OnlineUsersList** (`components/voice-chatComponents/OnlineUsersList.tsx`)
- Real-time user presence (online/away/offline)
- Latency tracking with color coding:
  - 🟢 Green: < 50ms (Excellent)
  - 🟡 Yellow: 50-100ms (Good)
  - 🔴 Red: > 100ms (Poor)
- Search functionality
- Connection status indicator

#### 6. **VoiceMessagesArea** (`components/voice-chat/VoiceMessagesArea.tsx`)
- Auto-scroll to bottom on new messages
- Load more pagination
- Empty state placeholder
- Message grouping by sender

## 🔧 Technical Implementation

### Web Audio API Recording
```typescript
// VoiceRecorder uses MediaRecorder API
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 44100,
  }
});

const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 128000,
});
```

### UDP Service (Placeholder)
The UDP service (`services/udpService.ts`) includes:
- Packet chunking (1KB chunks)
- Sequence number tracking
- ACK/retransmission logic
- Latency measurement
- Event emitter pattern for real-time updates

```typescript
// Example usage (when backend is ready)
await udpService.connect(userId);
await udpService.uploadVoiceMessage(messageId, audioBlob, senderId, receiverId);
```

### Custom Hooks

#### `useNotifications()`
```typescript
const {
  notifications,
  unreadCount,
  addNotification,
  markAsRead,
  markAllAsRead,
} = useNotifications();
```

#### `useVoiceRecorder()`
```typescript
const {
  isRecording,
  duration,
  startRecording,
  stopRecording,
  uploadVoiceMessage,
} = useVoiceRecorder({
  maxDuration: 300,
  onRecordingComplete: handleComplete,
});
```

#### `useOnlineUsers()`
```typescript
const {
  users,
  updateUserStatus,
  getOnlineUsers,
  pingUser,
} = useOnlineUsers();
```

## 🚀 Getting Started

### Installation
No additional dependencies needed beyond your existing Next.js setup. The components use:
- `@mui/icons-material` (for icons)
- `@mui/material` (for some UI components)

If not installed:
```bash
npm install @mui/material @mui/icons-material
```

### Usage

1. **Navigate to Voice Chat:**
   ```
   http://localhost:3000/voice-chat
   ```

2. **Components are ready to use:**
   - The main page (`/voice-chat/page.tsx`) assembles all components
   - Each component uses dummy data for demonstration
   - Replace dummy data with actual API calls when backend is ready

### Backend Integration Checklist

- [ ] Replace WebSocket URL in `udpService.ts`
- [ ] Implement actual UDP packet transmission
- [ ] Connect to Java NIO backend
- [ ] Replace dummy data in components with API calls
- [ ] Implement authentication context
- [ ] Set up real-time event listeners
- [ ] Configure CORS and WebSocket policies
- [ ] Add error recovery and reconnection logic

## 🎯 Key TODO Items

### High Priority
1. **UDP WebSocket Connection**
   - File: `services/udpService.ts`
   - Action: Uncomment WebSocket code and configure backend URL
   - Lines: 48-59, 274-287

2. **Voice Message Upload/Download**
   - File: `services/udpService.ts`
   - Action: Implement actual chunking and reassembly
   - Lines: 118-196

3. **Real-time Notifications**
   - File: `hooks/useNotifications.ts`
   - Action: Uncomment UDP event listeners
   - Lines: 74-100

4. **User Presence Tracking**
   - File: `hooks/useOnlineUsers.ts`
   - Action: Connect to backend user status events
   - Lines: 91-119

### Medium Priority
5. **Audio Blob Storage**
   - Consider using IndexedDB for caching voice messages
   - Add service worker for offline playback

6. **Notification Permissions**
   - Already requested in `useNotifications` hook
   - Add settings page for notification preferences

7. **Performance Optimization**
   - Implement virtual scrolling for long message lists
   - Add lazy loading for old messages
   - Optimize waveform rendering

### Low Priority
8. **UI Enhancements**
   - Add emoji reactions to voice messages
   - Implement message search
   - Add voice message forwarding
   - Create custom notification sounds

## 📊 Data Flow

```
User Action (Record) 
  → VoiceRecorder component
  → Web Audio API
  → Audio Blob
  → udpService.uploadVoiceMessage()
  → UDP Chunking
  → Java NIO Backend
  → Other Users

Incoming Message
  → Java NIO Backend
  → WebSocket Event
  → udpService event listener
  → VoiceMessagesArea state update
  → VoiceMessage component renders
  → useNotifications triggers notification
```

## 🎨 Customization

### Colors
Update Tailwind classes in components:
- Primary: `bg-blue-600`, `text-blue-600`
- Success: `bg-green-500`, `text-green-500`
- Warning: `bg-yellow-500`, `text-yellow-500`
- Error: `bg-red-500`, `text-red-500`

### Waveform Visualization
Adjust bars and animation in:
- `VoiceRecorder.tsx` (line 195-208)
- `VoiceMessage.tsx` (line 172-195)

### Layout Breakpoints
- Left sidebar: `hidden lg:block` (shows on large screens)
- Right sidebar: `hidden xl:block` (shows on extra-large screens)

## 🐛 Known Issues & Limitations

1. **Audio Format Compatibility**
   - Uses `audio/webm` which may not work on all browsers
   - Fallback to basic audio/webm if opus codec unavailable

2. **Browser Permissions**
   - Microphone access must be granted
   - HTTPS required for production (getUserMedia requirement)

3. **UDP Simulation**
   - Current implementation simulates UDP with console logs
   - Real UDP requires WebSocket bridge to backend

4. **Dummy Data**
   - All components use placeholder data
   - Search for `TODO: Replace with actual` in code

## 📝 Code Quality

- ✅ TypeScript with strict type checking
- ✅ Component size < 300 lines (maintainable)
- ✅ Reusable shared components
- ✅ Custom hooks for logic separation
- ✅ Error handling and loading states
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Accessibility considerations (ARIA labels needed)

## 🔐 Security Considerations

- [ ] Validate audio file sizes before upload
- [ ] Implement rate limiting for voice messages
- [ ] Sanitize user input in notifications
- [ ] Encrypt voice data in transit (WSS)
- [ ] Add CSRF protection
- [ ] Implement authentication middleware

## 📚 Resources

- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Material-UI Icons](https://mui.com/material-ui/material-icons/)

## 🤝 Contributing

When adding features:
1. Follow existing component structure
2. Add TypeScript types to `voice-chat.types.ts`
3. Use Tailwind for styling (avoid inline styles)
4. Add TODO comments for backend integration points
5. Include error handling and loading states
6. Test in both light and dark modes

---

**Built with ❤️ for NPSketchFlow**

For questions or issues, please check the TODO comments in the codebase or refer to the component documentation above.
