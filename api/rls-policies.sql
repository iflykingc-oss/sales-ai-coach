-- ============================================
-- Supabase RLS Policies for Sales AI Coach
-- ============================================
-- Run this in Supabase SQL Editor
-- This enables RLS and creates policies for all tables

-- ============================================
-- 1. Enable RLS on all tables
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_script_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_changes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Users table policies
-- ============================================

-- Users can read their own data
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid()::text = id::text);

-- Users can update their own data
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid()::text = id::text);

-- Service role can do everything (bypasses RLS automatically)
-- No policy needed for service_role

-- ============================================
-- 3. Teams table policies
-- ============================================

-- Team members can view their team
CREATE POLICY "Team members can view team"
ON teams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.team_id = teams.id
    AND users.id::text = auth.uid()::text
  )
);

-- Team owners can update their team
CREATE POLICY "Team owners can update team"
ON teams FOR UPDATE
USING (owner_id::text = auth.uid()::text);

-- ============================================
-- 4. Sessions table policies
-- ============================================

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON sessions FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
ON sessions FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
ON sessions FOR UPDATE
USING (user_id::text = auth.uid()::text);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
ON sessions FOR DELETE
USING (user_id::text = auth.uid()::text);

-- ============================================
-- 5. Messages table policies (via session)
-- ============================================

-- Users can view messages from their sessions
CREATE POLICY "Users can view own session messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = messages.session_id
    AND sessions.user_id::text = auth.uid()::text
  )
);

-- Users can insert messages to their sessions
CREATE POLICY "Users can insert messages to own sessions"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions
    WHERE sessions.id = session_id
    AND sessions.user_id::text = auth.uid()::text
  )
);

-- ============================================
-- 6. Scripts table policies
-- ============================================

-- Users can view their own scripts
CREATE POLICY "Users can view own scripts"
ON scripts FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can insert their own scripts
CREATE POLICY "Users can insert own scripts"
ON scripts FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- Users can update their own scripts
CREATE POLICY "Users can update own scripts"
ON scripts FOR UPDATE
USING (user_id::text = auth.uid()::text);

-- Users can delete their own scripts
CREATE POLICY "Users can delete own scripts"
ON scripts FOR DELETE
USING (user_id::text = auth.uid()::text);

-- ============================================
-- 7. Knowledge items table policies
-- ============================================

-- Users can view their own knowledge items
CREATE POLICY "Users can view own knowledge"
ON knowledge_items FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can insert their own knowledge items
CREATE POLICY "Users can insert own knowledge"
ON knowledge_items FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- Users can update their own knowledge items
CREATE POLICY "Users can update own knowledge"
ON knowledge_items FOR UPDATE
USING (user_id::text = auth.uid()::text);

-- Users can delete their own knowledge items
CREATE POLICY "Users can delete own knowledge"
ON knowledge_items FOR DELETE
USING (user_id::text = auth.uid()::text);

-- ============================================
-- 8. Practice sessions table policies
-- ============================================

-- Users can view their own practice sessions
CREATE POLICY "Users can view own practices"
ON practice_sessions FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can insert their own practice sessions
CREATE POLICY "Users can insert own practices"
ON practice_sessions FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- Users can update their own practice sessions
CREATE POLICY "Users can update own practices"
ON practice_sessions FOR UPDATE
USING (user_id::text = auth.uid()::text);

-- Users can delete their own practice sessions
CREATE POLICY "Users can delete own practices"
ON practice_sessions FOR DELETE
USING (user_id::text = auth.uid()::text);

-- ============================================
-- 9. Review reports table policies
-- ============================================

-- Users can view their own review reports
CREATE POLICY "Users can view own reviews"
ON review_reports FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can insert their own review reports
CREATE POLICY "Users can insert own reviews"
ON review_reports FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- Users can delete their own review reports
CREATE POLICY "Users can delete own reviews"
ON review_reports FOR DELETE
USING (user_id::text = auth.uid()::text);

-- ============================================
-- 10. Industry plugins table policies
-- ============================================

-- Everyone can read plugins (public data)
CREATE POLICY "Everyone can view plugins"
ON industry_plugins FOR SELECT
USING (true);

-- Only admins can insert/update/delete plugins
CREATE POLICY "Admins can manage plugins"
ON industry_plugins FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id::text = auth.uid()::text
    AND users.role = 'ADMIN'
  )
);

