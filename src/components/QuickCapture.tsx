import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickCaptureProps {
  userId: string;
}

export function QuickCapture({ userId }: QuickCaptureProps) {
  const [thought, setThought] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!thought.trim()) {
      toast.error('Please enter a thought');
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('quick-capture', {
        body: { thought, userId }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Saved to ${data.category_name} → ${data.subcategory_name}`);
        setThought('');
      } else {
        throw new Error(data.error || 'Failed to process thought');
      }
    } catch (error) {
      console.error('Quick capture error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process thought');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="absolute bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-xl z-30"
    >
      <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
        <Sparkles className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Input
          type="text"
          placeholder="Capture a thought..."
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/60"
          disabled={isProcessing}
        />
        <Button 
          type="submit" 
          size="sm" 
          disabled={isProcessing || !thought.trim()}
          className="rounded-full w-8 h-8 p-0 bg-black hover:bg-black/90"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      {isProcessing && (
        <p className="text-xs text-center text-muted-foreground mt-2">
          Processing with AI...
        </p>
      )}
    </form>
  );
}
