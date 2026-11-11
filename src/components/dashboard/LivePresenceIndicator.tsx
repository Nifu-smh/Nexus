import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { IconWifi, IconWifiOff, IconUsers, IconCircleFilled } from '@tabler/icons-react';

export const LivePresenceIndicator: React.FC = () => {
  const { realtimeStatus, activeCollaborators, currentWorkspace } = useWorkspace();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!currentWorkspace) return null;

  const count = activeCollaborators.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen(prev => !prev)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-all cursor-pointer select-none group"
        title="Real-Time Live Collaboration Status"
      >
        {realtimeStatus === 'connected' ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        ) : realtimeStatus === 'connecting' ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
        ) : (
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400" />
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline font-semibold text-[11px]">
            {realtimeStatus === 'connected'
              ? count > 1
                ? `${count} Active`
                : 'Live Sync'
              : realtimeStatus === 'connecting'
              ? 'Connecting...'
              : 'Local Cache'}
          </span>

          {/* Collaborator Avatars facepile */}
          {count > 0 && (
            <div className="flex items-center -space-x-1.5 overflow-hidden ml-0.5">
              {activeCollaborators.slice(0, 3).map((collab, i) => {
                const initials = (collab.name || 'User').slice(0, 2).toUpperCase();
                return (
                  <div
                    key={collab.userId || i}
                    className="w-5 h-5 rounded-full bg-primary/20 text-primary border border-background flex items-center justify-center text-[9px] font-bold shadow-xs shrink-0"
                    title={`${collab.name} (Online)`}
                  >
                    {collab.avatarUrl ? (
                      <img
                        src={collab.avatarUrl}
                        alt={collab.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                );
              })}
              {count > 3 && (
                <div className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                  +{count - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-card shadow-xl p-3 z-50 text-xs animate-in fade-in duration-100 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-1.5">
                <IconWifi className="size-3.5 text-emerald-500" />
                <span className="font-bold text-foreground">Live Collaboration</span>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  realtimeStatus === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600'
                }`}
              >
                {realtimeStatus === 'connected' ? 'WebSocket Active' : 'Connecting'}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1.5">
                <span>Active in Workspace</span>
                <span>{count} online</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {activeCollaborators.length > 0 ? (
                  activeCollaborators.map((c, idx) => (
                    <div
                      key={c.userId || idx}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                          {(c.name || 'User').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-foreground truncate text-[11px]">
                            {c.name}
                          </p>
                          {c.email && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {c.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                        <IconCircleFilled className="size-1.5" />
                        <span>Online</span>
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground italic py-1">
                    No other users active right now
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border text-[10px] text-muted-foreground leading-relaxed">
              Moves on Kanban, task updates, and comments sync instantly across all connected devices and tabs in real-time.
            </div>
          </div>
        </>
      )}
    </div>
  );
};
