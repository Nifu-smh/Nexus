-- ==============================================================================
-- NEXUS DATABASE SCHEMA & MULTI-TENANCY RLS DEFINITION
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/cuhtmrcnssdnhehfmajc/sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE workspace_role AS ENUM ('OWNER', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Synced with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  has_completed_onboarding BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure column exists if table was already created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false NOT NULL;

-- Trigger to automatically create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, has_completed_onboarding)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  invite_code TEXT UNIQUE DEFAULT ('NX-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure column exists if table was already created
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS invite_code TEXT;
UPDATE public.workspaces SET invite_code = 'NX-' || upper(substr(gen_random_uuid()::text, 1, 6)) WHERE invite_code IS NULL;

-- 5. WORKSPACE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role workspace_role DEFAULT 'MEMBER' NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(workspace_id, user_id)
);

-- Trigger to automatically add workspace creator as OWNER in workspace_members
CREATE OR REPLACE FUNCTION public.handle_workspace_creator_membership()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'OWNER')
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'OWNER';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_created_add_owner ON public.workspaces;
CREATE TRIGGER on_workspace_created_add_owner
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_workspace_creator_membership();

-- 6. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'TODO' NOT NULL,
  priority task_priority DEFAULT 'MEDIUM' NOT NULL,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  due_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper Security Function: Check if user belongs to workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Security Function: Check if user is owner of workspace
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = _workspace_id AND owner_id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- WORKSPACES POLICIES
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
CREATE POLICY "Users can view workspaces they belong to"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their workspaces" ON public.workspaces;
CREATE POLICY "Owners can update their workspaces"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their workspaces" ON public.workspaces;
CREATE POLICY "Owners can delete their workspaces"
  ON public.workspaces FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- WORKSPACE MEMBERS POLICIES
DROP POLICY IF EXISTS "Members can view members in their workspace" ON public.workspace_members;
CREATE POLICY "Members can view members in their workspace"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Owners can add members to their workspace" ON public.workspace_members;
CREATE POLICY "Owners can add members to their workspace"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can remove members from their workspace" ON public.workspace_members;
CREATE POLICY "Owners can remove members from their workspace"
  ON public.workspace_members FOR DELETE
  TO authenticated
  USING (public.is_workspace_owner(workspace_id, auth.uid()) OR auth.uid() = user_id);

-- PROJECTS POLICIES
DROP POLICY IF EXISTS "Workspace members can view projects" ON public.projects;
CREATE POLICY "Workspace members can view projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Workspace members can create projects" ON public.projects;
CREATE POLICY "Workspace members can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Workspace members can update projects" ON public.projects;
CREATE POLICY "Workspace members can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Workspace members can delete projects" ON public.projects;
CREATE POLICY "Workspace members can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- TASKS POLICIES
DROP POLICY IF EXISTS "Workspace members can view tasks" ON public.tasks;
CREATE POLICY "Workspace members can view tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
      AND public.is_workspace_member(projects.workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can create tasks" ON public.tasks;
CREATE POLICY "Workspace members can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
      AND public.is_workspace_member(projects.workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can update tasks" ON public.tasks;
CREATE POLICY "Workspace members can update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
      AND public.is_workspace_member(projects.workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can delete tasks" ON public.tasks;
CREATE POLICY "Workspace members can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
      AND public.is_workspace_member(projects.workspace_id, auth.uid())
    )
  );

-- COMMENTS POLICIES
DROP POLICY IF EXISTS "Workspace members can view comments" ON public.comments;
CREATE POLICY "Workspace members can view comments"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      JOIN public.projects ON projects.id = tasks.project_id
      WHERE tasks.id = comments.task_id
      AND public.is_workspace_member(projects.workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Workspace members can post comments" ON public.comments;
CREATE POLICY "Workspace members can post comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.tasks
      JOIN public.projects ON projects.id = tasks.project_id
      WHERE tasks.id = comments.task_id
      AND public.is_workspace_member(projects.workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authors or owners can delete comments" ON public.comments;
CREATE POLICY "Authors or owners can delete comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM public.tasks
      JOIN public.projects ON projects.id = tasks.project_id
      WHERE tasks.id = comments.task_id
      AND public.is_workspace_owner(projects.workspace_id, auth.uid())
    )
  );

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 10.1 WORKSPACE JOIN BY CODE RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.join_workspace_by_code(_code TEXT)
RETURNS JSONB AS $$
DECLARE
  _ws RECORD;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO _ws FROM public.workspaces WHERE upper(invite_code) = upper(trim(_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid workspace invite code');
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_ws.id, _user_id, 'MEMBER')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'workspace_id', _ws.id, 'workspace_name', _ws.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 11. GRANT PRIVILEGES TO POSTGREST ROLES
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- ==============================================================================
-- 12. BACKFILL EXISTING AUTH USERS & INITIAL SEED
-- ==============================================================================
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

INSERT INTO public.workspaces (name, slug, owner_id)
SELECT 
  COALESCE(full_name, 'Nexus Team') || '''s Workspace',
  'ws-' || substr(id::text, 1, 8),
  id
FROM public.profiles
ON CONFLICT (slug) DO NOTHING;

-- ==============================================================================
-- 13. REALTIME REPLICATION CONFIGURATION
-- Enables Supabase Realtime postgres_changes CDC stream on all collaborative tables
-- ==============================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
EXCEPTION WHEN others THEN null;
END $$;

-- Set REPLICA IDENTITY FULL so UPDATE and DELETE events include full prior record state
ALTER TABLE public.workspaces REPLICA IDENTITY FULL;
ALTER TABLE public.workspace_members REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;



