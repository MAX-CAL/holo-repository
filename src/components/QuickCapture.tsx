import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VoiceRecorder } from './VoiceRecorder';
import { ReviewNoteModal } from './ReviewNoteModal';

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

interface QuickCaptureProps {
  userId: string;
  onSuccess?: () => void;
}

export function QuickCapture({ userId, onSuccess }: QuickCaptureProps) {
  const [thought, setThought] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [processedNote, setProcessedNote] = useState<ProcessedNote | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!thought.trim()) {
      toast.error('Please enter a thought');
      return;
    }

    setIsProcessing(true);

    try {
      // Verify session before calling edge function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast.error('Session expired. Please log in again.');
        setIsProcessing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('process-thought', {
        body: { thought }
      });

      if (error) throw error;

      if (data.success) {
        // Open review modal with processed data
        setProcessedNote(data.processed);
        setCategories(data.categories || []);
        setShowReviewModal(true);
        setThought('');
      } else {
        throw new Error(data.error || 'Failed to process thought');
      }
    } catch (error) {
      console.error('Quick capture error:', error);
      
      // Specific error messages based on error type
      const errorMessage = error instanceof Error ? error.message : 'Failed to process thought';
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('AUTH_ERROR')) {
        toast.error('Session expired. Please refresh and try again.');
      } else if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else if (errorMessage.includes('credits') || errorMessage.includes('402')) {
        toast.error('AI credits exhausted. Please contact support.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceProcessed = (processed: ProcessedNote, cats: Category[]) => {
    setProcessedNote(processed);
    setCategories(cats);
    setShowReviewModal(true);
  };

  const handleModalSuccess = () => {
    onSuccess?.();
  };

  return (
    <>
      <form 
        onSubmit={handleSubmit} 
        className="absolute bottom-4 left-4 right-20 md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-xl md:w-full z-20"
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
          
          {/* Voice Recorder */}
          <VoiceRecorder 
            userId={userId} 
            onProcessed={handleVoiceProcessed}
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

      <ReviewNoteModal
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
        processedNote={processedNote}
        categories={categories}
        userId={userId}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
