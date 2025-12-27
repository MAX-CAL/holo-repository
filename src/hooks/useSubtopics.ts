import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Subtopic } from '@/types/knowledge';
import { useAuth } from './useAuth';

export function useSubtopics(topicId: string | null) {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSubtopics = async () => {
    if (!user || !topicId) {
      setSubtopics([]);
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from('subtopics')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching subtopics:', error);
      return;
    }

    setSubtopics(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubtopics();
  }, [user, topicId]);

  const addSubtopic = async (name: string) => {
    if (!user || !topicId) return { error: new Error('Not authenticated or no topic selected') };
    
    const { data, error } = await supabase
      .from('subtopics')
      .insert({
        user_id: user.id,
        topic_id: topicId,
        name
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding subtopic:', error);
      return { error };
    }

    setSubtopics(prev => [...prev, data]);
    return { data };
  };

  const deleteSubtopic = async (id: string) => {
    const { error } = await supabase
      .from('subtopics')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting subtopic:', error);
      return { error };
    }

    setSubtopics(prev => prev.filter(s => s.id !== id));
    return {};
  };

  return { subtopics, loading, addSubtopic, deleteSubtopic, refetch: fetchSubtopics };
}
