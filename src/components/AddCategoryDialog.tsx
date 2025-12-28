import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPicker } from './ColorPicker';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddCategoryDialogProps {
  onAdd: (name: string, color: string, parentId?: string | null) => Promise<{ error?: Error | null }>;
  parentId?: string | null;
  buttonLabel?: string;
}

export function AddCategoryDialog({ onAdd, parentId = null, buttonLabel }: AddCategoryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#22c55e');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    
    setIsAdding(true);
    const { error } = await onAdd(name.trim(), color, parentId);
    setIsAdding(false);

    if (error) {
      toast.error('Failed to add');
      return;
    }

    toast.success(parentId ? 'Sub-category added!' : 'Category added!');
    setName('');
    setColor('#22c55e');
    setIsOpen(false);
  };

  return (
    <>
      <Button
        size="lg"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-20"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div 
            className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {parentId ? 'Add Sub-category' : 'Add Category'}
            </h2>
            
            <div className="space-y-4">
              <Input
                type="text"
                placeholder={parentId ? 'Sub-category name...' : 'Category name...'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="bg-background/50 border-border"
                autoFocus
              />

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Color
                </label>
                <ColorPicker color={color} onChange={setColor} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={isAdding || !name.trim()}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : buttonLabel || 'Add'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
