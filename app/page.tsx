'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { tokenManager } from './services/authService';
import { Loader2, LogOut, User as UserIcon } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [redirectingAdmin, setRedirectingAdmin] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = tokenManager.getToken();
    const userData = tokenManager.getUser();

    if (!token || !userData) {
      // Not authenticated, redirect to auth page
      router.push('/auth');
    } else {
      setUser(userData);

      // Check if user has admin role and redirect to admin dashboard
      if (userData.roles && userData.roles.includes('ROLE_ADMIN')) {
        console.log('Admin user detected, redirecting to admin dashboard...');
        setRedirectingAdmin(true);
        router.push('/admin');
        return;
      }

      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    tokenManager.logout();
    router.push('/auth');
  };

  if (isLoading || redirectingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">SketchFlow</h1>
              <p className="text-xs text-slate-500">Collaborative Whiteboard</p>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-lg">
              <img
                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.fullName || 'User'}`}
                alt="Avatar"
                className="w-8 h-8 rounded-full"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">{user?.fullName}</p>
                <p className="text-xs text-slate-500">@{user?.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Welcome, {user?.fullName}! 👋
          </h2>
          <p className="text-slate-600 text-lg">
            Choose an option below to get started
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* My Boards Card */}
          <Link href="/boards">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-500 group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">My Boards</h3>
              <p className="text-slate-600">
                View and manage all your whiteboards in one place.
              </p>
              <div className="mt-4 text-blue-600 font-medium flex items-center gap-2">
                View Boards
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Whiteboard Card */}
          <Link href="/boards">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-indigo-500 group">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Whiteboard</h3>
              <p className="text-slate-600">
                Collaborate in real-time with drawing tools, shapes, and more.
              </p>
              <div className="mt-4 text-indigo-600 font-medium flex items-center gap-2">
                Start Drawing
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Voice Chat Card */}
          <Link href="/voice-chat">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-purple-500 group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Voice Chat</h3>
              <p className="text-slate-600">
                Communicate with your team using voice messages and chat.
              </p>
              <div className="mt-4 text-purple-600 font-medium flex items-center gap-2">
                Start Chatting
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="bg-white rounded-xl p-6 text-center shadow-md">
            <div className="text-3xl font-bold text-indigo-600 mb-1">100+</div>
            <div className="text-slate-600 text-sm">Active Users</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-md">
            <div className="text-3xl font-bold text-purple-600 mb-1">50+</div>
            <div className="text-slate-600 text-sm">Whiteboards</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-md">
            <div className="text-3xl font-bold text-pink-600 mb-1">24/7</div>
            <div className="text-slate-600 text-sm">Collaboration</div>
          </div>
        </div>
      </div>
    </div>
  );
}
