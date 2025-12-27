import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PRESET_COLORS = [
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

interface AddTopicDialogProps {
  onAdd: (name: string, color: string) => Promise<{ error?: Error }>;
}

export function AddTopicDialog({ onAdd }: AddTopicDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a topic name');
      return;
    }

    setIsLoading(true);
    const { error } = await onAdd(name.trim(), color);
    setIsLoading(false);

    if (error) {
      toast.error('Failed to create topic');
      return;
    }

    toast.success('Topic created!');
    setName('');
    setColor(PRESET_COLORS[0]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground z-50"
        >
          <Plus className="w-6 h-6 md:w-7 md:h-7" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Topic</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground/80">Topic Name</Label>
            <Input
              id="name"
              placeholder="e.g., Science, Art, Travel..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background/50 border-border"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80">Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-primary scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Create Topic'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
