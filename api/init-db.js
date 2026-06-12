// 数据库初始化脚本 - 自动创建公告系统表
// 这个脚本会在首次访问时自动执行

const https = require('https');

const SUPABASE_URL = 'https://doqcopkqbfpstuavfjsa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 执行 SQL 的函数
async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
    const options = {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          // 如果 rpc 不存在，尝试直接创建表
          resolve({ success: false, status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ sql }));
    req.end();
  });
}

// 检查表是否存在
async function tableExists(tableName) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=id&limit=1`;
    const options = {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(res.statusCode === 200);
      });
    }).on('error', () => resolve(false));
  });
}

// 初始化数据库
async function initDatabase() {
  if (!SUPABASE_KEY) {
    console.log('⚠️ SUPABASE_SERVICE_ROLE_KEY not set, skipping DB init');
    return { success: false, reason: 'no_key' };
  }

  console.log('🔄 Checking database tables...');

  const tables = ['announcements', 'announcement_translations', 'announcement_reads'];
  const missingTables = [];

  for (const table of tables) {
    const exists = await tableExists(table);
    if (exists) {
      console.log(`✅ Table '${table}' exists`);
    } else {
      console.log(`❌ Table '${table}' missing`);
      missingTables.push(table);
    }
  }

  if (missingTables.length === 0) {
    console.log('✅ All announcement tables exist');
    return { success: true, created: 0 };
  }

  console.log(`🔄 Need to create ${missingTables.length} tables...`);

  // 由于 Supabase REST API 不支持直接执行 DDL，
  // 我们需要通过 Supabase Dashboard 创建表
  // 这里返回需要执行的 SQL
  const sql = `
-- 公告系统数据库表
-- 请在 Supabase SQL Editor 中执行此 SQL

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'once',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  priority INTEGER DEFAULT 0,
  target_audience VARCHAR(20) DEFAULT 'all',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 公告多语言内容表
CREATE TABLE IF NOT EXISTS announcement_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL,
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
  dismissed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(announcement_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcement_translations_locale ON announcement_translations(locale);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);
`;

  return {
    success: false,
    reason: 'tables_missing',
    missingTables,
    sql
  };
}

module.exports = { initDatabase, tableExists };
