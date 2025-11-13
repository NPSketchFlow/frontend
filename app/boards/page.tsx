'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Trash2, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { whiteboardAPI } from '../services/whiteboardService';
import { tokenManager } from '../services/authService';
import SideBar from '../components/layout/SideBar';

interface Board {
  sessionId: string;
  name: string;
  createdBy: string;
  createdAt: string;
  activeUsers?: number;
  isActive?: boolean;
}

export default function BoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [user, setUser] = useState<{ username: string; fullName: string } | null>(null);

  useEffect(() => {
    // Check authentication
    const token = tokenManager.getToken();
    const userData = tokenManager.getUser();

    if (!token || !userData) {
      router.push('/auth');
      return;
    }

    setUser(userData);
    loadBoards();
  }, [router]);

  const loadBoards = async () => {
    try {
      setIsLoading(true);
      const data = await whiteboardAPI.getAllSessions();
      setBoards(data);
    } catch (error) {
      console.error('Failed to load boards:', error);
      alert('Failed to load boards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      alert('Please enter a board name');
      return;
    }

    try {
      setIsCreating(true);
      const userId = user?.username || 'anonymous';
      const session = await whiteboardAPI.createSession(newBoardName, userId);
      
      // Redirect to the new board
      router.push(`/whiteboard/${session.sessionId}`);
    } catch (error) {
      console.error('Failed to create board:', error);
      alert('Failed to create board. Please try again.');
    } finally {
      setIsCreating(false);
      setShowCreateModal(false);
      setNewBoardName('');
    }
  };

  const handleJoinBoard = (boardId: string) => {
    router.push(`/whiteboard/${boardId}`);
  };

  const handleDeleteBoard = async (boardId: string, boardName: string) => {
    if (!confirm(`Are you sure you want to delete "${boardName}"?`)) {
      return;
    }

    try {
      // Note: Implement delete API call when backend supports it
      alert('Delete functionality will be implemented soon');
      // await whiteboardAPI.deleteSession(boardId);
      // await loadBoards();
    } catch (error) {
      console.error('Failed to delete board:', error);
      alert('Failed to delete board. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
          <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white text-lg">Loading boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900">
      <SideBar />
      <div className="ml-64">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">My Whiteboards</h1>
              <p className="text-slate-300 mt-1">
                Welcome back, {user?.fullName || user?.username}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Back to Home
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                   className="flex items-center gap-2 px-6 py-2 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-purple-500/50"
              >
                <Plus className="w-5 h-5" />
                New Board
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Boards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {boards.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-slate-800/50 rounded-2xl p-12 max-w-md mx-auto border border-slate-700">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No boards yet</h3>
              <p className="text-slate-400 mb-6">
                Create your first whiteboard to start collaborating
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                   className="px-6 py-3 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
              >
                Create First Board
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board) => (
              <div
                key={board.sessionId}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 hover:border-purple-500 transition-all p-6 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-white truncate flex-1 pr-2">
                    {board.name}
                  </h3>
                  {board.isActive && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(board.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{board.activeUsers || 0} active users</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleJoinBoard(board.sessionId)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors group-hover:shadow-lg group-hover:shadow-purple-500/50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </button>
                  {board.createdBy === user?.username && (
                    <button
                      onClick={() => handleDeleteBoard(board.sessionId, board.name)}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                      title="Delete board"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Board</h2>
            
            <div className="mb-6">
              <label className="block text-slate-300 mb-2 font-medium">
                Board Name
              </label>
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateBoard()}
                placeholder="e.g., Team Planning Session"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                autoFocus
                disabled={isCreating}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBoardName('');
                }}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBoard}
                disabled={isCreating || !newBoardName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
