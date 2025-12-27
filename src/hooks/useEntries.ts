import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Entry } from '@/types/knowledge';
import { useAuth } from './useAuth';

export function useEntries(subtopicId: string | null) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchEntries = async () => {
    if (!user || !subtopicId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('subtopic_id', subtopicId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching entries:', error);
      return;
    }

    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [user, subtopicId]);

  const addEntry = async (title: string, content: string, tags: string[]) => {
    if (!user || !subtopicId) return { error: new Error('Not authenticated or no subtopic selected') };
    
    const { data, error } = await supabase
      .from('entries')
      .insert({
        user_id: user.id,
        subtopic_id: subtopicId,
        title,
        content,
        tags
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding entry:', error);
      return { error };
    }

    setEntries(prev => [data, ...prev]);
    return { data };
  };

  const updateEntry = async (id: string, updates: Partial<Entry>) => {
    const { data, error } = await supabase
      .from('entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating entry:', error);
      return { error };
    }

    setEntries(prev => prev.map(e => e.id === id ? data : e));
    return { data };
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting entry:', error);
      return { error };
    }

    setEntries(prev => prev.filter(e => e.id !== id));
    return {};
  };

  return { entries, loading, addEntry, updateEntry, deleteEntry, refetch: fetchEntries };
}
