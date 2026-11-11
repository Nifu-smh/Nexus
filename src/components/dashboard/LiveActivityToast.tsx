import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { IconSparkles, IconArrowsExchange, IconPlus, IconMessageDots, IconTrash } from '@tabler/icons-react';

export const LiveActivityToast: React.FC = () => {
  const { recentLiveEvent } = useWorkspace();

  if (!recentLiveEvent) return null;

  const iconMap = {
    TASK_MOVED: <IconArrowsExchange className="size-4 text-blue-500 shrink-0" />,
    TASK_CREATED: <IconPlus className="size-4 text-emerald-500 shrink-0" />,
    TASK_UPDATED: <IconSparkles className="size-4 text-purple-500 shrink-0" />,
    TASK_DELETED: <IconTrash className="size-4 text-rose-500 shrink-0" />,
    COMMENT_ADDED: <IconMessageDots className="size-4 text-amber-500 shrink-0" />,
  };

  return (
    <aside
      aria-label="Live workspace update"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-border bg-card/95 backdrop-blur-md p-3.5 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-200"
    >
      <div className="w-8 h-8 rounded-xl bg-muted/80 flex items-center justify-center shrink-0">
        {iconMap[recentLiveEvent.type] || <IconSparkles className="size-4 text-primary shrink-0" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Live Workspace Update
          </span>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
        </div>
        <p className="text-xs font-semibold text-foreground line-clamp-1">
          {recentLiveEvent.message}
        </p>
      </div>
    </aside>
  );
};
