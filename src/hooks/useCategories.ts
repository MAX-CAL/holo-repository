import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types/knowledge';

export function useCategories(userId: string | undefined, parentId: string | null = null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!userId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    let query = supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching categories:', error);
      setLoading(false);
      return;
    }

    setCategories(data || []);
    setLoading(false);
  }, [userId, parentId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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

  const addCategory = async (name: string, color: string, parent_id: string | null = null) => {
    if (!userId) return { error: new Error('Not authenticated') };
    
    const position = generateSpherePosition();
    
    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        parent_id,
        name,
        color,
        position_x: position.x,
        position_y: position.y,
        position_z: position.z
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding category:', error);
      return { error };
    }

    setCategories(prev => [...prev, data]);
    return { data };
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return { error };
    }

    setCategories(prev => prev.map(c => c.id === id ? data : c));
    return { data };
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      return { error };
    }

    setCategories(prev => prev.filter(c => c.id !== id));
    return {};
  };

  return { categories, loading, addCategory, updateCategory, deleteCategory, refetch: fetchCategories };
}
