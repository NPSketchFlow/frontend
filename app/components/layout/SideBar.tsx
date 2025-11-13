'use client';

import React, { useEffect, useState } from 'react';
import { tokenManager } from '../../services/authService';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import DrawIcon from '@mui/icons-material/Draw';
import MicIcon from '@mui/icons-material/Mic';
import Badge from '@mui/material/Badge';
import { Feather } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    href: '/',
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: <ChatIcon />,
    href: '/chat',
    badge: 3,
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    icon: <DrawIcon />,
    href: '/boards',
  },
  {
    id: 'voice-messages',
    label: 'Voice Messages',
    icon: <MicIcon />,
    href: '/voice-chat',
  },
];

export default function SideBar() {
  const pathname = usePathname();

  // Render a deterministic placeholder on first render (matches server)
  const [displayName, setDisplayName] = useState('Tharushi De Silva');
  const [displayEmail, setDisplayEmail] = useState('john@example.com');

  useEffect(() => {
    const u = tokenManager.getUser();
    if (u) {
      // update on next tick to avoid synchronous setState in effect
      setTimeout(() => {
        setDisplayName(u.fullName ?? u.username ?? 'Tharushi De Silva');
        setDisplayEmail(u.email ?? 'john@example.com');
      }, 0);
    }
  }, []);

  const initials = (displayName || '')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 shadow-sm z-40">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-linear-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <Feather className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">SketchFlow</h1>
            <p className="text-xs text-gray-500">Workspace</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="px-3 py-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const active = isActive(item.href);
            
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${
                      active
                        ? 'bg-linear-to-r from-purple-600 to-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className={`${active ? 'text-white' : 'text-gray-600'}`}>
                    {item.icon}
                  </span>
                  <span className="font-medium text-sm flex-1">
                    {item.label}
                  </span>
                  {item.badge && item.badge > 0 && (
                    <Badge
                      badgeContent={item.badge}
                      color="error"
                      className="ml-auto"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Section at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
              {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
                {displayName}
            </p>
            <p className="text-xs text-gray-500 truncate">
                {displayEmail}
            </p>
          </div>
          <svg
            className="w-4 h-4 text-gray-400"
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
    </aside>
  );
}
