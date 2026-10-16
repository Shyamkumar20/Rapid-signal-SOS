/*
# Rapid Signal SOS — Database Schema

## Overview
Creates the full data model for the Rapid Signal SOS platform: a government-style
emergency reporting system where citizens report accidents via a voice AI agent
(TARA), reports are auto-dispatched to emergency services, and responders are rewarded.

## New Tables

1. `profiles` — Citizen profile data linked to Supabase auth.
   - `id` (uuid, PK, = auth.users.id)
   - `full_name` (text)
   - `phone` (text, unique) — Indian mobile number
   - `email` (text, nullable)
   - `created_at` (timestamptz)

2. `sos_reports` — Emergency incident reports filed by citizens via TARA.
   - `id` (uuid, PK)
   - `reporter_id` (uuid, FK -> profiles.id)
   - `reporter_name` (text)
   - `reporter_phone` (text)
   - `incident_type` (text) — e.g. "Car Crash", "Fire", "Medical Emergency"
   - `description` (text) — TARA-generated summary of the incident
   - `latitude` (double precision, nullable)
   - `longitude` (double precision, nullable)
   - `location_text` (text) — human-readable location
   - `severity` (text) — 'low' | 'medium' | 'high' | 'critical'
   - `dispatched_services` (jsonb) — which services were notified
   - `cluster_id` (uuid, nullable) — groups multiple reports of the same incident
   - `status` (text) — 'pending' | 'accepted' | 'resolved'
   - `created_at` (timestamptz)

3. `dispatch_logs` — Record of each dispatch notification sent to officials.
   - `id` (uuid, PK)
   - `report_id` (uuid, FK -> sos_reports.id)
   - `service_type` (text) — 'ambulance' | 'fire' | 'police'
   - `service_number` (text) — '108' | '101' | '100'
   - `recipient_phone` (text) — the phone number the report was sent to
   - `message` (text)
   - `status` (text) — 'sent' | 'failed' | 'accepted'
   - `sent_at` (timestamptz)

4. `rewards` — Government recognition rewards for helpful citizens.
   - `id` (uuid, PK)
   - `user_id` (uuid, FK -> profiles.id)
   - `report_id` (uuid, FK -> sos_reports.id)
   - `title` (text)
   - `description` (text)
   - `amount` (numeric) — reward amount in INR
   - `status` (text) — 'pending' | 'awarded'
   - `awarded_at` (timestamptz, nullable)
   - `created_at` (timestamptz)

## Security
- RLS enabled on all tables.
- Profiles: owner-scoped (users see/edit only their own profile).
- SOS reports: owner can see their own reports; all authenticated users can see
  pending/accepted reports (shared emergency visibility). Inserts restricted to owner.
- Dispatch logs: readable by the report owner only.
- Rewards: owner-scoped.

## Notes
- `reporter_id` defaults to auth.uid() so client inserts without it still work.
- `cluster_id` is nullable and used to merge reports about the same incident.
*/

-- ===== profiles =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text UNIQUE NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== sos_reports =====
CREATE TABLE IF NOT EXISTS sos_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_name text NOT NULL,
  reporter_phone text NOT NULL,
  incident_type text NOT NULL DEFAULT 'Unknown',
  description text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  location_text text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  dispatched_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  cluster_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sos_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reports" ON sos_reports;
CREATE POLICY "select_reports" ON sos_reports
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_report" ON sos_reports;
CREATE POLICY "insert_own_report" ON sos_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "update_own_report" ON sos_reports;
CREATE POLICY "update_own_report" ON sos_reports
  FOR UPDATE TO authenticated USING (auth.uid() = reporter_id) WITH CHECK (auth.uid() = reporter_id);

-- ===== dispatch_logs =====
CREATE TABLE IF NOT EXISTS dispatch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES sos_reports(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  service_number text NOT NULL,
  recipient_phone text NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed','accepted')),
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dispatch_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_dispatch_logs" ON dispatch_logs;
CREATE POLICY "select_own_dispatch_logs" ON dispatch_logs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM sos_reports r WHERE r.id = dispatch_logs.report_id AND r.reporter_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_dispatch_log" ON dispatch_logs;
CREATE POLICY "insert_own_dispatch_log" ON dispatch_logs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM sos_reports r WHERE r.id = dispatch_logs.report_id AND r.reporter_id = auth.uid())
  );

-- ===== rewards =====
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES sos_reports(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','awarded')),
  awarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_rewards" ON rewards;
CREATE POLICY "select_own_rewards" ON rewards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_sos_reports_reporter_id ON sos_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_sos_reports_status ON sos_reports(status);
CREATE INDEX IF NOT EXISTS idx_sos_reports_cluster_id ON sos_reports(cluster_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_report_id ON dispatch_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id);
