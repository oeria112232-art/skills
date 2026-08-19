-- Migration: Add missing columns that were added after initial schema
-- Uses IF NOT EXISTS to be safe if columns already exist

-- Add missing columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "points_signature" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cv" json;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "contact_info" json;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company_category" text DEFAULT 'general';

-- Add missing columns to jobs table
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "company_id" integer;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "pass_score" integer DEFAULT 70 NOT NULL;

-- Add indexes if not exists (PostgreSQL doesn't support IF NOT EXISTS for indexes directly, use DO block)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'jobs_company_idx') THEN
    CREATE INDEX "jobs_company_idx" ON "jobs" ("company_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'jobs_status_idx') THEN
    CREATE INDEX "jobs_status_idx" ON "jobs" ("status");
  END IF;
END $$;
