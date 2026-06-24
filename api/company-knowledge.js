/**
 * 公司专属知识 API
 *
 * 数据隔离：每个用户只能访问自己的知识
 * 合规：支持 GDPR/PIPL，数据不出租户边界
 */

// 注意：这些函数在 index.js 中定义，通过闭包访问
// 由于 index.js 没有导出，我们需要在这里重新实现或通过 req.app 访问
// 这里使用直接 fetch Supabase 的方式

const SUPABASE_URL = 'https://doqcopkqbfpstuavfjsa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbQuery(table, opts = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  const params = new URLSearchParams();
  if (opts.select) params.append('select', opts.select);
  if (opts.limit) params.append('limit', opts.limit);
  if (opts.order) params.append('order', opts.order);
  if (opts.eq) for (const [c, v] of Object.entries(opts.eq)) params.append(c, `eq.${v}`);
  const qs = params.toString();
  if (qs) url += '?' + qs;
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error('SB ' + table + ': ' + resp.status);
  return resp.json();
}

// Safe query that returns empty on table-not-found
async function sbSafeQuery(table, opts = {}) {
  try { return await sbQuery(table, opts); }
  catch (e) { if (e.message && e.message.includes('PGRST205')) return []; throw e; }
}

async function sbInsert(table, data) {
  const resp = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) throw new Error('SB insert: ' + resp.status);
  const r = await resp.json();
  return Array.isArray(r) ? r[0] : r;
}

async function sbUpdate(table, eq, data) {
  let url = SUPABASE_URL + '/rest/v1/' + table;
  const params = new URLSearchParams();
  for (const [c, v] of Object.entries(eq)) params.append(c, 'eq.' + v);
  url += '?' + params.toString();
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) throw new Error('SB update: ' + resp.status);
  return resp.json();
}

function requireAuth(req) {
  const jwt = require('jsonwebtoken');
  const cookie = req.headers.cookie || '';
  const tokenMatch = cookie.match(/token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token) throw { status: 401, error: 'No token' };
  return jwt.verify(token, process.env.JWT_SECRET);
}

// 获取当前用户的所有公司知识
async function listCompanyKnowledge(req, res) {
  try {
    const jwt = requireAuth(req);
    const { category } = req.query;

    const eq = { user_id: jwt.userId, is_active: true };
    if (category) eq.category = category;

    const items = await sbSafeQuery('company_knowledge', {
      select: 'id,category,title,content,created_at,updated_at',
      eq,
      order: 'created_at.desc',
      limit: 100
    });

    res.json({ success: true, data: items || [] });
  } catch (err) {
    console.error('List company knowledge error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch knowledge' });
  }
}

// 创建公司知识
async function createCompanyKnowledge(req, res) {
  try {
    const jwt = requireAuth(req);
    const { category, title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    const validCategories = ['price', 'course', 'policy', 'case', 'general'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }

    const item = await sbInsert('company_knowledge', {
      id: crypto.randomUUID(),
      user_id: jwt.userId,
      category: category || 'general',
      title,
      content,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('Create company knowledge error:', err);
    res.status(500).json({ success: false, error: 'Failed to create knowledge' });
  }
}

// 更新公司知识
async function updateCompanyKnowledge(req, res) {
  try {
    const jwt = requireAuth(req);
    const { id } = req.params;
    const { title, content, category } = req.body;

    // RLS 会自动验证 user_id，这里不需要额外检查
    const updateData = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;

    const result = await sbUpdate('company_knowledge', { id, user_id: jwt.userId }, updateData);

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Update company knowledge error:', err);
    res.status(500).json({ success: false, error: 'Failed to update knowledge' });
  }
}

// 删除公司知识（软删除）
async function deleteCompanyKnowledge(req, res) {
  try {
    const jwt = requireAuth(req);
    const { id } = req.params;

    await sbUpdate('company_knowledge', { id, user_id: jwt.userId }, {
      is_active: false,
      updated_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete company knowledge error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete knowledge' });
  }
}

// 默认导出函数（Vercel Serverless Function 要求）
module.exports = async (req, res) => {
  // 这个文件是被 index.js require 的，不是独立运行
  // 如果被直接调用，返回 404
  res.status(404).json({ error: 'This module should be accessed via /api/company-knowledge' });
};

// 命名导出（供 index.js 使用）
module.exports.listCompanyKnowledge = listCompanyKnowledge;
module.exports.createCompanyKnowledge = createCompanyKnowledge;
module.exports.updateCompanyKnowledge = updateCompanyKnowledge;
module.exports.deleteCompanyKnowledge = deleteCompanyKnowledge;
