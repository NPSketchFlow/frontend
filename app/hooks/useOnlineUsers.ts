/**
 * React Hook for Online Users
 * 
 * Manages real-time user presence and latency tracking
 * 
 * TODO: Integrate with UDP service for real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { User, OnlineStatus } from '../types/voice-chat.types';
import udpService from '../services/udpService';

export function useOnlineUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Update user status
  const updateUserStatus = useCallback((userId: string, status: OnlineStatus) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, status, lastSeen: new Date() } : user
      )
    );

    // TODO: Send status update via UDP
    if (currentUser && userId === currentUser.id) {
      udpService.sendStatusUpdate(userId, status).catch(console.error);
    }
  }, [currentUser]);

  // Update user latency
  const updateUserLatency = useCallback((userId: string, latency: number) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, latency } : user
      )
    );
  }, []);

  // Add user
  const addUser = useCallback((user: User) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.map((u) => (u.id === user.id ? user : u));
      }
      return [...prev, user];
    });
  }, []);

  // Remove user
  const removeUser = useCallback((userId: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId));
  }, []);

  // Get user by ID
  const getUserById = useCallback((userId: string): User | undefined => {
    return users.find((user) => user.id === userId);
  }, [users]);

  // Get online users
  const getOnlineUsers = useCallback((): User[] => {
    return users.filter((user) => user.status === 'online');
  }, [users]);

  // Get away users
  const getAwayUsers = useCallback((): User[] => {
    return users.filter((user) => user.status === 'away');
  }, [users]);

  // Get offline users
  const getOfflineUsers = useCallback((): User[] => {
    return users.filter((user) => user.status === 'offline');
  }, [users]);

  // Ping user to measure latency
  const pingUser = useCallback(async (userId: string) => {
    try {
      // TODO: Implement actual UDP ping
      const latency = await udpService.sendPing(userId);
      updateUserLatency(userId, latency);
      return latency;
    } catch (error) {
      console.error('[OnlineUsers] Ping failed:', error);
      return -1;
    }
  }, [updateUserLatency]);

  // TODO: Listen to UDP service events for user status changes
  useEffect(() => {
    const handleStatusUpdate = (data: { userId: string; status: OnlineStatus; latency?: number }) => {
      updateUserStatus(data.userId, data.status);
      if (data.latency !== undefined) {
        updateUserLatency(data.userId, data.latency);
      }
    };

    const handleUserJoined = (user: User) => {
      addUser(user);
    };

    const handleUserLeft = (userId: string) => {
      updateUserStatus(userId, 'offline');
    };

    // TODO: Uncomment when UDP service is integrated
    // udpService.on('statusUpdate', handleStatusUpdate);
    // udpService.on('userJoined', handleUserJoined);
    // udpService.on('userLeft', handleUserLeft);

    return () => {
      // TODO: Cleanup listeners
      // udpService.off('statusUpdate', handleStatusUpdate);
      // udpService.off('userJoined', handleUserJoined);
      // udpService.off('userLeft', handleUserLeft);
    };
  }, [updateUserStatus, updateUserLatency, addUser]);

  // Periodic latency updates
  useEffect(() => {
    const interval = setInterval(() => {
      const onlineUsers = getOnlineUsers();
      onlineUsers.forEach((user) => {
        pingUser(user.id);
      });
    }, 10000); // Ping every 10 seconds

    return () => clearInterval(interval);
  }, [getOnlineUsers, pingUser]);

  return {
    users,
    currentUser,
    setCurrentUser,
    updateUserStatus,
    updateUserLatency,
    addUser,
    removeUser,
    getUserById,
    getOnlineUsers,
    getAwayUsers,
    getOfflineUsers,
    pingUser,
  };
}

export default useOnlineUsers;
