"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType<T = User> {
  isAuthenticated: boolean;
  // true until the auth cookies have been read on the client
  authLoading: boolean;
  userData: T | null;
  login: (token: string, userData: T) => void;
  logout: () => void;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing auth state on mount
    console.log('[AuthContext] Checking for existing auth state...');
    
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const token = getCookie("token");
    const storedUserData = getCookie("user_data");
    
    console.log('[AuthContext] Token found:', token ? 'Yes' : 'No');
    console.log('[AuthContext] User data found:', storedUserData ? 'Yes' : 'No');

    if (token && storedUserData) {
      console.log('[AuthContext] Setting authenticated state to true');
      setIsAuthenticated(true);
      try {
        setUserData(JSON.parse(decodeURIComponent(storedUserData)));
        console.log('[AuthContext] User data parsed successfully');
      } catch (error) {
        console.error("[AuthContext] Error parsing user data:", error);
        // Clear invalid cookies
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    } else {
      console.log('[AuthContext] No valid auth state found');
    }
    setAuthLoading(false);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    const allCookies = document.cookie;
    console.log('[AuthContext] All cookies:', allCookies);
    
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1] || null;
    
    console.log('[AuthContext] Token retrieved:', token ? 'Present' : 'Missing');
    return token;
  }, []);

  const login = (token: string, userData: User) => {
    console.log('[AuthContext] Login function called with:', { token: token.substring(0, 20) + '...', userData });
    
    // Clear any existing cookies first
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    console.log('[AuthContext] Cleared existing cookies');
    
    // Set cookies with proper expiration (7 days to match JWT)
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    
    // Set token cookie (no Secure flag for localhost)
    const tokenCookie = `token=${token}; expires=${expires}; path=/; SameSite=Strict`;
    document.cookie = tokenCookie;
    console.log('[AuthContext] Token cookie set:', tokenCookie.substring(0, 50) + '...');
    
    // Set user data cookie (no Secure flag for localhost)
    const userDataCookie = `user_data=${encodeURIComponent(JSON.stringify(userData))}; expires=${expires}; path=/; SameSite=Strict`;
    document.cookie = userDataCookie;
    console.log('[AuthContext] User data cookie set');
    
    // Verify cookies were set
    setTimeout(() => {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };
      
      const verifyToken = getCookie("token");
      const verifyUserData = getCookie("user_data");
      console.log('[AuthContext] Cookie verification:', { 
        token: verifyToken ? 'Present' : 'Missing', 
        userData: verifyUserData ? 'Present' : 'Missing' 
      });
    }, 100);
    
    console.log('[AuthContext] Updating state...');
    setIsAuthenticated(true);
    setUserData(userData);
    console.log('[AuthContext] State updated - isAuthenticated: true');
  };

  const logout = () => {
    // Clear cookies by setting them to expire in the past
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    setIsAuthenticated(false);
    setUserData(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, authLoading, userData, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
