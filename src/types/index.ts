export type Role = 'OWNER' | 'MEMBER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  hasCompletedOnboarding?: boolean;
  createdAt: string;
  password?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  inviteCode?: string;
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  template?: string;
  repoUrl?: string;
  gitSync?: boolean;
}

export interface WorkspaceActivity {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  action: string;
  targetName: string;
  workspaceName: string;
  timestamp: string;
  badge?: string;
  type: 'task' | 'workspace' | 'pr' | 'member';
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  creatorId: string;
  dueAt?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  author?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserSession {
  user: User;
  token: string;
  expiresAt: string;
}

export type RealtimeSyncStatus = 'connected' | 'connecting' | 'disconnected' | 'local_only';

export interface PresenceUser {
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  color?: string;
  onlineAt: string;
}

export interface LiveCollabEvent {
  id: string;
  actorId: string;
  actorName: string;
  type: 'TASK_MOVED' | 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_DELETED' | 'COMMENT_ADDED';
  message: string;
  timestamp: string;
}
