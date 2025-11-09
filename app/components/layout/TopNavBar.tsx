'use client';

import { useState } from 'react';
import { IconButton, Menu, MenuItem, Avatar } from '@mui/material';
import { AccountCircle, Settings, Logout, HelpOutline } from '@mui/icons-material';
//import RealtimeNotificationSystem from './RealtimeNotificationSystem';

export default function TopNavBar() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // TODO: Implement logout logic
    console.log('Logging out...');
    handleMenuClose();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-6 shadow-sm">
      {/* Logo & Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
          NS
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">NPSketchFlow</h1>
          <p className="text-xs text-gray-500">Study Buddy Platform</p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Help Button */}
        <IconButton>
          <HelpOutline />
        </IconButton>

        {/* Notification System */}
        <RealtimeNotificationSystem />

        {/* Profile Menu */}
        <IconButton onClick={handleProfileMenuOpen}>
          <Avatar
            sx={{ width: 36, height: 36 }}
            className="bg-gradient-to-br from-blue-500 to-purple-500"
          >
            <AccountCircle />
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={isMenuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            className: 'mt-2 min-w-[200px]',
          }}
        >
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="font-semibold text-gray-800">John Doe</p>
            <p className="text-sm text-gray-500">john.doe@example.com</p>
          </div>
          
          <MenuItem onClick={handleMenuClose} className="py-3">
            <AccountCircle className="mr-3 text-gray-600" />
            Profile
          </MenuItem>
          
          <MenuItem onClick={handleMenuClose} className="py-3">
            <Settings className="mr-3 text-gray-600" />
            Settings
          </MenuItem>
          
          <div className="border-t border-gray-200" />
          
          <MenuItem onClick={handleLogout} className="py-3 text-red-600">
            <Logout className="mr-3" />
            Logout
          </MenuItem>
        </Menu>
      </div>
    </nav>
  );
}