import { useState, useCallback } from 'react';
import { KnowledgeSphere } from './KnowledgeSphere';
import { AddCategoryDialog } from './AddCategoryDialog';
import { TopicDetailView } from './TopicDetailView';
import { Breadcrumbs } from './Breadcrumbs';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import { Category, NavigationState, ViewLevel } from '@/types/knowledge';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Brain, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface UniverseViewProps {
  onLogout: () => void;
}

export function UniverseView({ onLogout }: UniverseViewProps) {
  const { user, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [overlayInteracting, setOverlayInteracting] = useState(false);
  
  // Navigation state machine
  const [navigation, setNavigation] = useState<NavigationState>({
    level: 'root',
    activeCategory: null,
    activeSubcategory: null
  });

  // Fetch main categories (parent_id is null)
  const { categories, loading: categoriesLoading, addCategory: addMainCategory } = useCategories(
    user?.id,
    null
  );

  // Fetch subcategories for the active category
  const { categories: subcategories, loading: subcategoriesLoading, addCategory: addSubcategory } = useCategories(
    user?.id,
    navigation.activeCategory?.id || null
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    signOut();
    toast.success('Logged out successfully');
    onLogout();
  };

  // Navigation handlers
  const navigateToRoot = useCallback(() => {
    setNavigation({
      level: 'root',
      activeCategory: null,
      activeSubcategory: null
    });
  }, []);

  const navigateToCategory = useCallback(() => {
    setNavigation(prev => ({
      ...prev,
      level: 'category',
      activeSubcategory: null
    }));
  }, []);

  const handleCategoryClick = useCallback((category: Category) => {
    setNavigation({
      level: 'category',
      activeCategory: category,
      activeSubcategory: null
    });
  }, []);

  const handleSubcategoryClick = useCallback((subcategory: Category) => {
    setNavigation(prev => ({
      ...prev,
      level: 'editor',
      activeSubcategory: subcategory
    }));
  }, []);

  const handleBackFromEditor = useCallback(() => {
    setNavigation(prev => ({
      ...prev,
      level: 'category',
      activeSubcategory: null
    }));
  }, []);

  const handleAddCategory = async (name: string, color: string) => {
    return addMainCategory(name, color, null);
  };

  const handleAddSubcategory = async (name: string, color: string) => {
    return addSubcategory(name, color, navigation.activeCategory?.id || null);
  };

  // Show editor overlay when at level 3
  if (navigation.level === 'editor' && navigation.activeCategory && navigation.activeSubcategory && user) {
    return (
      <TopicDetailView 
        category={navigation.activeCategory} 
        subcategory={navigation.activeSubcategory}
        userId={user.id}
        onBack={handleBackFromEditor}
        navigation={navigation}
        onNavigateToRoot={navigateToRoot}
        onNavigateToCategory={navigateToCategory}
        onOverlayInteraction={setOverlayInteracting}
      />
    );
  }

  const isLoading = categoriesLoading || (navigation.level === 'category' && subcategoriesLoading);
  const showEmptyState = !isLoading && (
    (navigation.level === 'root' && categories.length === 0) ||
    (navigation.level === 'category' && subcategories.length === 0)
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
            categories={categories}
            subcategories={subcategories}
            level={navigation.level}
            activeCategory={navigation.activeCategory}
            onCategoryClick={handleCategoryClick}
            onSubcategoryClick={handleSubcategoryClick}
            controlsEnabled={!overlayInteracting}
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
                <p className="text-sm text-muted-foreground/70">Tap the + button to add your first category</p>
              </>
            ) : (
              <>
                <p className="text-lg text-muted-foreground mb-2">No sub-categories yet</p>
                <p className="text-sm text-muted-foreground/70">Tap the + button to add a sub-category</p>
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
              : 'Click sub-category nodes to open editor'}
          </p>
        </div>
      )}

      {/* Add category/subcategory button */}
      {navigation.level === 'root' ? (
        <AddCategoryDialog onAdd={handleAddCategory} />
      ) : (
        <AddCategoryDialog 
          onAdd={handleAddSubcategory} 
          parentId={navigation.activeCategory?.id}
        />
      )}
    </div>
  );
}
