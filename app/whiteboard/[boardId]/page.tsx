'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Users, Download, Trash2, ZoomIn, ZoomOut, RotateCcw, Wifi, WifiOff, LogOut, ArrowLeft, Share2 } from 'lucide-react';
import { 
  WhiteboardSessionManager, 
  type Line,
  type ActiveUser
} from '../../services/whiteboardClient';
import { tokenManager } from '../../services/authService';
import { whiteboardAPI } from '../../services/whiteboardService';
import ChatPanel from '@/app/components/whiteboard/ChatPanel';

const COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#FBBF24', // yellow
  '#10B981', // green
  '#A855F7', // purple
  '#EC4899', // pink
  '#1F2937', // dark
];

const TOOLS = [
  { id: 'pen', icon: '✏️', label: 'Pen' },
  { id: 'eraser', icon: '🧹', label: 'Eraser' },
  { id: 'circle', icon: '⭕', label: 'Circle' },
  { id: 'rectangle', icon: '⬜', label: 'Rectangle' },
  { id: 'line', icon: '➖', label: 'Line' },
  { id: 'arrow', icon: '➡️', label: 'Arrow' },
];

interface Point {
  x: number;
  y: number;
}

interface BoardInfo {
  name: string;
  createdBy: string;
  createdAt: string;
}

