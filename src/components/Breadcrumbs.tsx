import { ChevronRight } from 'lucide-react';
import { NavigationState, Topic, Subtopic } from '@/types/knowledge';

interface BreadcrumbsProps {
  navigation: NavigationState;
  onNavigateToRoot: () => void;
  onNavigateToCategory: () => void;
}

export function Breadcrumbs({ navigation, onNavigateToRoot, onNavigateToCategory }: BreadcrumbsProps) {
  const { level, activeTopic, activeSubtopic } = navigation;

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={onNavigateToRoot}
        className={`px-2 py-1 rounded transition-colors ${
          level === 'root'
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Universe
      </button>

      {(level === 'category' || level === 'editor') && activeTopic && (
        <>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={onNavigateToCategory}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-2 ${
              level === 'category'
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: activeTopic.color }}
            />
            {activeTopic.name}
          </button>
        </>
      )}

      {level === 'editor' && activeSubtopic && (
        <>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="px-2 py-1 text-foreground font-medium">
            {activeSubtopic.name}
          </span>
        </>
      )}
    </div>
  );
}
