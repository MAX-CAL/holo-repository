import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Topic } from '@/types/knowledge';
import { useAuth } from './useAuth';

export function useTopics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTopics = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching topics:', error);
      return;
    }

    setTopics(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchTopics();
    }
  }, [user]);

  const generateSpherePosition = () => {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 2;
    
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi)
    };
  };

  const addTopic = async (name: string, color: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const position = generateSpherePosition();
    
    const { data, error } = await supabase
      .from('topics')
      .insert({
        user_id: user.id,
        name,
        color,
        position_x: position.x,
        position_y: position.y,
        position_z: position.z
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding topic:', error);
      return { error };
    }

    setTopics(prev => [...prev, data]);
    return { data };
  };

  const deleteTopic = async (id: string) => {
    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting topic:', error);
      return { error };
    }

    setTopics(prev => prev.filter(t => t.id !== id));
    return {};
  };

  return { topics, loading, addTopic, deleteTopic, refetch: fetchTopics };
}
