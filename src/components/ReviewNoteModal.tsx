import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  color: string;
  parent_id: string | null;
}

interface ProcessedNote {
  title: string;
  content: string;
  suggested_category_id: string | null;
  suggested_category_name: string | null;
  parent_category_name?: string | null;
}

interface ReviewNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processedNote: ProcessedNote | null;
  categories: Category[];
  userId: string;
  onSuccess?: () => void;
}

export function ReviewNoteModal({
  open,
  onOpenChange,
  processedNote,
  categories,
  userId,
  onSuccess,
}: ReviewNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when modal opens with new data
  useMemo(() => {
    if (processedNote && open) {
      setTitle(processedNote.title);
      setContent(processedNote.content);
      setSelectedCategoryId(processedNote.suggested_category_id || '');
    }
  }, [processedNote, open]);

  // Build category hierarchy for display
  const categoryOptions = useMemo(() => {
    const mainCategories = categories.filter(c => !c.parent_id);
    const subcategories = categories.filter(c => c.parent_id);
    
    const options: { id: string; label: string; isSubcategory: boolean }[] = [];
    
    for (const main of mainCategories) {
      options.push({ id: main.id, label: main.name, isSubcategory: false });
      const subs = subcategories.filter(s => s.parent_id === main.id);
      for (const sub of subs) {
        options.push({ id: sub.id, label: `  └─ ${sub.name}`, isSubcategory: true });
      }
    }
    
    return options;
  }, [categories]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!selectedCategoryId) {
      toast.error('Please select a category');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from('entries').insert({
        user_id: userId,
        category_id: selectedCategoryId,
        title: title.trim(),
        content: content.trim(),
        tags: [],
      });

      if (error) throw error;

      const selectedCategory = categories.find(c => c.id === selectedCategoryId);
      toast.success(`Saved to ${selectedCategory?.name || 'category'}`);
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    onOpenChange(false);
    setTitle('');
    setContent('');
    setSelectedCategoryId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="note-content">Content</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Note content..."
              rows={4}
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-2">
            <Label htmlFor="note-category">Category</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem 
                    key={option.id} 
                    value={option.id}
                    className={option.isSubcategory ? 'pl-6' : 'font-medium'}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDiscard} disabled={isSaving}>
            Discard
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Note'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
