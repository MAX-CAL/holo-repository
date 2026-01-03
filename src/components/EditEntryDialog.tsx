import { useState, useRef, useEffect } from 'react';
import { Entry } from '@/types/knowledge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, X, ImagePlus } from 'lucide-react';

interface EditEntryDialogProps {
  entry: Entry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Entry>) => Promise<{ error?: any }>;
}

export function EditEntryDialog({ entry, open, onOpenChange, onSave }: EditEntryDialogProps) {
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content || '');
  const [tags, setTags] = useState(entry.tags?.join(', ') || '');
  const [imageDescription, setImageDescription] = useState(entry.image_description || '');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when entry changes
  useEffect(() => {
    setTitle(entry.title);
    setContent(entry.content || '');
    setTags(entry.tags?.join(', ') || '');
    setImageDescription(entry.image_description || '');
  }, [entry]);

  const handleSave = async () => {
    if (!title.trim()) return;
    
    setIsSaving(true);
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    
    const { error } = await onSave(entry.id, {
      title: title.trim(),
      content: content.trim() || null,
      tags: tagArray,
      image_description: imageDescription.trim() || null,
    });
    
    setIsSaving(false);
    
    if (!error) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-background/50 border-border"
          />
          
          {entry.image_url && (
            <div>
              <img 
                src={entry.image_url} 
                alt={entry.title}
                className="w-full h-48 object-cover rounded-lg border border-border/50"
              />
              <Input
                placeholder="Photo description/credits"
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                className="mt-2 bg-background/50 border-border text-sm"
              />
            </div>
          )}

          <Textarea
            placeholder="Notes..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-background/50 border-border min-h-[100px]"
          />
          <Input
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="bg-background/50 border-border"
          />
          
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !title.trim()} 
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
