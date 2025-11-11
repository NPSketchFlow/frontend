'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Users, Download, Trash2, ZoomIn, ZoomOut, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { 
  WhiteboardSessionManager, 
  generateUserId, 
  generateUsername,
  type Line,
  type ActiveUser
} from '../services/whiteboardClient';

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

export default function CollabBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionManagerRef = useRef<WhiteboardSessionManager | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [zoom, setZoom] = useState(100);
  const [lines, setLines] = useState<Line[]>([]);
  const [startPos, setStartPos] = useState<Point | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId] = useState(generateUserId());
  const [username] = useState(generateUsername());

  // Initialize session and WebSocket
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        
        // Create session manager
        const manager = new WhiteboardSessionManager(userId, username);
        sessionManagerRef.current = manager;

        // Setup event handlers
        manager.on('USER_JOINED', (user: ActiveUser) => {
          setActiveUsers(prev => [...prev, user]);
        });

        manager.on('USER_LEFT', (data: { userId: string }) => {
          setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
        });

        manager.on('DRAW', (data: { tool: string; color: string; coordinates: any }) => {
          drawRemoteAction(data.tool, data.color, data.coordinates);
        });

        manager.on('CLEAR', () => {
          setLines([]);
        });

        // Initialize session (creates session and connects WebSocket)
        await manager.initialize('Collaborative Whiteboard');
        setIsConnected(true);

        // Load drawing history
        const history = await manager.loadHistory();
        setLines(history);

        setIsLoading(false);
      } catch (error) {
        console.error('❌ Failed to initialize session:', error);
        setIsLoading(false);
        alert('Failed to connect to backend. Please make sure the backend is running on http://localhost:8080');
      }
    };

    initializeSession();

    // Cleanup on unmount
    return () => {
      if (sessionManagerRef.current) {
        sessionManagerRef.current.cleanup();
      }
    };
  }, [userId, username]);

  // Redraw canvas whenever lines change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Redraw all lines
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

  // Draw action received from other users
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

        // Send to WebSocket via session manager
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

      // Send to WebSocket via session manager
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
    
    // Clear via session manager (handles WebSocket and backend API)
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

  const handleZoomIn = () => setZoom(Math.min(zoom + 10, 200));
  const handleZoomOut = () => setZoom(Math.max(zoom - 10, 50));
  const handleResetZoom = () => setZoom(100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Connecting to whiteboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">CollabBoard</h1>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-600" />
                    <span className="text-red-600">Disconnected</span>
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
              <Users className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">{activeUsers.length + 1} users drawing</span>
              <div className="flex -space-x-2 ml-2">
                {activeUsers.slice(0, 5).map((user, i) => (
                  <div 
                    key={user.userId} 
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white"
                    title={user.username}
                  ></div>
                ))}
                {activeUsers.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-xs font-semibold text-slate-600">
                    +{activeUsers.length - 5}
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={saveSnapshot}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              Save Snapshot
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 shadow-sm">
          {/* Tools */}
          <div className="flex flex-col gap-3">
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => setCurrentTool(tool.id)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-200 ${
                  currentTool === tool.id
                    ? 'bg-indigo-600 text-white shadow-lg scale-110'
                    : 'bg-slate-100 hover:bg-slate-200'
                }`}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          <div className="h-px w-10 bg-slate-200"></div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                  currentColor === color
                    ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="h-px w-10 bg-slate-200"></div>

          {/* Actions */}
          <button
            onClick={clearCanvas}
            className="w-12 h-12 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-all duration-200 hover:scale-105"
            title="Clear Canvas"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative overflow-hidden bg-slate-50">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full h-full cursor-crosshair bg-white shadow-inner"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
          />

          {/* Zoom Controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center gap-2 px-2 py-2">
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5 text-slate-600" />
            </button>
            
            <span className="px-4 text-sm font-medium text-slate-700 min-w-[60px] text-center">
              {zoom}%
            </span>
            
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5 text-slate-600" />
            </button>
            
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            
            <button
              onClick={handleResetZoom}
              className="w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Floating Action Button */}
          <button
            onClick={downloadCanvas}
            className="absolute bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
            title="Download Canvas"
          >
            <Download className="w-6 h-6" />
          </button>
        </main>
      </div>
    </div>
  );
}