import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

const UNLOCKED_KEY = 'knowledge_universe_unlocked';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // If user logs out, reset unlock state
        if (event === 'SIGNED_OUT') {
          setIsUnlocked(false);
          sessionStorage.removeItem(UNLOCKED_KEY);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check if already unlocked this session
      if (session && sessionStorage.getItem(UNLOCKED_KEY) === 'true') {
        setIsUnlocked(true);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const unlock = () => {
    setIsUnlocked(true);
    // Store unlock state in sessionStorage (clears when browser/tab closes)
    sessionStorage.setItem(UNLOCKED_KEY, 'true');
  };

  const lock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(UNLOCKED_KEY);
  };

  const signOut = async () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(UNLOCKED_KEY);
    await supabase.auth.signOut();
  };

  return { 
    user, 
    session,
    loading, 
    isUnlocked,
    unlock,
    lock,
    signOut
  };
}
