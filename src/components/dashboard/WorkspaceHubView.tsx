import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { Workspace, TaskPriority } from '../../types/index.ts';
import { SpotlightTutorial } from './SpotlightTutorial.tsx';
import { LivePresenceIndicator } from './LivePresenceIndicator.tsx';
import { LiveActivityToast } from './LiveActivityToast.tsx';

interface WorkspaceHubViewProps {
  onLaunchWorkspace?: (workspace: Workspace) => void;
  onOpenSprints?: () => void;
  onOpenDocumentation?: () => void;
}

export const WorkspaceHubView: React.FC<WorkspaceHubViewProps> = ({
  onLaunchWorkspace,
}) => {
  const { user, logout } = useAuth();
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    createWorkspace,
    joinWorkspaceWithCode,
    loadDemoData,
    clearAllData,
    tasks,
    createTask,
    moveTaskStatus,
    hasCompletedOnboarding,
    completeOnboarding,
    resetOnboarding,
    realtimeStatus,
    activeCollaborators,
  } = useWorkspace();

  // Sidebar expand / shrink state
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nexus_sidebar_expanded') === 'true';
    } catch {
      return false; // Default shrunk
    }
  });

  const toggleSidebar = () => {
    setIsSidebarExpanded(prev => {
      const next = !prev;
      try {
        localStorage.setItem('nexus_sidebar_expanded', String(next));
      } catch {}
      return next;
    });
  };

  // Active navigation index for the smooth sliding purple overlay
  const [activeNavIndex, setActiveNavIndex] = useState(0);

  // Modals and interactive views state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsTemplate, setNewWsTemplate] = useState<'kanban' | 'sandbox'>('kanban');
  const [newWsRepo, setNewWsRepo] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Active Workspace Sprint Drawer / Modal
  const [activeSprintWorkspace, setActiveSprintWorkspace] = useState<Workspace | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);

  // Specs Modal
  const [showSpecsModal, setShowSpecsModal] = useState(false);

  // Join code state
  const [joinCode, setJoinCode] = useState('');
  const [joinFeedback, setJoinFeedback] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // User menu & Spotlight tutorial state
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTutorial, setShowTutorial] = useState(!hasCompletedOnboarding);

  // Active tab in top nav
  const [activeNav, setActiveNav] = useState<'workspaces' | 'projects' | 'activity' | 'documentation'>('workspaces');

  const displayName = user?.name || user?.email?.split('@')[0] || 'Engineer';
  const userInitials = displayName.slice(0, 2).toUpperCase();

  // Handle New Workspace Creation
  const handleProvisionWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    setIsProvisioning(true);
    const res = await createWorkspace(
      newWsName.trim(),
      newWsName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    );

    setTimeout(() => {
      setIsProvisioning(false);
      setShowCreateModal(false);
      setNewWsName('');
      setNewWsRepo('');
      if (res.success && res.workspace) {
        setCurrentWorkspace(res.workspace);
        setActiveSprintWorkspace(res.workspace);
        onLaunchWorkspace?.(res.workspace);
      }
    }, 500);
  };

  // Handle Join Workspace
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoinError(null);
    setJoinFeedback(null);

    const res = await joinWorkspaceWithCode(joinCode.trim());
    if (res.success && res.workspace) {
      setJoinFeedback(`Access verified for "${res.workspace.name}". Connecting...`);
      setJoinCode('');
      setTimeout(() => {
        setJoinFeedback(null);
        setCurrentWorkspace(res.workspace!);
        setActiveSprintWorkspace(res.workspace!);
        onLaunchWorkspace?.(res.workspace!);
      }, 700);
    } else {
      setJoinError(res.error || 'Invalid workspace token. Try code e.g. NX-DEMO-01');
    }
  };

  // Handle Launching a Workspace
  const handleOpenWorkspace = (ws: Workspace) => {
    setCurrentWorkspace(ws);
    setActiveSprintWorkspace(ws);
    onLaunchWorkspace?.(ws);
  };

  // Handle Creating a Task in Active Sprint
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeSprintWorkspace) return;

    await createTask({
      projectId: activeSprintWorkspace.id,
      title: newTaskTitle.trim(),
      status: 'TODO',
      priority: newTaskPriority,
      creatorId: user?.id || 'usr_me',
    });

    setNewTaskTitle('');
    setShowAddTaskForm(false);
  };

  // Metrics computation — ZERO hardcoded mockup figures
  const activeWorkspacesCount = workspaces.length;
  const ownerCount = workspaces.filter(w => w.ownerId === user?.id).length;
  const memberCount = Math.max(0, activeWorkspacesCount - ownerCount);
  const totalTasksCount = tasks.length;
  const highPriorityTasks = tasks.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT').length;
  const completedTasksCount = tasks.filter(t => t.status === 'DONE').length;

  // Navigation Items config
  const navItems = [
    { id: 'workspaces', label: 'Workspaces Directory', icon: 'grid_view' },
    { id: 'sprints', label: 'Active Sprints', icon: 'folder_open' },
    { id: 'velocity', label: 'Live Velocity', icon: 'insights' },
    { id: 'docs', label: 'Specifications', icon: 'library_books' },
    { id: 'new', label: 'New Workspace', icon: 'add_circle_outline' },
  ];

  const handleNavClick = (index: number, id: string) => {
    setActiveNavIndex(index);
    if (id === 'workspaces') {
      setActiveNav('workspaces');
      setActiveSprintWorkspace(null);
    } else if (id === 'sprints') {
      if (workspaces.length > 0) {
        handleOpenWorkspace(currentWorkspace || workspaces[0]);
      } else {
        setShowCreateModal(true);
      }
    } else if (id === 'velocity') {
      setActiveSprintWorkspace(null);
      const el = document.getElementById('activity-feed-section');
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (id === 'docs') {
      setShowSpecsModal(true);
    } else if (id === 'new') {
      setShowCreateModal(true);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen selection:bg-primary-container selection:text-on-primary-container flex flex-col">
      {/* Top Header */}
      <header
        data-tour="header-nav"
        className="fixed top-0 inset-x-0 h-16 z-40 bg-surface-container-low/90 backdrop-blur-xl border-b border-outline-variant/30"
      >
        <div className="w-full h-16 px-4 md:px-6 flex items-center justify-between gap-4 md:gap-6">
          {/* Brand Mark, Sidebar Toggle & Nav Tabs */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Sidebar Expand / Collapse Toggle in Header */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer flex items-center justify-center shrink-0"
              title={isSidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
              <span className="material-symbols-outlined text-[22px] leading-none">
                {isSidebarExpanded ? 'menu_open' : 'menu'}
              </span>
            </button>

            <a
              href="#workspaces"
              onClick={e => {
                e.preventDefault();
                setActiveNav('workspaces');
                setActiveNavIndex(0);
              }}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <img
                src="/nexus-logo.svg"
                alt="NEXUS logo"
                className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <span className="font-display font-bold text-lg text-on-surface tracking-tight group-hover:text-primary transition-colors">
                NEXUS
              </span>
            </a>

            <span className="hidden md:inline-block w-px h-5 bg-outline-variant/40" />

            <nav className="hidden lg:flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveNav('workspaces');
                  setActiveNavIndex(0);
                }}
                className={`px-4 py-1.5 transition-all text-xs font-semibold rounded-lg cursor-pointer ${
                  activeNav === 'workspaces'
                    ? 'bg-surface-container-high text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                Workspaces
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('projects');
                  setActiveNavIndex(1);
                  if (workspaces.length > 0) {
                    handleOpenWorkspace(workspaces[0]);
                  } else {
                    setShowCreateModal(true);
                  }
                }}
                className={`px-4 py-1.5 transition-all text-xs font-semibold rounded-lg cursor-pointer ${
                  activeNav === 'projects'
                    ? 'bg-surface-container-high text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                Projects
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('activity');
                  setActiveNavIndex(2);
                  const el = document.getElementById('activity-feed-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-4 py-1.5 transition-all text-xs font-semibold rounded-lg cursor-pointer ${
                  activeNav === 'activity'
                    ? 'bg-surface-container-high text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                Activity
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('documentation');
                  setActiveNavIndex(3);
                  setShowSpecsModal(true);
                }}
                className={`px-4 py-1.5 transition-all text-xs font-semibold rounded-lg cursor-pointer ${
                  activeNav === 'documentation'
                    ? 'bg-surface-container-high text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                Documentation
              </button>
            </nav>
          </div>

          {/* Search, Notifications, Help & Profile */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="hidden sm:flex items-center justify-between w-60 md:w-72 h-9 px-3 bg-surface-container rounded-lg border border-outline-variant/40 hover:border-primary-container focus-within:border-primary-container transition-all">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span className="font-body text-xs text-outline">Search workspaces, tasks...</span>
              </div>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-surface-container-highest rounded text-[10px] font-semibold text-on-surface-variant">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>

            {/* Realtime Live Collaboration Presence Pill */}
            <LivePresenceIndicator />

            {/* Notification Bell */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary-container ring-2 ring-surface-container-low" />
            </button>

            {/* Spotlight Help Button */}
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              aria-label="Help and tutorial"
              title="Start Spotlight Tutorial"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all text-xs font-medium cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">help_outline</span>
              <span className="hidden md:inline">Tour</span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative pl-1 border-l border-outline-variant/30">
              <button
                type="button"
                onClick={() => setShowUserMenu(prev => !prev)}
                className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-surface-container transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs transition-transform hover:scale-105">
                  {userInitials}
                </div>
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                  expand_more
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-11 w-60 rounded-2xl bg-surface-container-high border border-outline-variant/30 p-2 shadow-2xl z-50 animate-entrance">
                  <div className="px-3 py-2 border-b border-outline-variant/20 mb-1">
                    <p className="font-semibold text-xs text-on-surface truncate">{displayName}</p>
                    <p className="text-[11px] text-outline truncate">{user?.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowTutorial(true);
                      resetOnboarding();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>Replay Spotlight Tour</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowCreateModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    <span>New Workspace</span>
                  </button>

                  {/* Clean Slate Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      clearAllData();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-secondary hover:bg-secondary/10 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
                    <span>Reset to Clean Slate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-error hover:bg-error/10 rounded-xl transition-colors text-left mt-1 border-t border-outline-variant/20 pt-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container with Collapsible Sidebar + Content */}
      <div className="flex-1 flex pt-16">
        {/* COLLAPSIBLE SIDEBAR: SHRINK & EXPAND WITH FLUID GLIDING OVERLAY & ACCURATE CENTER ALIGNMENT */}
        <aside
          data-tour="sidebar-nav"
          className={`fixed left-0 top-16 bottom-0 z-30 bg-surface-container-low/95 backdrop-blur-xl border-r border-outline-variant/30 flex flex-col justify-between py-4 select-none transition-[width,padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hidden md:flex overflow-y-auto overflow-x-hidden ${
            isSidebarExpanded ? 'w-64 px-3' : 'w-[72px] px-0 items-center'
          }`}
        >
          {/* Top: Workspace Initial Badge / Card */}
          <div className="w-full flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-center relative group">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className={`flex items-center rounded-2xl bg-surface-container/70 border border-outline-variant/20 hover:border-outline-variant/40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group ${
                  isSidebarExpanded
                    ? 'w-full h-11 px-2.5 gap-2.5 justify-start'
                    : 'size-11 aspect-square justify-center shrink-0 mx-auto p-0'
                }`}
                title={currentWorkspace?.name || 'NEXUS Central'}
              >
                <div className="size-8 aspect-square rounded-xl bg-primary-container text-on-primary-container font-display font-bold text-xs flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform mx-auto">
                  {currentWorkspace ? currentWorkspace.name.slice(0, 2).toUpperCase() : 'NX'}
                </div>
                <div
                  className={`text-left min-w-0 flex-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isSidebarExpanded
                      ? 'opacity-100 max-w-[145px] translate-x-0'
                      : 'opacity-0 max-w-0 pointer-events-none overflow-hidden -translate-x-2'
                  }`}
                >
                  <p className="font-semibold text-xs text-on-surface truncate">
                    {currentWorkspace?.name || 'NEXUS Central'}
                  </p>
                  <p className="text-[10px] text-outline truncate">
                    {workspaces.length > 0 ? `${workspaces.length} Environments` : 'Enterprise Hub'}
                  </p>
                </div>
                {isSidebarExpanded && (
                  <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary transition-colors shrink-0">
                    unfold_more
                  </span>
                )}
              </button>
              {!isSidebarExpanded && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-outline-variant/30">
                  {currentWorkspace?.name || 'NEXUS Central'}
                </div>
              )}
            </div>

            <span className={`h-px bg-outline-variant/30 transition-all duration-300 ${isSidebarExpanded ? 'w-full' : 'w-8'}`} />

            {/* Navigation Section with Smooth Sliding Purple Pill Overlay */}
            <div className={`w-full relative flex flex-col gap-2 ${isSidebarExpanded ? 'px-0' : 'items-center'}`}>
              {/* Smooth Gliding Purple Active Pill Indicator */}
              <div
                style={{
                  transform: `translate3d(0, ${activeNavIndex * 52}px, 0)`,
                  transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1), left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className={`absolute top-0 pointer-events-none rounded-2xl bg-primary-container shadow-md shadow-indigo-500/25 z-0 h-11 ${
                  isSidebarExpanded ? 'w-full left-0' : 'w-11 left-[14px]'
                }`}
              />

              {/* Navigation Items */}
              {navItems.map((item, index) => {
                const isActive = activeNavIndex === index;
                return (
                  <div key={item.id} className="w-full flex items-center justify-center relative group z-10">
                    <button
                      type="button"
                      onClick={() => handleNavClick(index, item.id)}
                      className={`cursor-pointer z-10 relative flex items-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isSidebarExpanded
                          ? 'w-full h-11 px-3 gap-3 rounded-2xl justify-start'
                          : 'size-11 aspect-square rounded-2xl justify-center shrink-0 mx-auto p-0'
                      } ${
                        isActive
                          ? 'text-on-primary-container font-bold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px] leading-none flex items-center justify-center shrink-0">
                        {item.icon}
                      </span>
                      <span
                        className={`text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isSidebarExpanded
                            ? 'opacity-100 max-w-[170px] translate-x-0'
                            : 'opacity-0 max-w-0 -translate-x-2'
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                    {!isSidebarExpanded && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-outline-variant/30">
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom: Realtime Sync, Tour Button, & Sidebar Collapse/Expand Toggle */}
          <div className="w-full flex flex-col items-center gap-2 pt-3 border-t border-outline-variant/20">
            {/* Realtime Sync Indicator */}
            <div className="w-full flex items-center justify-center relative group">
              {isSidebarExpanded ? (
                <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-surface-container-lowest/80 border border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tertiary pulse-ring-dot" />
                    <span className="text-[11px] font-semibold text-outline">Realtime Active</span>
                  </div>
                  <span className="material-symbols-outlined text-tertiary text-[16px]">cloud_done</span>
                </div>
              ) : (
                <div className="size-11 aspect-square rounded-2xl flex items-center justify-center shrink-0 mx-auto text-tertiary bg-surface-container-lowest/80 border border-outline-variant/20 relative">
                  <span className="material-symbols-outlined text-[20px] leading-none flex items-center justify-center">
                    cloud_done
                  </span>
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-tertiary pulse-ring-dot" />
                </div>
              )}
              {!isSidebarExpanded && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-outline-variant/30">
                  Syncing: Realtime
                </div>
              )}
            </div>

            {/* Spotlight Help */}
            <div className="w-full flex items-center justify-center relative group">
              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
                  isSidebarExpanded
                    ? 'w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    : 'size-11 aspect-square rounded-2xl flex items-center justify-center shrink-0 mx-auto p-0 text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[22px] leading-none flex items-center justify-center shrink-0">
                  help_outline
                </span>
                <span
                  className={`text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isSidebarExpanded
                      ? 'opacity-100 max-w-[170px] translate-x-0'
                      : 'opacity-0 max-w-0 -translate-x-2'
                  }`}
                >
                  Spotlight Tour
                </span>
              </button>
              {!isSidebarExpanded && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-outline-variant/30">
                  Start Spotlight Tour
                </div>
              )}
            </div>

            {/* Dedicated Expand / Shrink Toggle Button */}
            <div className="w-full flex items-center justify-center relative group">
              <button
                type="button"
                onClick={toggleSidebar}
                className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer text-outline hover:text-on-surface hover:bg-surface-container ${
                  isSidebarExpanded
                    ? 'w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium'
                    : 'size-11 aspect-square rounded-2xl flex items-center justify-center shrink-0 mx-auto p-0'
                }`}
                title={isSidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
              >
                {isSidebarExpanded ? (
                  <>
                    <span className="text-[11px] font-semibold text-outline">Collapse Sidebar</span>
                    <span className="material-symbols-outlined text-[20px] leading-none shrink-0">
                      keyboard_double_arrow_left
                    </span>
                  </>
                ) : (
                  <span className="material-symbols-outlined text-[22px] leading-none flex items-center justify-center shrink-0">
                    keyboard_double_arrow_right
                  </span>
                )}
              </button>
              {!isSidebarExpanded && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-outline-variant/30">
                  Expand Sidebar
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area (Fluid padding transition matching sidebar expand/shrink) */}
        <main
          className={`flex-1 min-h-screen bg-surface w-full p-4 sm:p-6 lg:p-8 pb-24 relative transition-[padding-left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isSidebarExpanded ? 'md:pl-64' : 'md:pl-[76px]'
          }`}
        >
          <div className="max-w-6xl mx-auto flex flex-col w-full relative">
            {/* Contained Ambient Glows */}
            <div className="absolute -top-10 left-1/4 w-80 h-80 bg-primary-container/10 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute top-48 right-10 w-72 h-72 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute bottom-10 left-10 w-80 h-80 bg-tertiary-container/10 rounded-full blur-3xl pointer-events-none -z-10" />

            {/* Header Section: Breadcrumb & Workspace Action Hub */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 animate-entrance anim-delay-1">
              <div className="flex flex-col gap-2 max-w-2xl">
                <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                  <span className="hover:text-primary transition-colors cursor-pointer text-outline font-medium">
                    Nexus Cloud
                  </span>
                  <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
                  <span className="text-primary font-medium">Workspaces Directory</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary text-[10px] font-semibold ml-1">
                    v4.8 Multi-Tenant
                  </span>
                </div>

                <h1 className="font-display font-bold text-2xl sm:text-3xl text-on-surface tracking-tight">
                  Welcome back, {displayName}
                </h1>
                <p className="font-body text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  Select an engineering workspace to resume sprint cycles, review pending PRs, or coordinate distributed development pipelines.
                </p>
              </div>

              {/* Action Buttons Hub */}
              <div data-tour="action-hub" className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('join-input-section');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const input = document.getElementById('workspace-code-input');
                    input?.focus();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold text-xs transition-all shadow-sm hover:shadow-md border border-outline-variant/30 active:scale-[0.98] group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary group-hover:rotate-12 transition-transform duration-300">
                    pin
                  </span>
                  <span>Join with Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-container text-on-primary-container font-semibold text-xs shadow-md hover:bg-primary hover:shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-[0.98] group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:rotate-90">
                    add_circle
                  </span>
                  <span>New Workspace</span>
                </button>
              </div>
            </div>

            {/* Metrics Row — Accurate Live Telemetry, ZERO Hardcoded Clutter */}
            <div data-tour="metrics-row" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Card 1: Workspaces Count */}
              <div className="relative overflow-hidden rounded-3xl bg-surface-container-low p-5 shadow-sm hover:bg-surface-container transition-all duration-300 group border border-outline-variant/20 hover:border-outline-variant/40 animate-entrance anim-delay-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                    Active Workspaces
                  </span>
                  <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[18px]">hub</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-display font-bold text-3xl text-on-surface">
                    {activeWorkspacesCount}
                  </span>
                  <span className="text-xs text-on-surface-variant">Total Connected</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                  <span className="inline-flex items-center gap-1 text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> {ownerCount} Owner
                  </span>
                  <span className="text-outline">/</span>
                  <span className="inline-flex items-center gap-1 text-on-surface-variant">
                    <span className="w-1.5 h-1.5 rounded-full bg-outline" /> {memberCount} Member
                  </span>
                  <span className="ml-auto text-tertiary flex items-center font-medium text-[11px]">
                    99.98% SLA
                  </span>
                </div>
              </div>

              {/* Card 2: Assigned Sprint Tasks */}
              <div className="relative overflow-hidden rounded-3xl bg-surface-container-low p-5 shadow-sm hover:bg-surface-container transition-all duration-300 group border border-outline-variant/20 hover:border-outline-variant/40 animate-entrance anim-delay-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                    Assigned Sprint Tasks
                  </span>
                  <div className="w-8 h-8 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[18px]">checklist_rtl</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-display font-bold text-3xl text-on-surface">
                    {totalTasksCount}
                  </span>
                  <span className="text-xs text-tertiary">Active in Flight</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary flex items-center gap-1 font-medium text-[11px]">
                    <span className="material-symbols-outlined text-[14px]">timer</span>
                    {highPriorityTasks} high priority
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px]">
                    {completedTasksCount} Completed
                  </span>
                </div>
              </div>

              {/* Card 3: GitHub PRs Pending */}
              <div className="relative overflow-hidden rounded-3xl bg-surface-container-low p-5 shadow-sm hover:bg-surface-container transition-all duration-300 group border border-outline-variant/20 hover:border-outline-variant/40 animate-entrance anim-delay-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-wider text-outline font-semibold">
                    PRs Pending Review
                  </span>
                  <div className="w-8 h-8 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[18px]">alt_route</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-display font-bold text-3xl text-on-surface">
                    0
                  </span>
                  <span className="text-xs text-on-surface-variant">Review Requests</span>
                </div>
                <div className="flex items-center justify-between text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1 text-secondary text-[11px]">
                    <span className="material-symbols-outlined text-[14px]">sync</span>
                    GitHub & Supabase synced
                  </span>
                  <span className="text-tertiary font-medium text-[11px]">Sync Active</span>
                </div>
              </div>
            </div>

            {/* Main Section: Your Workspaces Grid */}
            <div data-tour="workspaces-section" className="flex flex-col gap-4 mb-8">
              <div className="flex items-center justify-between animate-entrance anim-delay-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-bold text-lg text-on-surface">Your Workspaces</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-semibold text-xs">
                    {workspaces.length} Environments
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-outline text-xs">
                  <span className="material-symbols-outlined text-[16px]">filter_list</span>
                  <span>Sorted by Last Visited</span>
                </div>
              </div>

              {/* CLEAN STATE: Empty state for new sign-ins */}
              {workspaces.length === 0 ? (
                <div className="rounded-3xl bg-surface-container-low/70 border border-outline-variant/30 p-8 text-center flex flex-col items-center justify-center gap-4 animate-entrance">
                  <div className="w-16 h-16 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-[32px]">hub</span>
                  </div>
                  <div className="max-w-md space-y-1">
                    <h3 className="font-display font-bold text-lg text-on-surface">
                      Your workspace directory is clean
                    </h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      You haven&apos;t joined or created any engineering workspaces yet. Provision an isolated workspace for your team or load a sample agile sprint to explore.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="px-5 py-2.5 rounded-2xl bg-primary-container text-on-primary-container font-semibold text-xs shadow-md hover:bg-primary hover:shadow-indigo-500/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      <span>Provision First Workspace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadDemoData()}
                      className="px-4 py-2.5 rounded-2xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold text-xs border border-outline-variant/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-tertiary">bolt</span>
                      <span>Load Sample Agile Workspace</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Grid of Workspaces with Real Team Management Details */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {workspaces.map((ws, index) => {
                    const isFirst = index === 0;
                    const isSecond = index === 1;
                    const accentColor = isFirst
                      ? 'bg-primary-container'
                      : isSecond
                      ? 'bg-secondary-container'
                      : 'bg-tertiary-container';
                    const initials = ws.name.slice(0, 2).toUpperCase();
                    
                    // Real task metrics for this specific workspace
                    const wsTasks = tasks.filter(t => t.projectId === ws.id || !t.projectId);
                    const wsTasksCount = wsTasks.length;
                    const wsDoneCount = wsTasks.filter(t => t.status === 'DONE').length;
                    const wsInProgressCount = wsTasks.filter(t => t.status === 'IN_PROGRESS').length;
                    const wsTodoCount = wsTasks.filter(t => t.status === 'TODO').length;
                    const sprintVelocity = wsTasksCount > 0 ? Math.round((wsDoneCount / wsTasksCount) * 100) : 0;

                    return (
                      <div
                        key={ws.id}
                        className="flex flex-col justify-between rounded-3xl bg-surface-container-low hover:bg-surface-container p-6 shadow-md transition-all duration-300 relative group border border-outline-variant/20 hover:border-primary/40 hover:-translate-y-1 hover:shadow-xl animate-entrance anim-delay-4"
                      >
                        {/* Top Accent Strip */}
                        <div className={`absolute inset-x-0 top-0 h-1.5 rounded-t-3xl ${accentColor}`} />

                        <div>
                          {/* Header Badges */}
                          <div className="flex items-center justify-between mb-4 pt-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full bg-primary-container/20 text-primary font-semibold text-[11px] tracking-wide">
                                {ws.ownerId === user?.id ? 'Owner' : 'Member'}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/20 text-secondary text-[11px]">
                                Active Sprint
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-tertiary text-[11px] flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">code_blocks</span>
                                Git Sync
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenWorkspace(ws)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-transform duration-300 hover:rotate-45 cursor-pointer"
                              title="Workspace Settings"
                            >
                              <span className="material-symbols-outlined text-[16px]">settings</span>
                            </button>
                          </div>

                          {/* Workspace Identity */}
                          <div className="flex items-start gap-3.5 mb-3">
                            <div className="w-11 h-11 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary-fixed font-display font-bold text-base shadow-inner group-hover:scale-105 group-hover:bg-primary-container group-hover:text-on-primary-container transition-all duration-300 flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-base text-on-surface truncate group-hover:text-primary transition-colors">
                                {ws.name}
                              </h3>
                              <p className="text-[11px] text-outline">
                                {ws.slug || 'agile-sprint'} · Multi-Tenant
                              </p>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                            {ws.description ||
                              'Core engineering sprints, backlog refinement, CI/CD pipeline automation, and synchronized team tasks.'}
                          </p>

                          {/* Team Management Metrics & Progress Bar */}
                          <div className="rounded-2xl bg-surface-container-lowest/60 p-3.5 mb-5 border border-outline-variant/10">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-on-surface-variant">Sprint Velocity</span>
                              <span className="text-primary font-semibold">
                                {sprintVelocity}% {sprintVelocity === 100 ? 'Completed' : sprintVelocity > 0 ? 'In Progress' : 'Planned'}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden mb-3">
                              <div
                                className={`h-full ${accentColor} rounded-full transition-all duration-700`}
                                style={{ width: `${sprintVelocity}%` }}
                              />
                            </div>

                            {/* Task Breakdown Details for Team Management */}
                            <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-outline-variant/10">
                              <div className="flex items-center gap-2">
                                <span className="text-outline">{wsTodoCount} To Do</span>
                                <span>•</span>
                                <span className="text-secondary">{wsInProgressCount} Active</span>
                                <span>•</span>
                                <span className="text-tertiary">{wsDoneCount} Done</span>
                              </div>
                              <span className="font-semibold text-on-surface">{wsTasksCount} Total</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Action Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenWorkspace(ws)}
                          className="w-full py-2.5 px-4 rounded-2xl bg-primary-container hover:bg-primary text-on-primary-container font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] cursor-pointer"
                        >
                          <span>Launch Sprint Board</span>
                          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform duration-200">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions Row: Invite Code & Create Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-stretch animate-entrance anim-delay-5">
              {/* Create New Team Workspace Card */}
              <div
                onClick={() => setShowCreateModal(true)}
                className="lg:col-span-5 rounded-3xl bg-surface-container-low/70 hover:bg-surface-container-low p-6 flex flex-col justify-between cursor-pointer group transition-all duration-300 border border-outline-variant/20 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary-container group-hover:text-on-primary-container transition-all duration-300 shadow-inner">
                    <span className="material-symbols-outlined text-[26px] transition-transform duration-300 group-hover:rotate-90">
                      add_circle_outline
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-display font-bold text-base text-on-surface group-hover:text-primary transition-colors">
                      Create New Team Workspace
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      Initialize an isolated project hub with dedicated Git repos, Kanban boards, sprint telemetry, and custom permission roles.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                  <span className="text-[11px] text-outline">Takes under 60 seconds</span>
                  <span className="text-primary font-semibold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform duration-200">
                    Configure & Launch →
                  </span>
                </div>
              </div>

              {/* Quick Join Input Widget */}
              <div
                id="join-input-section"
                className="lg:col-span-7 rounded-3xl bg-surface-container-low p-6 shadow-sm flex flex-col justify-between border border-outline-variant/20 hover:border-secondary/30 transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wider text-secondary font-semibold">
                      Join Existing Workspace
                    </span>
                    <span className="text-[11px] text-outline">Via Access Token</span>
                  </div>
                  <h4 className="font-display font-bold text-base text-on-surface mb-1">
                    Enter Workspace Token or Invite Link
                  </h4>
                  <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                    Received an invite token from your team lead? Paste your 6-digit key or enterprise workspace URI below:
                  </p>
                </div>

                <form onSubmit={handleJoinSubmit} className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full">
                    <span className="material-symbols-outlined text-[20px] text-outline absolute left-3.5 top-1/2 -translate-y-1/2">
                      vpn_key
                    </span>
                    <input
                      id="workspace-code-input"
                      type="text"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value)}
                      placeholder="e.g. NX-DEMO-01 or workspace invite code"
                      className="w-full bg-surface-container-highest/80 rounded-2xl pl-11 pr-4 py-2.5 text-on-surface text-xs placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary/40 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-secondary-container text-on-secondary-container font-semibold text-xs hover:bg-secondary hover:shadow-lg hover:shadow-cyan-500/20 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5 flex-shrink-0 group cursor-pointer"
                  >
                    <span>Join</span>
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform duration-200">
                      login
                    </span>
                  </button>
                </form>

                {joinFeedback && (
                  <div className="mt-2.5 text-xs text-tertiary flex items-center gap-1 animate-entrance">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>{joinFeedback}</span>
                  </div>
                )}

                {joinError && (
                  <div className="mt-2.5 text-xs text-error flex items-center gap-1 animate-entrance">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    <span>{joinError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Live Team Velocity & Activity Feed — Clean Live State */}
            <div
              id="activity-feed-section"
              data-tour="activity-feed"
              className="rounded-3xl bg-surface-container-low p-6 shadow-sm border border-outline-variant/20 animate-entrance anim-delay-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary shadow-inner">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-on-surface">
                      Live Team Velocity & Activity
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Real-time sync feed from active sprints across connected repositories.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary pulse-ring-dot" />
                  <span className="text-xs text-tertiary font-semibold">Socket Connected</span>
                </div>
              </div>

              {/* Feed items */}
              <div className="flex flex-col gap-2">
                {workspaces.length > 0 ? (
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-container-high/40 border border-outline-variant/15 transition-colors group">
                    <div className="w-9 h-9 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                      {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <p className="text-xs text-on-surface truncate">
                          <span className="font-semibold text-primary">{displayName}</span> provisioned{' '}
                          <span className="px-2 py-0.5 rounded-lg bg-surface-container-highest text-on-surface font-mono text-[11px]">
                            {workspaces[0]?.name}
                          </span>{' '}
                          workspace
                        </p>
                        <span className="text-[11px] text-outline flex-shrink-0">Active</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-on-surface-variant text-[11px]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">folder</span>
                          {workspaces[0]?.name}
                        </span>
                        <span>•</span>
                        <span className="text-tertiary flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">check</span> Realtime Sync Active
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-surface-container/40 text-center text-xs text-outline italic border border-outline-variant/15">
                    Real-time WebSocket connected. All sprint events, branch updates, and team movements will appear here live.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ACTIVE WORKSPACE SPRINT KANBAN DRAWER / MODAL */}
      {activeSprintWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-surface-container-lowest/85 backdrop-blur-md animate-entrance">
          <div className="relative w-full max-w-5xl max-h-[90vh] rounded-3xl bg-surface-container p-6 sm:p-8 shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container font-display font-bold text-base flex items-center justify-center shadow-inner">
                  {activeSprintWorkspace.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-xl text-on-surface">
                      {activeSprintWorkspace.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-container/20 text-primary font-semibold text-[10px]">
                      Active Sprint Kanban
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-tertiary text-[10px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">sync</span> Synced
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {activeSprintWorkspace.description || 'Sprint tasks, velocity, and task lifecycle tracking.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskForm(true)}
                  className="px-3.5 py-2 rounded-2xl bg-primary-container text-on-primary-container font-semibold text-xs hover:bg-primary transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSprintWorkspace(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
                  title="Close Sprint View"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Quick Add Task Form */}
            {showAddTaskForm && (
              <form onSubmit={handleCreateTask} className="mb-6 p-4 rounded-2xl bg-surface-container-high border border-outline-variant/30 flex flex-col sm:flex-row items-center gap-3 animate-entrance">
                <input
                  type="text"
                  required
                  placeholder="Task title or user story description..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="flex-1 bg-surface-container-highest rounded-xl px-3.5 py-2 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary border border-transparent"
                />
                <select
                  value={newTaskPriority}
                  onChange={e => setNewTaskPriority(e.target.value as TaskPriority)}
                  className="bg-surface-container-highest rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none border border-transparent"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Priority</option>
                </select>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddTaskForm(false)}
                    className="px-3 py-2 rounded-xl text-on-surface-variant hover:text-on-surface text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* 3 Kanban Columns */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
              {/* Column 1: TO DO */}
              <div className="flex flex-col rounded-2xl bg-surface-container-low p-4 border border-outline-variant/20">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant/20">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-outline" />
                    TO DO
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-[10px] text-outline font-semibold">
                    {tasks.filter(t => t.status === 'TODO').length}
                  </span>
                </div>
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {tasks.filter(t => t.status === 'TODO').map(task => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-2xl bg-surface-container hover:bg-surface-bright border border-outline-variant/20 transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-secondary px-2 py-0.5 rounded-md bg-secondary-container/15">
                          {task.priority}
                        </span>
                        <button
                          type="button"
                          onClick={() => moveTaskStatus(task.id, 'IN_PROGRESS')}
                          className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                        >
                          <span>Start</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </button>
                      </div>
                      <p className="text-xs text-on-surface font-medium line-clamp-2">{task.title}</p>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === 'TODO').length === 0 && (
                    <div className="py-8 text-center text-xs text-outline italic">No tasks in To Do</div>
                  )}
                </div>
              </div>

              {/* Column 2: IN PROGRESS */}
              <div className="flex flex-col rounded-2xl bg-surface-container-low p-4 border border-outline-variant/20">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant/20">
                  <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    IN PROGRESS
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-[10px] text-secondary font-semibold">
                    {tasks.filter(t => t.status === 'IN_PROGRESS').length}
                  </span>
                </div>
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {tasks.filter(t => t.status === 'IN_PROGRESS').map(task => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-2xl bg-surface-container hover:bg-surface-bright border border-outline-variant/20 transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-md bg-primary-container/15">
                          {task.priority}
                        </span>
                        <button
                          type="button"
                          onClick={() => moveTaskStatus(task.id, 'DONE')}
                          className="text-[11px] text-tertiary hover:underline flex items-center gap-0.5"
                        >
                          <span>Complete</span>
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </button>
                      </div>
                      <p className="text-xs text-on-surface font-medium line-clamp-2">{task.title}</p>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === 'IN_PROGRESS').length === 0 && (
                    <div className="py-8 text-center text-xs text-outline italic">No tasks in progress</div>
                  )}
                </div>
              </div>

              {/* Column 3: DONE */}
              <div className="flex flex-col rounded-2xl bg-surface-container-low p-4 border border-outline-variant/20">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant/20">
                  <span className="text-xs font-bold text-tertiary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tertiary" />
                    DONE
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-[10px] text-tertiary font-semibold">
                    {tasks.filter(t => t.status === 'DONE').length}
                  </span>
                </div>
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {tasks.filter(t => t.status === 'DONE').map(task => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-2xl bg-surface-container hover:bg-surface-bright border border-outline-variant/20 transition-all opacity-85 group shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-tertiary px-2 py-0.5 rounded-md bg-tertiary-container/15">
                          Verified
                        </span>
                        <span className="material-symbols-outlined text-tertiary text-[16px]">check_circle</span>
                      </div>
                      <p className="text-xs text-on-surface line-through text-on-surface-variant font-medium line-clamp-2">
                        {task.title}
                      </p>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === 'DONE').length === 0 && (
                    <div className="py-8 text-center text-xs text-outline italic">No completed tasks yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Specifications Documentation Modal */}
      {showSpecsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/80 backdrop-blur-md animate-entrance">
          <div className="relative w-full max-w-lg rounded-3xl bg-surface-container p-6 sm:p-8 shadow-2xl border border-outline-variant/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-[22px]">library_books</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-on-surface">Platform Specifications</h3>
                  <p className="text-xs text-on-surface-variant">Nexus Architecture & Multi-Tenant Telemetry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSpecsModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs text-on-surface-variant leading-relaxed mb-6">
              <p>
                <strong className="text-on-surface">Multi-Tenant Isolation:</strong> Each workspace operates within an independent sandbox partition with dedicated role-based access control (RBAC), Git webhooks, and sprint velocity metrics.
              </p>
              <p>
                <strong className="text-on-surface">Realtime WebSocket Telemetry:</strong> Live board transitions and GitHub pull requests sync instantly across distributed team members with a 99.98% SLA.
              </p>
              <p>
                <strong className="text-on-surface">Access Tokens:</strong> Teams can invite contributors using high-entropy 6-character workspace invite tokens or direct URI links.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSpecsModal(false)}
                className="px-5 py-2.5 rounded-2xl bg-primary-container text-on-primary-container font-semibold text-xs hover:bg-primary transition-all cursor-pointer"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Workspace */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/80 backdrop-blur-md animate-entrance">
          <div className="relative w-full max-w-lg rounded-3xl bg-surface-container p-6 sm:p-8 shadow-2xl border border-outline-variant/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-[22px]">add_box</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-on-surface">New Workspace</h3>
                  <p className="text-xs text-on-surface-variant">Configure team workspace details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleProvisionWorkspace} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  placeholder="e.g. Core Engineering or Cloud Infrastructure"
                  className="w-full bg-surface-container-highest rounded-2xl px-4 py-2.5 text-on-surface text-xs placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary/40 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Primary Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewWsTemplate('kanban')}
                    className={`p-3 rounded-2xl text-left text-xs font-semibold transition-all cursor-pointer ${
                      newWsTemplate === 'kanban'
                        ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-sm'
                        : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                    }`}
                  >
                    Agile Sprint Kanban
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewWsTemplate('sandbox')}
                    className={`p-3 rounded-2xl text-left text-xs font-semibold transition-all cursor-pointer ${
                      newWsTemplate === 'sandbox'
                        ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-sm'
                        : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-bright'
                    }`}
                  >
                    Microservice Sandbox
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  Initial GitHub Repository Link (Optional)
                </label>
                <input
                  type="url"
                  value={newWsRepo}
                  onChange={e => setNewWsRepo(e.target.value)}
                  placeholder="https://github.com/organization/repo"
                  className="w-full bg-surface-container-highest rounded-2xl px-4 py-2.5 text-on-surface text-xs placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary border border-transparent focus:border-primary/40 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning || !newWsName.trim()}
                  className="px-5 py-2.5 rounded-2xl bg-primary-container text-on-primary-container font-semibold text-xs hover:bg-primary transition-all shadow-md hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isProvisioning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-on-primary-container border-t-transparent rounded-full animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <span>Provision Workspace</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spotlight Interactive Onboarding Tutorial */}
      <SpotlightTutorial
        isOpen={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          completeOnboarding();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onComplete={() => {
          setShowTutorial(false);
          completeOnboarding();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Realtime Live Activity Toast */}
      <LiveActivityToast />
    </div>
  );
};
