import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, signOut as supabaseSignOut } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] Auth state changed:', event, 'userId:', session?.user?.id, 'isAuthenticated:', !!session?.user);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Wrap the signOut function to handle any additional cleanup
  const signOut = async () => {
    try {
      const { error } = await supabaseSignOut();
      if (error) throw error;
      
      // User state will be updated automatically by onAuthStateChange
      console.log('[useAuth] Sign out successful');
    } catch (error) {
      console.error('[useAuth] Sign out error:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signOut,
  };
}