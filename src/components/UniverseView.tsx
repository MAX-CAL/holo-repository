import { useState } from 'react';
import { KnowledgeSphere } from './KnowledgeSphere';
import { AddTopicDialog } from './AddTopicDialog';
import { TopicDetailView } from './TopicDetailView';
import { useTopics } from '@/hooks/useTopics';
import { useAuth } from '@/hooks/useAuth';
import { Topic } from '@/types/knowledge';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Brain } from 'lucide-react';
import { toast } from 'sonner';

interface UniverseViewProps {
  onLogout: () => void;
}

export function UniverseView({ onLogout }: UniverseViewProps) {
  const { topics, loading, addTopic } = useTopics();
  const { signOut } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await signOut();
    
    if (error) {
      toast.error('Failed to sign out');
      setIsLoggingOut(false);
      return;
    }

    onLogout();
  };

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);
  };

  const handleBackToUniverse = () => {
    setSelectedTopic(null);
  };

  if (selectedTopic) {
    return <TopicDetailView topic={selectedTopic} onBack={handleBackToUniverse} />;
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 md:px-8 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-medium text-foreground hidden sm:block">Knowledge Universe</span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          {isLoggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </>
          )}
        </Button>
      </div>

      {/* 3D Canvas */}
      <div className="absolute inset-0 pt-16">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading your universe...</p>
            </div>
          </div>
        ) : (
          <KnowledgeSphere topics={topics} onTopicClick={handleTopicClick} />
        )}
      </div>

      {/* Instructions overlay */}
      {!loading && topics.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center px-4">
            <p className="text-lg text-muted-foreground mb-2">Your universe is empty</p>
            <p className="text-sm text-muted-foreground/70">Tap the + button to add your first topic</p>
          </div>
        </div>
      )}

      {/* Controls hint */}
      {!loading && topics.length > 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <p className="text-xs text-muted-foreground/60 text-center">
            Drag to rotate • Scroll/pinch to zoom • Click nodes to explore
          </p>
        </div>
      )}

      {/* Add topic button */}
      <AddTopicDialog onAdd={addTopic} />
    </div>
  );
}
