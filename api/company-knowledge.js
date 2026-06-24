/**
 * 公司专属知识 API
 *
 * 数据隔离：每个用户只能访问自己的知识
 * 合规：支持 GDPR/PIPL，数据不出租户边界
 */

const { sbSafeQuery, sbInsert, sbUpdate, sbDelete } = require('./index.js');

// 获取当前用户的所有公司知识
async function listCompanyKnowledge(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
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
    const jwt = require('./index.js').requireAuth(req);
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
    const jwt = require('./index.js').requireAuth(req);
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
    const jwt = require('./index.js').requireAuth(req);
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

module.exports = {
  listCompanyKnowledge,
  createCompanyKnowledge,
  updateCompanyKnowledge,
  deleteCompanyKnowledge
};
