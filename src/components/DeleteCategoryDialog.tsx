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

interface DeleteCategoryDialogProps {
  category: Category;
  onDelete: (id: string) => Promise<{ error?: any }>;
  onSuccess?: () => void;
  variant?: 'icon' | 'full';
}

export function DeleteCategoryDialog({ 
  category, 
  onDelete, 
  onSuccess,
  variant = 'icon' 
}: DeleteCategoryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await onDelete(category.id);
    setIsDeleting(false);
    
    if (!error) {
      setIsOpen(false);
      onSuccess?.();
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size={variant === 'icon' ? 'icon' : 'sm'}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Trash2 className="w-4 h-4" />
            {variant === 'full' && <span className="ml-2">Delete</span>}
          </>
        )}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
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
