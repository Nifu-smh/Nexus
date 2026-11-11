import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Workspace,
  WorkspaceMember,
  Project,
  Task,
  Comment,
  Role,
  TaskStatus,
  TaskPriority,
  RealtimeSyncStatus,
  PresenceUser,
  LiveCollabEvent,
} from '../types/index.ts';
import { useAuth } from './AuthContext.tsx';
import { initSupabaseClient } from '../lib/supabase.ts';

interface WorkspaceContextType {
  // Workspaces
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  isDbSynced: boolean;
  setCurrentWorkspace: (workspace: Workspace) => void;
  createWorkspace: (name: string, slug?: string) => Promise<{ success: boolean; workspace?: Workspace; error?: string }>;
  updateWorkspace: (id: string, name: string) => Promise<{ success: boolean; error?: string }>;
  deleteWorkspace: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Members
  members: WorkspaceMember[];
  inviteMember: (email: string, role: Role) => Promise<{ success: boolean; error?: string }>;
  removeMember: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Projects
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  createProject: (name: string, description?: string) => Promise<{ success: boolean; project?: Project; error?: string }>;
  updateProject: (id: string, name: string, description?: string) => Promise<{ success: boolean; error?: string }>;
  deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Tasks
  tasks: Task[];
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'orderIndex'>) => Promise<{ success: boolean; task?: Task; error?: string }>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<{ success: boolean; error?: string }>;
  moveTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<{ success: boolean; error?: string }>;
  deleteTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;

  // Comments
  comments: Record<string, Comment[]>;
  fetchCommentsForTask: (taskId: string) => Promise<Comment[]>;
  addComment: (taskId: string, body: string) => Promise<{ success: boolean; comment?: Comment; error?: string }>;
  deleteComment: (taskId: string, commentId: string) => Promise<{ success: boolean; error?: string }>;
  // Join & Demo
  joinWorkspaceWithCode: (code: string) => Promise<{ success: boolean; workspace?: Workspace; error?: string }>;
  loadDemoData: () => Promise<void>;
  clearAllData: () => void;

  // Onboarding Spotlight Tutorial
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;

  // Realtime Live Collaboration
  realtimeStatus: RealtimeSyncStatus;
  activeCollaborators: PresenceUser[];
  recentLiveEvent: LiveCollabEvent | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

