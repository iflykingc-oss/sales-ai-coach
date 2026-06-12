#!/usr/bin/env node
// 直接连接 Supabase 创建公告系统表

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log('   URL:', SUPABASE_URL);

// 执行 SQL 查询
async function query(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

// 检查表是否存在
async function checkTable(tableName) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${tableName}`);
    url.searchParams.append('select', 'id');
    url.searchParams.append('limit', '1');

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(res.statusCode === 200);
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 创建表的 SQL
const CREATE_TABLES_SQL = `
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
  created_by UUID,
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
  user_id UUID,
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

async function main() {
  try {
    // 检查表是否存在
    console.log('\n📋 Checking existing tables...');

    const tables = ['announcements', 'announcement_translations', 'announcement_reads'];
    const missing = [];

    for (const table of tables) {
      const exists = await checkTable(table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
      if (!exists) missing.push(table);
    }

    if (missing.length === 0) {
      console.log('\n✅ All tables already exist!');
      return;
    }

    console.log(`\n🔄 Creating ${missing.length} missing tables...`);

    // 尝试通过 rpc 执行 SQL
    const result = await query(CREATE_TABLES_SQL);

    if (result.status >= 200 && result.status < 300) {
      console.log('✅ Tables created successfully via RPC!');
    } else {
      console.log('⚠️  RPC not available, trying alternative method...');

      // 如果 rpc 不可用，尝试直接通过 Management API
      // 这需要额外的配置，这里先输出 SQL 让用户手动执行
      console.log('\n📝 Please execute the following SQL in Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard → SQL Editor\n');
      console.log('```sql');
      console.log(CREATE_TABLES_SQL);
      console.log('```');
    }

    // 验证表是否创建成功
    console.log('\n📋 Verifying tables...');
    for (const table of tables) {
      const exists = await checkTable(table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
