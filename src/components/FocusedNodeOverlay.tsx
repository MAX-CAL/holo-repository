import { Category } from '@/types/knowledge';
import { cn } from '@/lib/utils';

interface FocusedNodeOverlayProps {
  focusedNode: Category | null;
  className?: string;
}

export function FocusedNodeOverlay({ focusedNode, className }: FocusedNodeOverlayProps) {
  if (!focusedNode) return null;

  return (
    <div 
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-30 pointer-events-none",
        "animate-fade-in",
        className
      )}
    >
      <div 
        className="px-4 py-2 rounded-full backdrop-blur-md bg-background/80 border border-border/30 shadow-lg"
      >
        <div className="flex items-center gap-2">
          {/* Color indicator dot */}
          <div 
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: focusedNode.color }}
          />
          {/* Node name */}
          <span 
            key={focusedNode.id}
            className="text-sm font-medium text-foreground whitespace-nowrap animate-fade-in"
          >
            {focusedNode.name}
          </span>
        </div>
      </div>
    </div>
  );
}
