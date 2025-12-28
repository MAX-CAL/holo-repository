import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Entry } from '@/types/knowledge';

export function useEntries(userId: string | undefined, categoryId: string | null) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!userId || !categoryId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching entries:', error);
      setLoading(false);
      return;
    }

    setEntries(data || []);
    setLoading(false);
  }, [userId, categoryId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const uploadImage = async (file: File): Promise<{ url?: string; error?: Error }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('entry-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return { error: uploadError };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('entry-images')
      .getPublicUrl(filePath);

    return { url: publicUrl };
  };

  const addEntry = async (
    title: string, 
    content: string, 
    tags: string[],
    imageFile?: File,
    imageDescription?: string
  ) => {
    if (!userId || !categoryId) return { error: new Error('Not authenticated or no category selected') };

    let imageUrl: string | null = null;
    
    if (imageFile) {
      const { url, error: uploadError } = await uploadImage(imageFile);
      if (uploadError) return { error: uploadError };
      imageUrl = url || null;
    }
    
    const { data, error } = await supabase
      .from('entries')
      .insert({
        user_id: userId,
        category_id: categoryId,
        title,
        content: content || null,
        tags,
        image_url: imageUrl,
        image_description: imageDescription || null
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

  return { entries, loading, addEntry, updateEntry, deleteEntry, uploadImage, refetch: fetchEntries };
}
