import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { Category } from '@/types/knowledge';
import { toast } from 'sonner';

interface CategoryContextMenuProps {
  category: Category;
  onDelete: (id: string) => Promise<{ error?: any }>;
  onClose: () => void;
  position: { x: number; y: number };
}

export function CategoryContextMenu({ 
  category, 
  onDelete, 
  onClose,
  position 
}: CategoryContextMenuProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await onDelete(category.id);
    setIsDeleting(false);
    
    if (error) {
      toast.error('Failed to delete category');
    } else {
      toast.success('Category deleted');
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Context Menu */}
      <div 
        className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
        style={{ 
          left: position.x, 
          top: position.y,
          transform: 'translate(-50%, -100%)'
        }}
      >
        <div className="px-3 py-2 border-b border-border">
          <p className="text-sm font-medium text-foreground truncate max-w-[140px]">
            {category.name}
          </p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{category.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {category.parent_id ? 'subcategory' : 'category'} and all its contents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
