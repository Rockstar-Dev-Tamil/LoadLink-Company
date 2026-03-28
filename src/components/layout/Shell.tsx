import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { Chatbot } from '../Chatbot';
import { Toaster } from 'sonner';
import { BottomNav } from './BottomNav';
import { useUiStore } from '../../stores/uiStore';

export function Shell() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  return (
    <div className="loadlink-app" data-theme={theme}>
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="main">
        <Outlet />
      </main>

      <Chatbot />

      <BottomNav />
      
      <Toaster position="top-right" richColors />
    </div>
  );
}
