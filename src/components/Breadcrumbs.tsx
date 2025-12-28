import { ChevronRight, Globe } from 'lucide-react';
import { NavigationState } from '@/types/knowledge';

interface BreadcrumbsProps {
  navigation: NavigationState;
  onNavigateToRoot: () => void;
  onNavigateToCategory: () => void;
}

export function Breadcrumbs({ navigation, onNavigateToRoot, onNavigateToCategory }: BreadcrumbsProps) {
  const { level, activeCategory, activeSubcategory } = navigation;

  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto">
      <button
        onClick={onNavigateToRoot}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <Globe className="w-4 h-4" />
        <span>Universe</span>
      </button>

      {activeCategory && (
        <>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <button
            onClick={onNavigateToCategory}
            className={`truncate max-w-[120px] sm:max-w-[200px] flex items-center gap-2 ${
              level === 'category' 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground hover:text-foreground transition-colors'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeCategory.color }}
            />
            {activeCategory.name}
          </button>
        </>
      )}

      {activeSubcategory && (
        <>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-foreground font-medium truncate max-w-[120px] sm:max-w-[200px]">
            {activeSubcategory.name}
          </span>
        </>
      )}
    </nav>
  );
}