-- ============================================
-- 11. Shared scripts table policies
-- ============================================

-- Team members can view shared scripts
CREATE POLICY "Team members can view shared scripts"
ON shared_scripts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.team_id = shared_scripts.team_id
    AND users.id::text = auth.uid()::text
  )
);

-- Team members can insert shared scripts
CREATE POLICY "Team members can insert shared scripts"
ON shared_scripts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.team_id = team_id
    AND users.id::text = auth.uid()::text
  )
);

-- ============================================
-- 12. Shared script likes table policies
-- ============================================

-- Users can view likes on scripts they can see
CREATE POLICY "Users can view script likes"
ON shared_script_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shared_scripts
    WHERE shared_scripts.id = shared_script_likes.script_id
  )
);

-- Users can insert their own likes
CREATE POLICY "Users can insert own likes"
ON shared_script_likes FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- Users can delete their own likes
CREATE POLICY "Users can delete own likes"
ON shared_script_likes FOR DELETE
USING (user_id::text = auth.uid()::text);

-- ============================================
-- 13. Script feedbacks table policies
-- ============================================

-- Users can view their own feedbacks
CREATE POLICY "Users can view own feedbacks"
ON script_feedbacks FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can insert their own feedbacks
CREATE POLICY "Users can insert own feedbacks"
ON script_feedbacks FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- ============================================
-- 14. Model configs table policies
-- ============================================

-- Only admins can manage model configs
CREATE POLICY "Admins can manage model configs"
ON model_configs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id::text = auth.uid()::text
    AND users.role = 'ADMIN'
  )
);

-- ============================================
-- 15. Usage logs table policies
-- ============================================

-- Users can view their own usage logs
CREATE POLICY "Users can view own usage logs"
ON usage_logs FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can insert their own usage logs
CREATE POLICY "Users can insert own usage logs"
ON usage_logs FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- ============================================
-- 16. Team tasks table policies
-- ============================================

-- Team members can view team tasks
CREATE POLICY "Team members can view team tasks"
ON team_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.team_id = team_tasks.team_id
    AND users.id::text = auth.uid()::text
  )
);

-- Team members can insert team tasks
CREATE POLICY "Team members can insert team tasks"
ON team_tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.team_id = team_id
    AND users.id::text = auth.uid()::text
  )
);

-- ============================================
-- 17. API keys table policies
-- ============================================

-- Users can view their own API keys
CREATE POLICY "Users can view own api keys"
ON api_keys FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can insert their own API keys
CREATE POLICY "Users can insert own api keys"
ON api_keys FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- Users can update their own API keys
CREATE POLICY "Users can update own api keys"
ON api_keys FOR UPDATE
USING (user_id::text = auth.uid()::text);

-- Users can delete their own API keys
CREATE POLICY "Users can delete own api keys"
ON api_keys FOR DELETE
USING (user_id::text = auth.uid()::text);

-- ============================================
-- 18. API usage logs table policies (via api_key)
-- ============================================

-- Users can view their own API usage logs
CREATE POLICY "Users can view own api usage logs"
ON api_usage_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM api_keys
    WHERE api_keys.id = api_usage_logs.api_key_id
    AND api_keys.user_id::text = auth.uid()::text
  )
);

-- ============================================
-- 19. Consent records table policies
-- ============================================

-- Users can view their own consent records
CREATE POLICY "Users can view own consent records"
ON consent_records FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can insert their own consent records
CREATE POLICY "Users can insert own consent records"
ON consent_records FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- ============================================
-- 20. Data deletion requests table policies
-- ============================================

-- Users can view their own deletion requests
CREATE POLICY "Users can view own deletion requests"
ON data_deletion_requests FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can insert their own deletion requests
CREATE POLICY "Users can insert own deletion requests"
ON data_deletion_requests FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- ============================================
-- 21. Plan changes table policies
-- ============================================

-- Users can view their own plan changes
CREATE POLICY "Users can view own plan changes"
ON plan_changes FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can insert their own plan changes
CREATE POLICY "Users can insert own plan changes"
ON plan_changes FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

-- ============================================
-- Done! RLS is now enabled on all tables.
-- Service role bypasses RLS automatically.
-- ============================================
