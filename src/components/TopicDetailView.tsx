import { useState } from 'react';
import { Topic, Subtopic, Entry, NavigationState } from '@/types/knowledge';
import { useEntries } from '@/hooks/useEntries';
import { Breadcrumbs } from './Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, FileText, X, Calendar, Tag, Loader2, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TopicDetailViewProps {
  topic: Topic;
  subtopic: Subtopic;
  onBack: () => void;
  navigation: NavigationState;
  onNavigateToRoot: () => void;
  onNavigateToCategory: () => void;
}

export function TopicDetailView({ 
  topic, 
  subtopic, 
  onBack,
  navigation,
  onNavigateToRoot,
  onNavigateToCategory
}: TopicDetailViewProps) {
  const { entries, loading, addEntry, deleteEntry } = useEntries(subtopic.id);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', tags: '' });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddEntry = async () => {
    if (!newEntry.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsAdding(true);
    const tags = newEntry.tags.split(',').map(t => t.trim()).filter(Boolean);
    const { error } = await addEntry(newEntry.title.trim(), newEntry.content.trim(), tags);
    setIsAdding(false);

    if (error) {
      toast.error('Failed to add entry');
      return;
    }

    toast.success('Entry added!');
    setNewEntry({ title: '', content: '', tags: '' });
    setIsAddDialogOpen(false);
  };

  const handleDeleteEntry = async (id: string) => {
    const { error } = await deleteEntry(id);
    if (error) {
      toast.error('Failed to delete entry');
      return;
    }
    toast.success('Entry deleted');
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center px-4 md:px-8 border-b border-border/50 bg-background/90 backdrop-blur-md z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <Breadcrumbs 
            navigation={navigation}
            onNavigateToRoot={onNavigateToRoot}
            onNavigateToCategory={onNavigateToCategory}
          />
        </div>
      </div>

      {/* Content */}
      <div className="pt-16 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
          {/* Subtopic header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: topic.color }}
              />
              <h1 className="text-xl md:text-2xl font-semibold text-foreground">
                {subtopic.name}
              </h1>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Entry</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>New Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Title"
                    value={newEntry.title}
                    onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                    className="bg-background/50 border-border"
                  />
                  <Textarea
                    placeholder="Content..."
                    value={newEntry.content}
                    onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                    className="bg-background/50 border-border min-h-[120px]"
                  />
                  <Input
                    placeholder="Tags (comma separated)"
                    value={newEntry.tags}
                    onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                    className="bg-background/50 border-border"
                  />
                  <Button onClick={handleAddEntry} disabled={isAdding} className="w-full bg-primary hover:bg-primary/90">
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Entry'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Entries grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No entries yet</p>
              <p className="text-sm opacity-70">Add your first knowledge entry above!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <Card key={entry.id} className="bg-card/80 border-border/50 group relative overflow-hidden hover:border-primary/30 transition-colors">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={() => handleDeleteEntry(entry.id)}
                  >
                    <X className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-foreground line-clamp-2">
                      {entry.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {entry.content && (
                      <p className="text-sm text-muted-foreground line-clamp-4">{entry.content}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(entry.created_at), 'MMM d, yyyy')}
                    </div>

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {entry.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
