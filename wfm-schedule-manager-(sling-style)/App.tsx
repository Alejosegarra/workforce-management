
import React, { useState, useEffect } from 'react';
import { User, Session } from './types';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { supabase, supabaseService, isSupabaseConfigured } from './services/supabase';
import AdminDashboard from './components/admin/AdminDashboard';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import Login from './components/auth/Login';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import SupabaseSetup from './components/auth/SupabaseSetup';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // If Supabase credentials aren't set, display a setup guide instead of crashing.
  if (!isSupabaseConfigured) {
    return (
       <ThemeProvider>
        <SupabaseSetup />
      </ThemeProvider>
    )
  }

  useEffect(() => {
    const processSession = async (supabaseSession: SupabaseSession | null) => {
      if (supabaseSession?.user) {
        // Fetch the user's role from our public.empleados table
        const profile = await supabaseService.getProfile(supabaseSession.user.id);
        const userRole = profile?.role === 'admin' ? 'admin' : 'empleado';
        
        const enhancedUser: User = { ...supabaseSession.user, role: userRole };
        const enhancedSession: Session = { ...supabaseSession, user: enhancedUser };
        setUser(enhancedUser);
        setSession(enhancedSession);
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    };
    
    const fetchInitialSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
      } else {
        await processSession(data.session);
      }
    };

    fetchInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        await processSession(session);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
          {!session ? (
            <Login />
          ) : user?.role === 'admin' ? (
            <AdminDashboard user={user} />
          ) : (
            <EmployeeDashboard user={user} />
          )}
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
