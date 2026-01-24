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
        "absolute right-4 z-10 pointer-events-none",
        "animate-fade-in",
        className
      )}
    >
      <div 
        className="px-3 py-1.5 rounded-full backdrop-blur-md bg-background/70 border border-border/20 shadow-sm"
      >
        <div className="flex items-center gap-2">
          {/* Color indicator dot */}
          <div 
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: focusedNode.color }}
          />
          {/* Node name */}
          <span 
            key={focusedNode.id}
            className="text-xs font-medium text-foreground/80 whitespace-nowrap animate-fade-in"
          >
            {focusedNode.name}
          </span>
        </div>
      </div>
    </div>
  );
}