const STORAGE_WORKSPACES_PREFIX = 'nexus_workspaces_';
const STORAGE_PROJECTS_PREFIX = 'nexus_projects_';
const STORAGE_TASKS_PREFIX = 'nexus_tasks_';
const STORAGE_MEMBERS_PREFIX = 'nexus_members_';
const STORAGE_COMMENTS_PREFIX = 'nexus_comments_';

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [supabaseState] = useState(() => initSupabaseClient());

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDbSynced, setIsDbSynced] = useState(false);

  // Live Collaboration & Realtime Presence
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeSyncStatus>('local_only');
  const [activeCollaborators, setActiveCollaborators] = useState<PresenceUser[]>([]);
  const [recentLiveEvent, setRecentLiveEvent] = useState<LiveCollabEvent | null>(null);

  const realtimeChannelRef = useRef<any>(null);
  const localBcRef = useRef<BroadcastChannel | null>(null);

  const triggerLiveEvent = useCallback((event: LiveCollabEvent) => {
    setRecentLiveEvent(event);
    setTimeout(() => {
      setRecentLiveEvent(prev => (prev?.id === event.id ? null : prev));
    }, 3800);
  }, []);

  const broadcastCollabEvent = useCallback((eventPayload: {
    type: LiveCollabEvent['type'];
    task?: Task;
    taskId?: string;
    comment?: Comment;
  }) => {
    if (!user) return;
    const fullPayload = {
      ...eventPayload,
      actorId: user.id,
      actorName: user.name || user.email.split('@')[0] || 'Collaborator',
      timestamp: new Date().toISOString(),
    };

    // 1. Supabase WebSocket Broadcast across different computers
    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'collab_event',
          payload: fullPayload,
        });
      } catch (err) {
        console.warn('Realtime broadcast failed:', err);
      }
    }

    // 2. Local browser BroadcastChannel for same-device tabs
    if (localBcRef.current) {
      try {
        localBcRef.current.postMessage(fullPayload);
      } catch (e) {
        // Safe ignore
      }
    }
  }, [user]);

  // Onboarding spotlight tutorial state
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    try {
      if (!user) return true;
      const stored = localStorage.getItem(`nexus_onboarding_${user.id}`);
      if (stored !== null) return stored === 'true';
      return false; // New users see tutorial!
    } catch {
      return false;
    }
  });

  const completeOnboarding = async () => {
    setHasCompletedOnboarding(true);
    if (user?.id) {
      localStorage.setItem(`nexus_onboarding_${user.id}`, 'true');
      const client = supabaseState.client;
      if (supabaseState.isConfigured && client) {
        await client.from('profiles').update({ has_completed_onboarding: true }).eq('id', user.id);
      }
    }
  };

  const resetOnboarding = async () => {
    setHasCompletedOnboarding(false);
    if (user?.id) {
      localStorage.removeItem(`nexus_onboarding_${user.id}`);
    }
  };

  const userId = user?.id || 'guest';

  // Seed default initial state if empty
  const initializeDefaultState = useCallback((targetUserId: string, targetUserName: string) => {
    const defaultWsId = `ws_${targetUserId}_default`;
    const defaultProjId = `proj_${targetUserId}_1`;
    const inviteCode = `NX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const initialWs: Workspace = {
      id: defaultWsId,
      name: `${targetUserName}'s Workspace`,
      slug: `${targetUserName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-ws`,
      inviteCode,
      ownerId: targetUserId,
      createdAt: new Date().toISOString(),
    };

    const isDemoUser = ['alex@company.com', 'sanjay@company.com', 'ananya@company.com'].includes(
      (user?.email || '').toLowerCase()
    );

    // CLEAN SLATE FOR REAL NEW USERS: No mock sprint cards, no fake members!
    if (!isDemoUser) {
      const initialMembers: WorkspaceMember[] = [
        {
          id: `mem_1_${targetUserId}`,
          workspaceId: defaultWsId,
          userId: targetUserId,
          role: 'OWNER',
          joinedAt: new Date().toISOString(),
          user: {
            id: targetUserId,
            name: targetUserName,
            email: user?.email || '',
            avatarUrl: user?.avatarUrl,
          },
        },
      ];

      const initialProj: Project = {
        id: defaultProjId,
        workspaceId: defaultWsId,
        name: 'My First Project',
        description: 'Starter project for your team. Create tasks and invite members to collaborate.',
        createdAt: new Date().toISOString(),
      };

      const initialTasks: Task[] = []; // COMPLETELY CLEAN! NO MOCK CARDS!

      return { initialWs, initialMembers, initialProj, initialTasks };
    }

    // Showcase demo data for test accounts
    const initialMembers: WorkspaceMember[] = [
      {
        id: `mem_1_${targetUserId}`,
        workspaceId: defaultWsId,
        userId: targetUserId,
        role: 'OWNER',
        joinedAt: new Date().toISOString(),
        user: {
          id: targetUserId,
          name: targetUserName,
          email: user?.email || 'user@company.com',
          avatarUrl: user?.avatarUrl,
        },
      },
      {
        id: `mem_2_${targetUserId}`,
        workspaceId: defaultWsId,
        userId: 'usr_ananya',
        role: 'MEMBER',
        joinedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        user: {
          id: 'usr_ananya',
          name: 'Ananya Pillai',
          email: 'ananya@company.com',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        },
      },
      {
        id: `mem_3_${targetUserId}`,
        workspaceId: defaultWsId,
        userId: 'usr_sanjay',
        role: 'MEMBER',
        joinedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        user: {
          id: 'usr_sanjay',
          name: 'Sanjay Varma',
          email: 'sanjay@company.com',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        },
      },
    ];

    const initialProj: Project = {
      id: defaultProjId,
      workspaceId: defaultWsId,
      name: 'NEXUS Web Platform Launch',
      description: 'Design and ship the collaborative workspace platform with Kanban and task engine.',
      createdAt: new Date().toISOString(),
    };

    const initialTasks: Task[] = [
      {
        id: `tsk_1_${defaultProjId}`,
        projectId: defaultProjId,
        title: 'Design clean responsive dashboard UI',
        description: 'Implement dark/light themes, sleek sidebar navigation, and quick metrics overview.',
        status: 'DONE',
        priority: 'HIGH',
        assigneeId: targetUserId,
        creatorId: targetUserId,
        dueAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        orderIndex: 0,
        createdAt: new Date().toISOString(),
        assignee: {
          id: targetUserId,
          name: targetUserName,
          email: user?.email || '',
          avatarUrl: user?.avatarUrl,
        },
      },
      {
        id: `tsk_2_${defaultProjId}`,
        projectId: defaultProjId,
        title: 'Implement Multi-Tenant Workspace Switcher',
        description: 'Support multiple workspaces, member role isolation, and quick switching dropdown.',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        assigneeId: 'usr_sanjay',
        creatorId: targetUserId,
        dueAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        orderIndex: 1,
        createdAt: new Date().toISOString(),
        assignee: {
          id: 'usr_sanjay',
          name: 'Sanjay Varma',
          email: 'sanjay@company.com',
        },
      },
      {
        id: `tsk_3_${defaultProjId}`,
        projectId: defaultProjId,
        title: 'Build interactive Kanban board with dnd',
        description: 'Fluid drag-and-drop task movements between To Do, In Progress, and Done columns.',
        status: 'TODO',
        priority: 'MEDIUM',
        assigneeId: 'usr_ananya',
        creatorId: targetUserId,
        dueAt: new Date(Date.now() + 86400000 * 5).toISOString(),
        orderIndex: 2,
        createdAt: new Date().toISOString(),
        assignee: {
          id: 'usr_ananya',
          name: 'Ananya Pillai',
          email: 'ananya@company.com',
        },
      },
    ];

    return { initialWs, initialMembers, initialProj, initialTasks };
  }, [user]);

  // Load from Supabase or LocalStorage
  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let loadedFromDb = false;

    // 1. Try Supabase query
    const client = supabaseState.client;
    if (supabaseState.isConfigured && client) {
      try {
        const { data: wsData, error: wsError } = await client
          .from('workspaces')
          .select('*')
          .order('created_at', { ascending: false });

        if (!wsError && wsData && wsData.length > 0) {
          const mappedWs: Workspace[] = wsData.map(w => ({
            id: w.id,
            name: w.name,
            slug: w.slug,
            ownerId: w.owner_id,
            createdAt: w.created_at,
            updatedAt: w.updated_at,
          }));

          setWorkspaces(mappedWs);
          const activeWs = mappedWs[0];
          setCurrentWorkspaceState(activeWs);

          // Fetch projects for active workspace
          const { data: projData } = await client
            .from('projects')
            .select('*')
            .eq('workspace_id', activeWs.id)
            .order('created_at', { ascending: false });

          if (projData) {
            const mappedProj: Project[] = projData.map(p => ({
              id: p.id,
              workspaceId: p.workspace_id,
              name: p.name,
              description: p.description,
              createdAt: p.created_at,
              updatedAt: p.updated_at,
            }));
            setProjects(mappedProj);
            if (mappedProj.length > 0) setCurrentProject(mappedProj[0]);
          }

          // Fetch tasks for active workspace projects
          const { data: taskData } = await client
            .from('tasks')
            .select('*, assignee:assignee_id(id, full_name, email, avatar_url)')
            .order('order_index', { ascending: true });

          if (taskData) {
            const mappedTasks: Task[] = taskData.map(t => ({
              id: t.id,
              projectId: t.project_id,
              title: t.title,
              description: t.description,
              status: t.status as TaskStatus,
              priority: t.priority as TaskPriority,
              assigneeId: t.assignee_id,
              creatorId: t.creator_id,
              dueAt: t.due_at,
              orderIndex: t.order_index,
              createdAt: t.created_at,
              updatedAt: t.updated_at,
              assignee: t.assignee ? {
                id: t.assignee.id,
                name: t.assignee.full_name,
                email: t.assignee.email,
                avatarUrl: t.assignee.avatar_url,
              } : undefined,
            }));
            setTasks(mappedTasks);
          }

          loadedFromDb = true;
          setIsDbSynced(true);
        }
      } catch (err) {
        console.warn('Supabase fetch encountered exception, falling back to local store:', err);
      }
    }

    // 2. Fallback to LocalStorage
    if (!loadedFromDb) {
      try {
        const storedWs = localStorage.getItem(`${STORAGE_WORKSPACES_PREFIX}${userId}`);
        if (storedWs) {
          const parsedWs: Workspace[] = JSON.parse(storedWs);
          // Check for legacy auto-seeded mock workspaces and purge them for authentic clean slate
          const cleanedWs = parsedWs.filter(
            w => !w.id.includes('_default') && 
                 !w.name.endsWith("'s Workspace") && 
                 !w.name.toLowerCase().includes("nifu's workspace") &&
                 w.slug !== 'nifu-ws'
          );
          if (cleanedWs.length === 0) {
            localStorage.removeItem(`${STORAGE_WORKSPACES_PREFIX}${userId}`);
            parsedWs.forEach(w => {
              try {
                localStorage.removeItem(`${STORAGE_PROJECTS_PREFIX}${w.id}`);
                localStorage.removeItem(`${STORAGE_TASKS_PREFIX}${w.id}`);
                localStorage.removeItem(`${STORAGE_MEMBERS_PREFIX}${w.id}`);
              } catch {}
            });
            setWorkspaces([]);
            setCurrentWorkspaceState(null);
            setProjects([]);
            setCurrentProject(null);
            setTasks([]);
            setMembers([]);
          } else {
            setWorkspaces(parsedWs);
            const active = parsedWs[0] || null;
            setCurrentWorkspaceState(active);

            if (active) {
              const storedProjects = localStorage.getItem(`${STORAGE_PROJECTS_PREFIX}${active.id}`);
              const parsedProjects: Project[] = storedProjects ? JSON.parse(storedProjects) : [];
              setProjects(parsedProjects);
              setCurrentProject(parsedProjects[0] || null);

              const storedTasks = localStorage.getItem(`${STORAGE_TASKS_PREFIX}${active.id}`);
              const parsedTasks: Task[] = storedTasks ? JSON.parse(storedTasks) : [];
              setTasks(parsedTasks);

              const storedMembers = localStorage.getItem(`${STORAGE_MEMBERS_PREFIX}${active.id}`);
              const parsedMembers: WorkspaceMember[] = storedMembers ? JSON.parse(storedMembers) : [];
              setMembers(parsedMembers);
            }
          }
        } else {
          // Zero mockups! Fresh start with clean state
          setWorkspaces([]);
          setCurrentWorkspaceState(null);
          setProjects([]);
          setCurrentProject(null);
          setTasks([]);
          setMembers([]);
        }
      } catch (e) {
        console.error('Failed to parse local workspace storage:', e);
      }
    }

    setIsLoading(false);
  }, [user, userId, supabaseState, initializeDefaultState]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Persist local cache changes whenever state changes
  useEffect(() => {
    if (currentWorkspace) {
      try {
        localStorage.setItem(`${STORAGE_WORKSPACES_PREFIX}${userId}`, JSON.stringify(workspaces));
        localStorage.setItem(`${STORAGE_PROJECTS_PREFIX}${currentWorkspace.id}`, JSON.stringify(projects));
        localStorage.setItem(`${STORAGE_TASKS_PREFIX}${currentWorkspace.id}`, JSON.stringify(tasks));
        localStorage.setItem(`${STORAGE_MEMBERS_PREFIX}${currentWorkspace.id}`, JSON.stringify(members));
      } catch (e) {
        console.error('Failed to persist workspace changes locally:', e);
      }
    }
  }, [workspaces, currentWorkspace, projects, tasks, members, userId]);

  const setCurrentWorkspace = (workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
    try {
      const storedProj = localStorage.getItem(`${STORAGE_PROJECTS_PREFIX}${workspace.id}`);
      const parsedProj = storedProj ? JSON.parse(storedProj) : [];
      setProjects(parsedProj);
      setCurrentProject(parsedProj[0] || null);

      const storedTasks = localStorage.getItem(`${STORAGE_TASKS_PREFIX}${workspace.id}`);
      setTasks(storedTasks ? JSON.parse(storedTasks) : []);

      const storedMembers = localStorage.getItem(`${STORAGE_MEMBERS_PREFIX}${workspace.id}`);
      setMembers(storedMembers ? JSON.parse(storedMembers) : []);
    } catch (e) {
      console.error(e);
    }
  };

  // Incoming message handler from Broadcast (WebSockets or local cross-tab)
  const handleIncomingCollabMessage = useCallback((payload: any) => {
    if (!payload || payload.actorId === user?.id) return;

    if (payload.type === 'TASK_MOVED' || payload.type === 'TASK_UPDATED') {
      const updatedTask = payload.task as Task;
      if (updatedTask && updatedTask.id) {
        setTasks(prev => {
          const exists = prev.some(t => t.id === updatedTask.id);
          if (exists) {
            return prev.map(t => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
          }
          return [...prev, updatedTask];
        });
      }
      triggerLiveEvent({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        actorId: payload.actorId,
        actorName: payload.actorName,
        type: payload.type,
        message: `${payload.actorName} moved "${payload.task?.title || 'task'}" to ${payload.task?.status?.replace('_', ' ').toLowerCase()}`,
        timestamp: new Date().toISOString(),
      });
    } else if (payload.type === 'TASK_CREATED') {
      const newTask = payload.task as Task;
      if (newTask && newTask.id) {
        setTasks(prev => {
          if (prev.some(t => t.id === newTask.id)) return prev;
          return [...prev, newTask];
        });
      }
      triggerLiveEvent({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        actorId: payload.actorId,
        actorName: payload.actorName,
        type: payload.type,
        message: `${payload.actorName} created task "${payload.task?.title || 'task'}"`,
        timestamp: new Date().toISOString(),
      });
    } else if (payload.type === 'TASK_DELETED') {
      const taskId = payload.taskId;
      if (taskId) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
      triggerLiveEvent({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        actorId: payload.actorId,
        actorName: payload.actorName,
        type: payload.type,
        message: `${payload.actorName} deleted a task`,
        timestamp: new Date().toISOString(),
      });
    } else if (payload.type === 'COMMENT_ADDED') {
      const { taskId, comment } = payload;
      if (taskId && comment) {
        setComments(prev => {
          const existing = prev[taskId] || [];
          if (existing.some(c => c.id === comment.id)) return prev;
          return { ...prev, [taskId]: [...existing, comment] };
        });
      }
    }
  }, [user?.id, triggerLiveEvent]);

  // Realtime Supabase Channel Subscription (Postgres CDC + WebSockets Broadcast + Presence)
  useEffect(() => {
    if (!currentWorkspace?.id || !user) {
      setRealtimeStatus('local_only');
      setActiveCollaborators([]);
      return;
    }

    // 1. Cross-tab sync via local BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(`nexus_ws_${currentWorkspace.id}`);
        localBcRef.current = bc;
        bc.onmessage = (event) => {
          handleIncomingCollabMessage(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported:', err);
      }
    }

    const client = supabaseState.client;
    if (!supabaseState.isConfigured || !client) {
      setRealtimeStatus('local_only');
      return;
    }

    setRealtimeStatus('connecting');
    const channelName = `nexus_collab_${currentWorkspace.id}`;
    const channel = client.channel(channelName, {
      config: {
        presence: { key: user.id },
        broadcast: { self: false },
      },
    });

    realtimeChannelRef.current = channel;

    // A. Listen to Postgres Changes on tasks
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
      },
      (payload: any) => {
        const { eventType, new: newRec, old: oldRec } = payload;
        if (eventType === 'INSERT' && newRec) {
          setTasks(prev => {
            if (prev.some(t => t.id === newRec.id)) return prev;
            const mapped: Task = {
              id: newRec.id,
              projectId: newRec.project_id,
              title: newRec.title,
              description: newRec.description,
              status: newRec.status as TaskStatus,
              priority: newRec.priority as TaskPriority,
              assigneeId: newRec.assignee_id,
              creatorId: newRec.creator_id,
              dueAt: newRec.due_at,
              orderIndex: newRec.order_index,
              createdAt: newRec.created_at,
              updatedAt: newRec.updated_at,
            };
            return [...prev, mapped];
          });
        } else if (eventType === 'UPDATE' && newRec) {
          setTasks(prev =>
            prev.map(t =>
              t.id === newRec.id
                ? {
                    ...t,
                    title: newRec.title,
                    description: newRec.description,
                    status: newRec.status as TaskStatus,
                    priority: newRec.priority as TaskPriority,
                    assigneeId: newRec.assignee_id,
                    dueAt: newRec.due_at,
                    orderIndex: newRec.order_index,
                    updatedAt: newRec.updated_at,
                  }
                : t
            )
          );
        } else if (eventType === 'DELETE' && oldRec) {
          setTasks(prev => prev.filter(t => t.id !== oldRec.id));
        }
      }
    );

    // B. Listen to Postgres Changes on task_comments
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'task_comments',
      },
      (payload: any) => {
        const { eventType, new: newRec, old: oldRec } = payload;
        if (eventType === 'INSERT' && newRec) {
          const mappedComment: Comment = {
            id: newRec.id,
            taskId: newRec.task_id,
            authorId: newRec.author_id,
            body: newRec.body,
            createdAt: newRec.created_at,
            updatedAt: newRec.updated_at,
          };
          setComments(prev => {
            const existing = prev[newRec.task_id] || [];
            if (existing.some(c => c.id === newRec.id)) return prev;
            return { ...prev, [newRec.task_id]: [...existing, mappedComment] };
          });
        } else if (eventType === 'DELETE' && oldRec) {
          setComments(prev => {
            const updated: Record<string, Comment[]> = {};
            for (const [tId, list] of Object.entries(prev)) {
              updated[tId] = list.filter(c => c.id !== oldRec.id);
            }
            return updated;
          });
        }
      }
    );

    // C. Listen to instant WebSocket broadcast events
    channel.on('broadcast', { event: 'collab_event' }, ({ payload }) => {
      handleIncomingCollabMessage(payload);
    });

    // D. Presence tracking
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        const usersMap = new Map<string, PresenceUser>();
        Object.values(state).forEach(presences => {
          presences.forEach(p => {
            if (p.userId) {
              usersMap.set(p.userId, p);
            }
          });
        });
        setActiveCollaborators(Array.from(usersMap.values()));
      })
      .on('presence', { event: 'join' }, ({ newPresences }: { newPresences: PresenceUser[] }) => {
        newPresences.forEach((p: PresenceUser) => {
          if (p.userId !== user.id) {
            triggerLiveEvent({
              id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              actorId: p.userId,
              actorName: p.name,
              type: 'TASK_UPDATED',
              message: `${p.name} joined the workspace`,
              timestamp: new Date().toISOString(),
            });
          }
        });
      });

    // E. Subscribe & Track
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setRealtimeStatus('connected');
        try {
          await channel.track({
            userId: user.id,
            name: user.name || user.email.split('@')[0] || 'Collaborator',
            email: user.email,
            avatarUrl: user.avatarUrl,
            onlineAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Presence track error:', e);
        }
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        setRealtimeStatus('disconnected');
      }
    });

    return () => {
      if (channel) {
        channel.untrack().catch(() => {});
        channel.unsubscribe();
      }
      if (bc) {
        bc.close();
      }
      realtimeChannelRef.current = null;
      localBcRef.current = null;
    };
  }, [currentWorkspace?.id, user, supabaseState, handleIncomingCollabMessage, triggerLiveEvent]);

  // Create Workspace
  const createWorkspace = async (
    name: string,
    slug?: string
  ): Promise<{ success: boolean; workspace?: Workspace; error?: string }> => {
    if (!name.trim()) return { success: false, error: 'Workspace name is required.' };
    const cleanSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);

    const newWs: Workspace = {
      id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      slug: cleanSlug,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };

    const newMember: WorkspaceMember = {
      id: `mem_${Date.now()}`,
      workspaceId: newWs.id,
      userId,
      role: 'OWNER',
      joinedAt: new Date().toISOString(),
      user: {
        id: userId,
        name: user?.name || 'Owner',
        email: user?.email || '',
        avatarUrl: user?.avatarUrl,
      },
    };

    // Try Supabase insert
    const client = supabaseState.client;
    if (supabaseState.isConfigured && client && isDbSynced) {
      try {
        const { data, error } = await client
          .from('workspaces')
          .insert({
            name: newWs.name,
            slug: newWs.slug,
            owner_id: userId,
          })
          .select()
          .single();

        if (error) {
          console.warn('Supabase workspace create failed, using local:', error.message);
        } else if (data) {
          newWs.id = data.id;
          newMember.workspaceId = data.id;
        }
      } catch (err) {
        console.warn('Supabase exception:', err);
      }
    }

    const starterProj: Project = {
      id: `proj_${newWs.id}_1`,
      workspaceId: newWs.id,
      name: 'Sprint #01 - Backlog',
      description: `Primary sprint board for ${newWs.name}`,
      createdAt: new Date().toISOString(),
    };

    setWorkspaces(prev => [newWs, ...prev]);
    setCurrentWorkspaceState(newWs);
    setMembers([newMember]);
    setProjects([starterProj]);
    setCurrentProject(starterProj);
    setTasks([]);

    return { success: true, workspace: newWs };
  };

  // Update Workspace
  const updateWorkspace = async (id: string, name: string): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim()) return { success: false, error: 'Workspace name is required.' };

    setWorkspaces(prev =>
      prev.map(w => (w.id === id ? { ...w, name: name.trim(), updatedAt: new Date().toISOString() } : w))
    );
    if (currentWorkspace?.id === id) {
      setCurrentWorkspaceState(prev => (prev ? { ...prev, name: name.trim() } : null));
    }

    const client = supabaseState.client;
    if (supabaseState.isConfigured && client && isDbSynced) {
      await client.from('workspaces').update({ name: name.trim() }).eq('id', id);
    }

    return { success: true };
  };

  // Delete Workspace
  const deleteWorkspace = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const remaining = workspaces.filter(w => w.id !== id);
    if (remaining.length === 0) {
      return { success: false, error: 'You must have at least one active workspace.' };
    }

    setWorkspaces(remaining);
    if (currentWorkspace?.id === id) {
      setCurrentWorkspace(remaining[0]);
    }

    const client = supabaseState.client;
    if (supabaseState.isConfigured && client && isDbSynced) {
      await client.from('workspaces').delete().eq('id', id);
    }

    return { success: true };
  };

  // Join Workspace With Code (Stitch Feature)
  const joinWorkspaceWithCode = async (
    code: string
  ): Promise<{ success: boolean; workspace?: Workspace; error?: string }> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return { success: false, error: 'Please enter a valid workspace invite code.' };

    const client = supabaseState.client;
    if (supabaseState.isConfigured && client && isDbSynced) {
      try {
        const { data, error } = await client.rpc('join_workspace_by_code', { _code: cleanCode });
        if (!error && data?.success) {
          await loadData();
          return { success: true };
        }
        if (error) {
          console.warn('RPC join error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase join failed:', err);
      }
    }

    // Fallback: check locally stored workspaces
    const matched = workspaces.find(w => w.inviteCode?.toUpperCase() === cleanCode);
    if (matched) {
      setCurrentWorkspace(matched);
      return { success: true, workspace: matched };
    }

    return { success: false, error: 'No workspace found with this invite code. Please check and try again.' };
  };

  // Load Demo Data (Optional CTA for new clean users)
  const loadDemoData = async () => {
    let targetWs = currentWorkspace;
    if (!targetWs) {
      const demoWsId = `ws_demo_${Date.now()}`;
      targetWs = {
        id: demoWsId,
        name: 'Nexus Engineering Core',
        slug: 'nexus-core-demo',
        inviteCode: 'NX-DEMO-01',
        ownerId: userId,
        createdAt: new Date().toISOString(),
      };
      setWorkspaces([targetWs]);
      setCurrentWorkspaceState(targetWs);
    }
    const demoProjId = `proj_demo_${Date.now()}`;
    const demoProj: Project = {
      id: demoProjId,
      workspaceId: targetWs.id,
      name: 'Interactive Sprint Demo',
      description: 'Explore live Kanban drag-and-drop, sprint velocity, and priority filters.',
      createdAt: new Date().toISOString(),
    };

    const demoTasks: Task[] = [
      {
        id: `tsk_d1_${Date.now()}`,
        projectId: demoProjId,
        title: 'Review production database schema & RLS policies',
        description: 'Verify all table permissions and tenant isolation rules.',
        status: 'DONE',
        priority: 'HIGH',
        creatorId: userId,
        assigneeId: userId,
        dueAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        orderIndex: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: `tsk_d2_${Date.now()}`,
        projectId: demoProjId,
        title: 'Configure automated sprint velocity metrics',
        description: 'Track throughput and milestone completion rates automatically.',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        creatorId: userId,
        dueAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        orderIndex: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: `tsk_d3_${Date.now()}`,
        projectId: demoProjId,
        title: 'Invite engineering team members to workspace',
        description: 'Assign role permissions (OWNER vs MEMBER) to teammates.',
        status: 'TODO',
        priority: 'MEDIUM',
        creatorId: userId,
        dueAt: new Date(Date.now() + 86400000 * 5).toISOString(),
        orderIndex: 2,
        createdAt: new Date().toISOString(),
      },
    ];

    setProjects(prev => [demoProj, ...prev]);
    setCurrentProject(demoProj);
    setTasks(prev => [...demoTasks, ...prev]);
  };

  // Clear all workspace data
  const clearAllData = () => {
    try {
      localStorage.removeItem(`${STORAGE_WORKSPACES_PREFIX}${userId}`);
      workspaces.forEach(w => {
        localStorage.removeItem(`${STORAGE_PROJECTS_PREFIX}${w.id}`);
        localStorage.removeItem(`${STORAGE_TASKS_PREFIX}${w.id}`);
        localStorage.removeItem(`${STORAGE_MEMBERS_PREFIX}${w.id}`);
      });
    } catch {}
    setWorkspaces([]);
    setCurrentWorkspaceState(null);
    setProjects([]);
    setCurrentProject(null);
    setTasks([]);
    setMembers([]);
  };

  // Invite Member
  const inviteMember = async (email: string, role: Role): Promise<{ success: boolean; error?: string }> => {
    if (!email.trim()) return { success: false, error: 'Email address is required.' };
    if (!currentWorkspace) return { success: false, error: 'No active workspace selected.' };

    const cleanEmail = email.trim().toLowerCase();
    if (members.some(m => m.user?.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Member is already in this workspace.' };
    }

    const newMember: WorkspaceMember = {
      id: `mem_${Date.now()}`,
      workspaceId: currentWorkspace.id,
      userId: `usr_ext_${Date.now()}`,
      role,
      joinedAt: new Date().toISOString(),
      user: {
        id: `usr_ext_${Date.now()}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
      },
    };

    setMembers(prev => [...prev, newMember]);
    return { success: true };
  };

  // Remove Member
  const removeMember = async (userIdToRemove: string): Promise<{ success: boolean; error?: string }> => {
    if (userIdToRemove === userId) {
      return { success: false, error: 'Workspace owner cannot be removed.' };
    }
    setMembers(prev => prev.filter(m => m.userId !== userIdToRemove));
    return { success: true };
  };

  // Create Project
  const createProject = async (
    name: string,
    description?: string
  ): Promise<{ success: boolean; project?: Project; error?: string }> => {
    if (!name.trim()) return { success: false, error: 'Project name is required.' };
    if (!currentWorkspace) return { success: false, error: 'No active workspace.' };

    const newProj: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      workspaceId: currentWorkspace.id,
      name: name.trim(),
      description: description?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    const client = supabaseState.client;
    if (supabaseState.isConfigured && client && isDbSynced) {
      try {
        const { data, error } = await client
          .from('projects')
          .insert({
            workspace_id: currentWorkspace.id,
            name: newProj.name,
            description: newProj.description,
          })
          .select()
          .single();

        if (data && !error) newProj.id = data.id;
      } catch (err) {
        console.warn(err);
      }
    }

    setProjects(prev => [newProj, ...prev]);
    setCurrentProject(newProj);
    return { success: true, project: newProj };
  };

  // Update Project
  const updateProject = async (
    id: string,
    name: string,
    description?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim()) return { success: false, error: 'Project name is required.' };

    setProjects(prev =>
      prev.map(p =>
        p.id === id ? { ...p, name: name.trim(), description: description?.trim(), updatedAt: new Date().toISOString() } : p
      )
    );

    if (currentProject?.id === id) {
      setCurrentProject(prev => (prev ? { ...prev, name: name.trim(), description: description?.trim() } : null));
    }

    const client = supabaseState.client;
    if (supabaseState.isConfigured && client && isDbSynced) {
      await client
        .from('projects')
        .update({ name: name.trim(), description: description?.trim() })
        .eq('id', id);
    }

    return { success: true };
  };

  // Delete Project
  const deleteProject = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const remaining = projects.filter(p => p.id !== id);
    setProjects(remaining);
    if (currentProject?.id === id) {
      setCurrentProject(remaining[0] || null);
    }
    // Also remove associated tasks
    setTasks(prev => prev.filter(t => t.projectId !== id));

    const client = supabaseState.client;
    if (supabaseState.isConfigured && client && isDbSynced) {
      await client.from('projects').delete().eq('id', id);
    }

    return { success: true };
  };

  // Create Task
  const createTask = async (
    data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'orderIndex'>
  ): Promise<{ success: boolean; task?: Task; error?: string }> => {
    if (!data.title.trim()) return { success: false, error: 'Task title is required.' };
    if (!currentProject) return { success: false, error: 'Please select a project first.' };

    const newTask: Task = {
      ...data,
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: currentProject.id,
      orderIndex: tasks.filter(t => t.status === data.status).length,
      createdAt: new Date().toISOString(),
      creatorId: userId,
      assignee: members.find(m => m.userId === data.assigneeId)?.user,
    };

    const client = supabaseState.client;
    if (supabaseState.isConfigured && client && isDbSynced) {
      try {
        const { data: dbData, error } = await client
          .from('tasks')
          .insert({
            project_id: currentProject.id,
            title: newTask.title,
            description: newTask.description,
            status: newTask.status,
            priority: newTask.priority,
            assignee_id: newTask.assigneeId,
            creator_id: userId,
            due_at: newTask.dueAt,
            order_index: newTask.orderIndex,
          })
          .select('*, assignee:assignee_id(id, full_name, email, avatar_url)')
          .single();

        if (dbData && !error) {
          newTask.id = dbData.id;
        }
      } catch (err) {
        console.warn(err);
      }
    }

    setTasks(prev => [...prev, newTask]);
    broadcastCollabEvent({
      type: 'TASK_CREATED',
      task: newTask,
    });
    return { success: true, task: newTask };
  };

  // Update Task
  const updateTask = async (taskId: string, updates: Partial<Task>): Promise<{ success: boolean; error?: string }> => {
    let updatedTaskObj: Task | null = null;
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const updated = { ...t, ...updates, updatedAt: new Date().toISOString() };
          if (updates.assigneeId) {
            updated.assignee = members.find(m => m.userId === updates.assigneeId)?.user;
          }
          updatedTaskObj = updated;
          return updated;
        }
        return t;
      })
    );

    if (updatedTaskObj) {
      broadcastCollabEvent({
        type: updates.status ? 'TASK_MOVED' : 'TASK_UPDATED',
        task: updatedTaskObj,
      });
    }

    const client = supabaseState.client;
    if (supabaseState.isConfigured && client && isDbSynced) {
      await client
        .from('tasks')
        .update({
          ...(updates.title && { title: updates.title }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.status && { status: updates.status }),
          ...(updates.priority && { priority: updates.priority }),
          ...(updates.assigneeId !== undefined && { assignee_id: updates.assigneeId }),
          ...(updates.dueAt !== undefined && { due_at: updates.dueAt }),
        })
        .eq('id', taskId);
    }

    return { success: true };
  };

  // Move Task Status (Kanban Drop)
  const moveTaskStatus = async (taskId: string, newStatus: TaskStatus): Promise<{ success: boolean; error?: string }> => {
    return updateTask(taskId, { status: newStatus });
  };

  // Delete Task
  const deleteTask = async (taskId: string): Promise<{ success: boolean; error?: string }> => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    broadcastCollabEvent({
      type: 'TASK_DELETED',
      taskId,
    });

    const client = supabaseState.client;
    if (supabaseState.isConfigured && client && isDbSynced) {
      await client.from('tasks').delete().eq('id', taskId);
    }

    return { success: true };
  };

  // Fetch Comments
  const fetchCommentsForTask = async (taskId: string): Promise<Comment[]> => {
    if (comments[taskId]) return comments[taskId];

    const stored = localStorage.getItem(`${STORAGE_COMMENTS_PREFIX}${taskId}`);
    const parsed: Comment[] = stored ? JSON.parse(stored) : [];
    setComments(prev => ({ ...prev, [taskId]: parsed }));
    return parsed;
  };

  // Add Comment
  const addComment = async (
    taskId: string,
    body: string
  ): Promise<{ success: boolean; comment?: Comment; error?: string }> => {
    if (!body.trim()) return { success: false, error: 'Comment cannot be blank.' };

    const newComment: Comment = {
      id: `comm_${Date.now()}`,
      taskId,
      authorId: userId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
      author: {
        id: userId,
        name: user?.name || 'Member',
        email: user?.email || '',
        avatarUrl: user?.avatarUrl,
      },
    };

    const updated = [...(comments[taskId] || []), newComment];
    setComments(prev => ({ ...prev, [taskId]: updated }));
    localStorage.setItem(`${STORAGE_COMMENTS_PREFIX}${taskId}`, JSON.stringify(updated));

    broadcastCollabEvent({
      type: 'COMMENT_ADDED',
      taskId,
      comment: newComment,
    });

    return { success: true, comment: newComment };
  };

  // Delete Comment
  const deleteComment = async (taskId: string, commentId: string): Promise<{ success: boolean; error?: string }> => {
    const updated = (comments[taskId] || []).filter(c => c.id !== commentId);
    setComments(prev => ({ ...prev, [taskId]: updated }));
    localStorage.setItem(`${STORAGE_COMMENTS_PREFIX}${taskId}`, JSON.stringify(updated));
    return { success: true };
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        isLoading,
        isDbSynced,
        setCurrentWorkspace,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        members,
        inviteMember,
        removeMember,
        projects,
        currentProject,
        setCurrentProject,
        createProject,
        updateProject,
        deleteProject,
        tasks,
        createTask,
        updateTask,
        moveTaskStatus,
        deleteTask,
        comments,
        fetchCommentsForTask,
        addComment,
        deleteComment,
        joinWorkspaceWithCode,
        loadDemoData,
        clearAllData,
        hasCompletedOnboarding,
        completeOnboarding,
        resetOnboarding,
        realtimeStatus,
        activeCollaborators,
        recentLiveEvent,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