export default function WhiteboardBoardPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.boardId as string;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionManagerRef = useRef<WhiteboardSessionManager | null>(null);
  const initializingRef = useRef(false);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [zoom, setZoom] = useState(100);
  const [lines, setLines] = useState<Line[]>([]);
  const [startPos, setStartPos] = useState<Point | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [boardInfo, setBoardInfo] = useState<BoardInfo | null>(null);

  // Check authentication and load user data
  useEffect(() => {
    const user = tokenManager.getUser();
    const token = tokenManager.getToken();

    if (!user || !token) {
      router.push('/auth');
      return;
    }

    setUserId(user.id);
    setUsername(user.username);
    setUserAvatar(user.avatar);
  }, [router]);

  // Load board info
  useEffect(() => {
    if (!boardId) return;

    const loadBoardInfo = async () => {
      try {
        const session = await whiteboardAPI.getSession(boardId);
        setBoardInfo({
          name: session.name || 'Untitled Board',
          createdBy: session.createdBy,
          createdAt: session.createdAt,
        });
      } catch (error) {
        console.error('Failed to load board info:', error);
      }
    };

    loadBoardInfo();
  }, [boardId]);

  // Initialize session and connect to existing board
  useEffect(() => {
    if (!userId || !username || !boardId) return;

    if (sessionManagerRef.current || initializingRef.current) {
      console.log('⚠️ Session already initialized');
      return;
    }

    let isMounted = true;

    const initializeSession = async () => {
      console.log('🚀 Joining board:', boardId);
      initializingRef.current = true;

      try {
        setIsLoading(true);

        const token = tokenManager.getToken();
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Create session manager
        const manager = new WhiteboardSessionManager(userId, username);
        
        if (!isMounted) return;
        
        sessionManagerRef.current = manager;

        // Setup event handlers
        manager.on('USER_JOINED', (user: ActiveUser) => {
          if (isMounted) {
            console.log('👤 User joined:', user.username);
            setActiveUsers(prev => {
              // Avoid duplicates
              if (prev.some(u => u.userId === user.userId)) return prev;
              return [...prev, user];
            });
          }
        });

        manager.on('USER_LEFT', (data: { userId: string }) => {
          if (isMounted) {
            console.log('👋 User left:', data.userId);
            setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
          }
        });

        manager.on('DRAW', (data: { tool: string; color: string; coordinates: any }) => {
          if (isMounted) {
            drawRemoteAction(data.tool, data.color, data.coordinates);
          }
        });

        manager.on('CLEAR', () => {
          if (isMounted) {
            setLines([]);
          }
        });

        // Connect to existing session using the boardId
        console.log('📡 Connecting to existing board session...');
        await manager.joinExistingSession(boardId);
        
        if (!isMounted) {
          manager.cleanup();
          return;
        }
        
        console.log('✅ Connected to board');
        setIsConnected(true);

        // Load drawing history from this specific board
        console.log('📜 Loading board history...');
        const history = await manager.loadHistory();
        
        if (isMounted) {
          setLines(history);
          setIsLoading(false);
          console.log('✅ Board loaded with', history.length, 'drawing actions!');
        }
      } catch (error) {
        console.error('❌ Failed to join board:', error);
        if (isMounted) {
          setIsLoading(false);
          if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
            tokenManager.logout();
            alert('Session expired. Please log in again.');
            router.push('/auth');
          } else {
            alert('Failed to join board. Please try again.');
            router.push('/boards');
          }
        }
      } finally {
        initializingRef.current = false;
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
      if (sessionManagerRef.current) {
        console.log('🧹 Cleaning up board session...');
        sessionManagerRef.current.cleanup();
        sessionManagerRef.current = null;
        initializingRef.current = false;
      }
    };
  }, [userId, username, boardId, router]);

  // Redraw canvas whenever lines change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    lines.forEach(line => {
      if (line.tool === 'pen' && line.points) {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.eraser ? 20 : 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);
        line.points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else if (line.tool === 'circle' && line.start && line.end) {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const radius = Math.sqrt(
          Math.pow(line.end.x - line.start.x, 2) + 
          Math.pow(line.end.y - line.start.y, 2)
        );
        ctx.arc(line.start.x, line.start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (line.tool === 'rectangle' && line.start && line.end) {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(
          line.start.x,
          line.start.y,
          line.end.x - line.start.x,
          line.end.y - line.start.y
        );
      } else if (line.tool === 'line' && line.start && line.end) {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
      } else if (line.tool === 'arrow' && line.start && line.end) {
        ctx.strokeStyle = line.color;
        ctx.fillStyle = line.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        const headlen = 15;
        const angle = Math.atan2(line.end.y - line.start.y, line.end.x - line.start.x);
        
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(line.end.x, line.end.y);
        ctx.lineTo(line.end.x - headlen * Math.cos(angle - Math.PI / 6), line.end.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(line.end.x - headlen * Math.cos(angle + Math.PI / 6), line.end.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    });
  }, [lines]);

  const drawRemoteAction = (tool: string, color: string, coordinates: any) => {
    setLines(prev => [...prev, {
      tool,
      color,
      points: coordinates.points,
      start: coordinates.start,
      end: coordinates.end
    }]);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
      setLines([...lines, {
        tool: 'pen',
        color: currentTool === 'eraser' ? '#ffffff' : currentColor,
        eraser: currentTool === 'eraser',
        points: [{ x, y }]
      }]);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentTool === 'pen' || currentTool === 'eraser') {
      const newLines = [...lines];
      if (newLines[newLines.length - 1].points) {
        newLines[newLines.length - 1].points!.push({ x, y });
        setLines(newLines);

        if (sessionManagerRef.current?.isConnected()) {
          sessionManagerRef.current.draw(currentTool, currentColor, {
            points: [{ x, y }]
          });
        }
      }
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentTool !== 'pen' && currentTool !== 'eraser' && startPos) {
      const newLine = {
        tool: currentTool,
        color: currentColor,
        start: startPos,
        end: { x, y }
      };
      setLines([...lines, newLine]);

      if (sessionManagerRef.current?.isConnected()) {
        sessionManagerRef.current.draw(currentTool, currentColor, {
          start: startPos,
          end: { x, y }
        });
      }
    }
    
    setIsDrawing(false);
    setStartPos(null);
  };

  const clearCanvas = async () => {
    setLines([]);
    if (sessionManagerRef.current) {
      await sessionManagerRef.current.clear();
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !sessionManagerRef.current) return;
    sessionManagerRef.current.downloadCanvas(canvas);
  };

  const saveSnapshot = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !sessionManagerRef.current) return;

    try {
      await sessionManagerRef.current.saveSnapshot(canvas);
      alert('Snapshot saved successfully!');
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      alert('Failed to save snapshot');
    }
  };

  const shareBoard = () => {
    const shareUrl = `${window.location.origin}/whiteboard/${boardId}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Board link copied to clipboard!');
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 10, 200));
  const handleZoomOut = () => setZoom(Math.max(zoom - 10, 50));
  const handleResetZoom = () => setZoom(100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-medium text-lg">Loading board...</p>
          <p className="text-slate-400 text-sm mt-2">{boardInfo?.name || 'Please wait'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/boards')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Back to Boards"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            
            <div>
              <h1 className="text-xl font-bold text-white">{boardInfo?.name || 'Whiteboard'}</h1>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">Disconnected</span>
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-2 rounded-lg">
              <Users className="w-4 h-4 text-slate-300" />
              <span className="text-sm font-medium text-white">{activeUsers.length + 1}</span>
              <div className="flex -space-x-2 ml-2">
                <img
                  src={userAvatar || `https://ui-avatars.com/api/?name=${username}`}
                  alt={username}
                  className="w-7 h-7 rounded-full border-2 border-slate-800"
                  title={`${username} (You)`}
                />
                {activeUsers.slice(0, 4).map((user) => (
                  <img
                    key={user.userId}
                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`}
                    alt={user.username}
                    className="w-7 h-7 rounded-full border-2 border-slate-800"
                    title={user.username}
                  />
                ))}
                {activeUsers.length > 4 && (
                  <div className="w-7 h-7 rounded-full bg-slate-600 border-2 border-slate-800 flex items-center justify-center text-xs font-semibold text-white">
                    +{activeUsers.length - 4}
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={shareBoard}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            <button 
              onClick={saveSnapshot}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-20 bg-slate-800/30 backdrop-blur-sm border-r border-slate-700 flex flex-col items-center py-6 gap-6">
          <div className="flex flex-col gap-3">
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => setCurrentTool(tool.id)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
                  currentTool === tool.id
                    ? 'bg-purple-600 shadow-lg shadow-purple-500/50 scale-110'
                    : 'bg-slate-700/50 hover:bg-slate-700'
                }`}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          <div className="h-px w-10 bg-slate-700"></div>

          <div className="grid grid-cols-2 gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={`w-8 h-8 rounded-lg transition-all ${
                  currentColor === color
                    ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="h-px w-10 bg-slate-700"></div>

          <button
            onClick={clearCanvas}
            className="w-12 h-12 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 flex items-center justify-center transition-all hover:scale-105"
            title="Clear Canvas"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full h-full cursor-crosshair bg-white"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
          />

          {/* Zoom Controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-700 flex items-center gap-2 px-2 py-2">
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 rounded-lg hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              <ZoomOut className="w-5 h-5 text-slate-300" />
            </button>
            
            <span className="px-4 text-sm font-medium text-white min-w-[60px] text-center">
              {zoom}%
            </span>
            
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 rounded-lg hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              <ZoomIn className="w-5 h-5 text-slate-300" />
            </button>
            
            <div className="h-6 w-px bg-slate-700 mx-1"></div>
            
            <button
              onClick={handleResetZoom}
              className="w-10 h-10 rounded-lg hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          <button
            onClick={downloadCanvas}
            className="absolute bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-purple-500/50 flex items-center justify-center transition-all hover:scale-110"
            title="Download"
          >
            <Download className="w-6 h-6" />
          </button>
        </main>
        {/* NEW CHAT PANEL (Right) */}
        <aside className="h-full">
          <ChatPanel 
            sessionManager={sessionManagerRef.current}
            sessionId={boardId}
          />
        </aside>
      </div>
    </div>
  );
}
