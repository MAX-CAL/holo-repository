import { useState, useCallback } from 'react';
import { KnowledgeSphere } from './KnowledgeSphere';
import { AddTopicDialog } from './AddTopicDialog';
import { TopicDetailView } from './TopicDetailView';
import { Breadcrumbs } from './Breadcrumbs';
import { useTopics } from '@/hooks/useTopics';
import { useSubtopics } from '@/hooks/useSubtopics';
import { useAuth } from '@/hooks/useAuth';
import { Topic, Subtopic, NavigationState, ViewLevel } from '@/types/knowledge';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Brain, ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface UniverseViewProps {
  onLogout: () => void;
}

export function UniverseView({ onLogout }: UniverseViewProps) {
  const { topics, loading: topicsLoading, addTopic } = useTopics();
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Navigation state machine
  const [navigation, setNavigation] = useState<NavigationState>({
    level: 'root',
    activeTopic: null,
    activeSubtopic: null
  });

  // Fetch subtopics for the active topic
  const { subtopics, loading: subtopicsLoading, addSubtopic } = useSubtopics(
    navigation.activeTopic?.id || ''
  );

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

  // Navigation handlers
  const navigateToRoot = useCallback(() => {
    setNavigation({
      level: 'root',
      activeTopic: null,
      activeSubtopic: null
    });
  }, []);

  const navigateToCategory = useCallback(() => {
    setNavigation(prev => ({
      ...prev,
      level: 'category',
      activeSubtopic: null
    }));
  }, []);

  const handleTopicClick = useCallback((topic: Topic) => {
    setNavigation({
      level: 'category',
      activeTopic: topic,
      activeSubtopic: null
    });
  }, []);

  const handleSubtopicClick = useCallback((subtopic: Subtopic) => {
    setNavigation(prev => ({
      ...prev,
      level: 'editor',
      activeSubtopic: subtopic
    }));
  }, []);

  const handleBackFromEditor = useCallback(() => {
    setNavigation(prev => ({
      ...prev,
      level: 'category',
      activeSubtopic: null
    }));
  }, []);

  // Show editor overlay when at level 3
  if (navigation.level === 'editor' && navigation.activeTopic && navigation.activeSubtopic) {
    return (
      <TopicDetailView 
        topic={navigation.activeTopic} 
        subtopic={navigation.activeSubtopic}
        onBack={handleBackFromEditor}
        navigation={navigation}
        onNavigateToRoot={navigateToRoot}
        onNavigateToCategory={navigateToCategory}
      />
    );
  }

  const isLoading = topicsLoading || (navigation.level === 'category' && subtopicsLoading);
  const showEmptyState = !isLoading && (
    (navigation.level === 'root' && topics.length === 0) ||
    (navigation.level === 'category' && subtopics.length === 0)
  );

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-4 md:px-8 z-20 bg-background/50 backdrop-blur-sm border-b border-border/20">
        <div className="flex items-center gap-3">
          {navigation.level === 'category' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateToRoot}
              className="text-muted-foreground hover:text-foreground mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          
          <div className="hidden sm:block">
            <Breadcrumbs 
              navigation={navigation}
              onNavigateToRoot={navigateToRoot}
              onNavigateToCategory={navigateToCategory}
            />
          </div>
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

      {/* Mobile Breadcrumbs */}
      {navigation.level !== 'root' && (
        <div className="absolute top-16 left-0 right-0 h-10 flex items-center px-4 z-20 bg-background/30 backdrop-blur-sm sm:hidden">
          <Breadcrumbs 
            navigation={navigation}
            onNavigateToRoot={navigateToRoot}
            onNavigateToCategory={navigateToCategory}
          />
        </div>
      )}

      {/* 3D Canvas */}
      <div className="absolute inset-0 pt-16">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {navigation.level === 'root' ? 'Loading your universe...' : 'Entering category...'}
              </p>
            </div>
          </div>
        ) : (
          <KnowledgeSphere 
            topics={topics}
            subtopics={subtopics}
            level={navigation.level}
            activeTopic={navigation.activeTopic}
            onTopicClick={handleTopicClick}
            onSubtopicClick={handleSubtopicClick}
          />
        )}
      </div>

      {/* Empty state */}
      {showEmptyState && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center px-4">
            {navigation.level === 'root' ? (
              <>
                <p className="text-lg text-muted-foreground mb-2">Your universe is empty</p>
                <p className="text-sm text-muted-foreground/70">Tap the + button to add your first topic</p>
              </>
            ) : (
              <>
                <p className="text-lg text-muted-foreground mb-2">No sub-topics yet</p>
                <p className="text-sm text-muted-foreground/70">Tap the + button to add a sub-topic</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Controls hint */}
      {!isLoading && !showEmptyState && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <p className="text-xs text-muted-foreground/60 text-center">
            {navigation.level === 'root' 
              ? 'Drag to rotate • Scroll/pinch to zoom • Click nodes to explore'
              : 'Click sub-topic nodes to open editor'}
          </p>
        </div>
      )}

      {/* Add topic/subtopic button */}
      {navigation.level === 'root' ? (
        <AddTopicDialog onAdd={addTopic} />
      ) : (
        <AddSubtopicButton onAdd={addSubtopic} />
      )}
    </div>
  );
}

interface AddSubtopicButtonProps {
  onAdd: (name: string) => Promise<{ error?: Error | null }>;
}

function AddSubtopicButton({ onAdd }: AddSubtopicButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    
    setIsAdding(true);
    const { error } = await onAdd(name.trim());
    setIsAdding(false);

    if (error) {
      toast.error('Failed to add sub-topic');
      return;
    }

    toast.success('Sub-topic added!');
    setName('');
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Sub-topic</h2>
            <input
              type="text"
              placeholder="Sub-topic name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
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
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
