import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { WorkspaceProvider } from './context/WorkspaceContext.tsx';
import { AuthScreen } from './components/auth/AuthScreen.tsx';
import { DashboardLayout } from './components/dashboard/DashboardLayout.tsx';

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nexus_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nexus_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nexus_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-background text-foreground text-xs font-medium">
        <div className="flex items-center gap-2.5">
          <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Verifying credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen isDark={isDark} onToggleTheme={toggleTheme} />;
  }

  return (
    <WorkspaceProvider>
      <DashboardLayout isDark={isDark} onToggleTheme={toggleTheme} />
    </WorkspaceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
