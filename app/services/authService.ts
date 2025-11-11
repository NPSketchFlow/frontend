// Authentication API Service
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  roles: string[];
}

export interface AuthResponse {
  token: string;
  type: string;
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string;
  roles: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  avatar?: string;
}

export interface AuthError {
  error: string;
  message?: string;
}

// Authentication API calls
export const authAPI = {
  // Register new user
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || 'Registration failed');
    }

    return responseData;
  },

  // Login user
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || 'Login failed');
    }

    return responseData;
  },

  // Get current user
  getCurrentUser: async (token: string): Promise<User> => {
    const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    return await response.json();
  },

  // Get user by username
  getUserByUsername: async (username: string, token: string): Promise<User> => {
    const response = await fetch(`${BACKEND_URL}/api/auth/user/${username}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('User not found');
    }

    return await response.json();
  },
};

// Token Management
export const tokenManager = {
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },

  setToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  },

  removeToken: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  },

  getUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  },

  setUser: (user: User): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  removeUser: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  },

  isAuthenticated: (): boolean => {
    return !!tokenManager.getToken();
  },

  logout: (): void => {
    tokenManager.removeToken();
    tokenManager.removeUser();
  },
};

// Get authorization headers for API calls
export const getAuthHeaders = (): HeadersInit => {
  const token = tokenManager.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};
