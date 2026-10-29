-- ==============================================================================
-- CogniStudy AI — Supabase SQL Database Setup
-- 
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql/new
-- 2. Paste the SQL script below and click "Run".
-- 3. That's it! Your Supabase database is 100% configured for CogniStudy AI.
-- ==============================================================================

-- 1. Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    profile JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sessions Table (Active User Logins)
CREATE TABLE IF NOT EXISTS public.sessions (
    token TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions (token);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON public.sessions (student_id);

-- 3. Study Items Table (Notes, Flashcards, Quizzes, Mind Maps)
CREATE TABLE IF NOT EXISTS public.study_items (
    id TEXT NOT NULL,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (student_id, id)
);
CREATE INDEX IF NOT EXISTS idx_study_items_student ON public.study_items (student_id);
CREATE INDEX IF NOT EXISTS idx_study_items_type ON public.study_items (type);

-- 4. Activities Table (Dashboard Activity Timeline)
CREATE TABLE IF NOT EXISTS public.activities (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_student ON public.activities (student_id);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    time TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_student ON public.notifications (student_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow full access to service_role (Used securely by your Render backend)
DROP POLICY IF EXISTS "Service Role Access Students" ON public.students;
CREATE POLICY "Service Role Access Students" ON public.students FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Access Sessions" ON public.sessions;
CREATE POLICY "Service Role Access Sessions" ON public.sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Access Study Items" ON public.study_items;
CREATE POLICY "Service Role Access Study Items" ON public.study_items FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Access Activities" ON public.activities;
CREATE POLICY "Service Role Access Activities" ON public.activities FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Access Notifications" ON public.notifications;
CREATE POLICY "Service Role Access Notifications" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- End of Supabase Setup Script
