import { useState, useRef } from 'react';
import { Category, Entry, NavigationState } from '@/types/knowledge';
import { useEntries } from '@/hooks/useEntries';
import { useCategories } from '@/hooks/useCategories';
import { Breadcrumbs } from './Breadcrumbs';
import { EditEntryDialog } from './EditEntryDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, FileText, X, Calendar, Tag, Loader2, Brain, ImagePlus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TopicDetailViewProps {
  category: Category;
  subcategory: Category;
  userId: string;
  onBack: () => void;
  navigation: NavigationState;
  onNavigateToRoot: () => void;
  onNavigateToCategory: () => void;
  onOverlayInteraction: (interacting: boolean) => void;
  onDeleteSubcategory?: () => void;
}

export function TopicDetailView({ 
  category, 
  subcategory, 
  userId,
  onBack,
  navigation,
  onNavigateToRoot,
  onNavigateToCategory,
  onOverlayInteraction,
  onDeleteSubcategory
}: TopicDetailViewProps) {
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useEntries(userId, subcategory.id);
  const { deleteCategory } = useCategories(userId, category.id);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', tags: '', imageDescription: '' });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteSubcategory = async () => {
    setIsDeleting(true);
    const { error } = await deleteCategory(subcategory.id);
    setIsDeleting(false);
    
    if (error) {
      toast.error('Failed to delete subcategory');
      return;
    }
    
    toast.success('Subcategory deleted');
    onDeleteSubcategory?.();
    onBack();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.title.trim() && !selectedImage) {
      toast.error('Please enter a title or add an image');
      return;
    }

    setIsAdding(true);
    const tags = newEntry.tags.split(',').map(t => t.trim()).filter(Boolean);
    const { error } = await addEntry(
      newEntry.title.trim() || 'Untitled',
      newEntry.content.trim(),
      tags,
      selectedImage || undefined,
      newEntry.imageDescription.trim() || undefined
    );
    setIsAdding(false);

    if (error) {
      toast.error('Failed to add entry');
      return;
    }

    toast.success('Entry added!');
    setNewEntry({ title: '', content: '', tags: '', imageDescription: '' });
    setSelectedImage(null);
    setImagePreview(null);
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

  const handleUpdateEntry = async (id: string, updates: Partial<Entry>) => {
    const { error } = await updateEntry(id, updates);
    if (error) {
      toast.error('Failed to update entry');
      return { error };
    }
    toast.success('Entry updated');
    return {};
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-background z-50 overflow-hidden"
      onMouseEnter={() => onOverlayInteraction(true)}
      onMouseLeave={() => onOverlayInteraction(false)}
      onTouchStart={() => onOverlayInteraction(true)}
    >
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

        {/* Delete subcategory button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{subcategory.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this subcategory and all its entries. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSubcategory}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Content */}
      <div className="pt-16 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
          {/* Subcategory header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <h1 className="text-xl md:text-2xl font-semibold text-foreground">
                {subcategory.name}
              </h1>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Entry</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
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
                  
                  {/* Image upload */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg border border-border/50"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                          onClick={clearImage}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full h-24 border-dashed border-border/50 gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImagePlus className="w-5 h-5 text-muted-foreground" />
                        <span className="text-muted-foreground">Add Photo</span>
                      </Button>
                    )}

                    {imagePreview && (
                      <Input
                        placeholder="Photo description/credits (e.g., Architect: Zaha Hadid)"
                        value={newEntry.imageDescription}
                        onChange={(e) => setNewEntry({ ...newEntry, imageDescription: e.target.value })}
                        className="mt-2 bg-background/50 border-border text-sm"
                      />
                    )}
                  </div>

                  <Textarea
                    placeholder="Notes..."
                    value={newEntry.content}
                    onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                    className="bg-background/50 border-border min-h-[100px]"
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

          {/* Masonry Grid */}
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
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {entries.map((entry) => (
                <div 
                  key={entry.id} 
                  className="break-inside-avoid bg-card/80 border border-border/50 rounded-xl overflow-hidden group relative hover:border-primary/30 transition-colors"
                >
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 bg-background/80 hover:bg-background"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <Pencil className="w-3.5 h-3.5 text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 bg-background/80 hover:bg-background"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>

                  {entry.image_url && (
                    <div className="relative">
                      <img 
                        src={entry.image_url} 
                        alt={entry.title}
                        className="w-full object-cover"
                        loading="lazy"
                      />
                      {entry.image_description && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-3">
                          <p className="text-xs text-foreground/80 italic">
                            {entry.image_description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <h3 className="font-medium text-foreground line-clamp-2">
                      {entry.title}
                    </h3>

                    {entry.content && (
                      <p className="text-sm text-muted-foreground line-clamp-4">
                        {entry.content}
                      </p>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Entry Dialog */}
      {editingEntry && (
        <EditEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          onSave={handleUpdateEntry}
        />
      )}
    </div>
  );
}
