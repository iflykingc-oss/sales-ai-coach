-- 公告系统数据库表

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'once', -- once: 一次性, recurring: 每次展示, scheduled: 定时
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, published, paused, archived
  priority INTEGER DEFAULT 0, -- 优先级，数字越大越靠前
  target_audience VARCHAR(20) DEFAULT 'all', -- all, free, professional, team, enterprise
  scheduled_at TIMESTAMP WITH TIME ZONE, -- 定时发布时间
  expires_at TIMESTAMP WITH TIME ZONE, -- 过期时间
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 公告多语言内容表
CREATE TABLE IF NOT EXISTS announcement_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL, -- zh, en, th, vi, ms, id
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, locale)
);

-- 公告阅读记录表
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dismissed_at TIMESTAMP WITH TIME ZONE, -- 用户关闭公告的时间
  UNIQUE(announcement_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_scheduled_at ON announcements(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_announcement_translations_locale ON announcement_translations(locale);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);

-- RLS 策略
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- 管理员可以管理所有公告
CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN')
  );

-- 用户可以查看已发布的公告
CREATE POLICY "Users can view published announcements" ON announcements
  FOR SELECT USING (status = 'published' AND (expires_at IS NULL OR expires_at > NOW()));

-- 管理员可以管理翻译
CREATE POLICY "Admins can manage translations" ON announcement_translations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN')
  );

-- 用户可以查看翻译
CREATE POLICY "Users can view translations" ON announcement_translations
  FOR SELECT USING (true);

-- 用户可以管理自己的阅读记录
CREATE POLICY "Users can manage own reads" ON announcement_reads
  FOR ALL USING (user_id = auth.uid());

-- 管理员可以查看所有阅读记录
CREATE POLICY "Admins can view all reads" ON announcement_reads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN')
  );
