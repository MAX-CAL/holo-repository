import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/knowledge';

const USER_STORAGE_KEY = 'knowledge_universe_user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const loginWithCode = async (accessCode: string): Promise<{ user?: User; error?: string; isNew?: boolean }> => {
    const code = accessCode.trim().toLowerCase();
    
    if (!code || code.length < 3) {
      return { error: 'Access code must be at least 3 characters' };
    }

    // Check if user with this access code exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('access_code', code)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking access code:', fetchError);
      return { error: 'Failed to check access code' };
    }

    if (existingUser) {
      // User exists, log them in
      setUser(existingUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(existingUser));
      return { user: existingUser };
    }

    // User doesn't exist - return isNew flag
    return { isNew: true };
  };

  const createUniverse = async (accessCode: string): Promise<{ user?: User; error?: string }> => {
    const code = accessCode.trim().toLowerCase();

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({ access_code: code })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return { error: 'Failed to create universe' };
    }

    setUser(newUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    return { user: newUser };
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  return { user, loading, loginWithCode, createUniverse, signOut };
}
