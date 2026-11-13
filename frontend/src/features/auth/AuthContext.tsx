import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthUser, LoginRequest, RegisterRequest, AuthResponse, VerifyEmailRequest } from '@/types';
import { authApi } from '@/api';
import { queryClient } from '@/app/providers/QueryProvider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'axm_nexus_user';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'register' | 'login';
  isProfileModalOpen: boolean;
  isLogoutConfirmOpen: boolean;
  openAuthModal: (tab?: 'register' | 'login') => void;
  closeAuthModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  requestLogout: () => void;
  cancelLogout: () => void;
  confirmLogout: () => void;
  login: (data: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  verifyEmail: (data: VerifyEmailRequest) => Promise<AuthResponse>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (data: import('@/types').ResetPasswordRequest) => Promise<void>;
  logout: () => void;
  forceLogout: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  isMentor: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'register' | 'login'>('register');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const openAuthModal = (tab: 'register' | 'login' = 'register') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const login = async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      queryClient.clear();
    } catch {
      // ignore
    }
    const res = await authApi.login(data);
    const authData = res.data.data;
    const authUser: AuthUser = {
      id: authData.id,
      username: authData.username,
      email: authData.email,
      fullName: authData.fullName,
      roles: authData.roles,
      permissions: authData.permissions,
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      tokenType: authData.tokenType,
      emailVerified: authData.emailVerified,
    };
    setUser(authUser);
    return authData;
  };

  const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      queryClient.clear();
    } catch {
      // ignore
    }
    const res = await authApi.register(data);
    const authData = res.data.data;
    const authUser: AuthUser = {
      id: authData.id,
      username: authData.username,
      email: authData.email,
      fullName: authData.fullName,
      roles: authData.roles,
      permissions: authData.permissions,
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      tokenType: authData.tokenType,
      emailVerified: authData.emailVerified,
    };
    setUser(authUser);
    return authData;
  };

  const verifyEmail = async (data: VerifyEmailRequest): Promise<AuthResponse> => {
    const res = await authApi.verifyEmail(data);
    const authData = res.data.data;
    setUser((prev) =>
      prev
        ? {
            ...prev,
            emailVerified: true,
            accessToken: authData.accessToken || prev.accessToken,
          }
        : null
    );
    return authData;
  };

  const resendVerification = async (email: string): Promise<void> => {
    await authApi.resendVerification({ email });
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const res = await authApi.forgotPassword({ email });
    return res.data.data;
  };

  const resetPassword = async (data: import('@/types').ResetPasswordRequest): Promise<void> => {
    await authApi.resetPassword(data);
  };

  const requestLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const cancelLogout = () => {
    setIsLogoutConfirmOpen(false);
  };

  const clearUserData = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('axvhub_test_attempts');
    try {
      queryClient.clear();
    } catch {
      // ignore
    }
    setIsLogoutConfirmOpen(false);
    setIsProfileModalOpen(false);
  };

  const confirmLogout = () => {
    clearUserData();
  };

  const forceLogout = () => {
    clearUserData();
  };

  const logout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const normalizeRole = (r: string) => {
    if (!r) return '';
    const upper = r.trim().toUpperCase();
    return upper.startsWith('ROLE_') ? upper.substring(5) : upper;
  };

  const hasRole = (roleToCheck: string): boolean => {
    if (!user || !user.roles || user.roles.length === 0) return false;
    const target = normalizeRole(roleToCheck);
    return user.roles.some((r) => normalizeRole(r) === target);
  };

  const hasAnyRole = (rolesToCheck: string[]): boolean => {
    return rolesToCheck.some((r) => hasRole(r));
  };

  const hasPermission = (permissionToCheck: string): boolean => {
    if (!user) return false;
    if (hasRole('SUPER_ADMIN') || hasRole('ADMIN')) return true;
    if (!user.permissions || user.permissions.length === 0) return false;
    return user.permissions.some(
      (p) => p.trim().toLowerCase() === permissionToCheck.trim().toLowerCase()
    );
  };

  const isAdmin = hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'PROGRAM_ADMIN']);
  const isMentor = hasAnyRole(['MENTOR', 'ENGLISH_MENTOR']);
  const isStudent = hasRole('STUDENT');

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAuthModalOpen,
        authModalTab,
        isProfileModalOpen,
        isLogoutConfirmOpen,
        openAuthModal,
        closeAuthModal,
        openProfileModal,
        closeProfileModal,
        requestLogout,
        cancelLogout,
        confirmLogout,
        login,
        register,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        logout,
        forceLogout,
        hasRole,
        hasAnyRole,
        hasPermission,
        isAdmin,
        isMentor,
        isStudent,
      }}
    >
      {children}

      <Dialog open={isLogoutConfirmOpen} onOpenChange={(open) => !open && cancelLogout()}>
        <DialogContent className="sm:max-w-md border-0 rounded-2xl shadow-2xl bg-card text-card-foreground p-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Tizimdan chiqishni tasdiqlaysizmi?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Haqiqatan ham o‘z hisobingizdan chiqmoqchimisiz? Qayta kirish uchun HEMIS ID raqamingiz va parolingiz talab qilinadi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 pt-3 border-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelLogout}
              className="rounded-xl border-0 bg-muted/60 hover:bg-muted text-foreground cursor-pointer"
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmLogout}
              className="rounded-xl border-0 shadow-sm cursor-pointer"
            >
              Ha, chiqish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useOptionalAuth = (): AuthContextType | null => {
  return useContext(AuthContext) || null;
};
