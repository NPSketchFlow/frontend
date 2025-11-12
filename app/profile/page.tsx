'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI, tokenManager, type User } from '../services/authService';
import { Loader2, ArrowLeft, User as UserIcon, Mail, Save, Image as ImageIcon } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [fullName, setFullName] = useState('');
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    const userData = tokenManager.getUser();
    if (!userData) {
      router.push('/auth');
    } else {
      setUser(userData);
      setFullName(userData.fullName);
      setAvatar(userData.avatar);
      setIsLoading(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    const token = tokenManager.getToken();
    if (!token || !user) {
      setError('You are not logged in.');
      setIsSaving(false);
      return;
    }

    try {
      const updatedData = await authAPI.updateProfile(
        { fullName, avatar },
        token
      );

      // Update local state with the new user data
      const updatedUser = tokenManager.getUser();
      setUser(updatedUser);
      
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      console.error('Profile update failed:', err);
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Redirect is in progress
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800">My Profile</h1>
              <p className="text-xs text-slate-500">Manage your account details</p>
            </div>
          </div>
          <img
            src={avatar || `https://ui-avatars.com/api/?name=${fullName}`}
            alt="Avatar"
            className="w-10 h-10 rounded-full"
          />
        </div>
      </header>

      {/* Profile Form */}
      <div className="max-w-4xl mx-auto p-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <div className="flex items-center gap-6">
            <img
              src={avatar || `https://ui-avatars.com/api/?name=${fullName}`}
              alt="Avatar Preview"
              className="w-24 h-24 rounded-full border-4 border-slate-100"
            />
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <ImageIcon className="w-4 h-4 inline mr-1" />
                Avatar URL
              </label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-slate-900"
                placeholder="https://example.com/avatar.png"
              />
              <p className="text-xs text-slate-500 mt-1">
                You can use a service like <a href="https://ui-avatars.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600">ui-avatars.com</a> or any image URL.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <UserIcon className="w-4 h-4 inline mr-1" />
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-slate-900"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <UserIcon className="w-4 h-4 inline mr-1" />
              Username (Read-only)
            </label>
            <input
              type="text"
              value={user.username}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email (Read-only)
            </label>
            <input
              type="email"
              value={user.email}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
              disabled
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </div>
              ) : (
                <>
                  <Save className="w-5 h-5 inline mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}