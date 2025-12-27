import { useState } from 'react';
import { Topic, Subtopic, Entry } from '@/types/knowledge';
import { useSubtopics } from '@/hooks/useSubtopics';
import { useEntries } from '@/hooks/useEntries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Folder, FileText, Trash2, X, Calendar, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TopicDetailViewProps {
  topic: Topic;
  onBack: () => void;
}

export function TopicDetailView({ topic, onBack }: TopicDetailViewProps) {
  const { subtopics, loading: subtopicsLoading, addSubtopic, deleteSubtopic } = useSubtopics(topic.id);
  const [selectedSubtopic, setSelectedSubtopic] = useState<Subtopic | null>(null);
  const [newSubtopicName, setNewSubtopicName] = useState('');
  const [isAddingSubtopic, setIsAddingSubtopic] = useState(false);

  const handleAddSubtopic = async () => {
    if (!newSubtopicName.trim()) return;
    
    setIsAddingSubtopic(true);
    const { error } = await addSubtopic(newSubtopicName.trim());
    setIsAddingSubtopic(false);

    if (error) {
      toast.error('Failed to add subtopic');
      return;
    }

    toast.success('Subtopic added!');
    setNewSubtopicName('');
  };

  const handleDeleteSubtopic = async (id: string) => {
    const { error } = await deleteSubtopic(id);
    if (error) {
      toast.error('Failed to delete subtopic');
      return;
    }
    if (selectedSubtopic?.id === id) {
      setSelectedSubtopic(null);
    }
    toast.success('Subtopic deleted');
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 md:h-20 flex items-center px-4 md:px-8 border-b border-border/50 bg-background/80 backdrop-blur-sm z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Universe</span>
        </Button>
        
        <div className="flex items-center gap-3 ml-4">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: topic.color }}
          />
          <h1 className="text-lg md:text-xl font-semibold text-foreground">{topic.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="pt-16 md:pt-20 h-full flex flex-col md:flex-row">
        {/* Subtopics sidebar */}
        <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-border/50 p-4 md:p-6 overflow-y-auto flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Sub-topics</h2>
          </div>

          {/* Add subtopic input */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="New sub-topic..."
              value={newSubtopicName}
              onChange={(e) => setNewSubtopicName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubtopic()}
              className="bg-card/50 border-border/50"
            />
            <Button
              size="icon"
              onClick={handleAddSubtopic}
              disabled={isAddingSubtopic || !newSubtopicName.trim()}
              className="bg-primary/80 hover:bg-primary flex-shrink-0"
            >
              {isAddingSubtopic ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Subtopics list */}
          <div className="space-y-2">
            {subtopicsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : subtopics.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No sub-topics yet. Add one above!
              </p>
            ) : (
              subtopics.map((subtopic) => (
                <div
                  key={subtopic.id}
                  className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    selectedSubtopic?.id === subtopic.id
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-card/50 border border-transparent hover:bg-card hover:border-border/50'
                  }`}
                  onClick={() => setSelectedSubtopic(subtopic)}
                >
                  <Folder className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground truncate flex-1">{subtopic.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSubtopic(subtopic.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Entries panel */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {selectedSubtopic ? (
            <EntriesPanel subtopic={selectedSubtopic} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a sub-topic to view entries</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface EntriesPanelProps {
  subtopic: Subtopic;
}

function EntriesPanel({ subtopic }: EntriesPanelProps) {
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-foreground">{subtopic.name}</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Add Entry
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No entries yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="bg-card/80 border-border/50 group relative overflow-hidden">
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
                  <p className="text-sm text-muted-foreground line-clamp-3">{entry.content}</p>
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
  );
}
