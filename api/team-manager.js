const logger = require('./lib/logger');
/**
 * 团队管理模块
 *
 * 功能：
 * 1. 团队创建者直接创建成员账号
 * 2. 任务分配 + 通知
 * 3. 真实统计数据
 * 4. 共享话术管理
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

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
  const cookie = req.headers.cookie || '';
  const tokenMatch = cookie.match(/token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token) throw { status: 401, error: 'No token' };
  return jwt.verify(token, process.env.JWT_SECRET);
}

// ==================== 团队成员管理 ====================

// 获取团队成员列表
async function getTeamMembers(req, res) {
  try {
    const jwt = requireAuth(req);
    const { teamId } = req.params;

    // 验证用户是否属于该团队
    const user = await sbSafeQuery('users', { select: 'teamId,role', eq: { id: jwt.userId }, limit: 1 });
    if (!user?.[0]?.teamId || user[0].teamId !== teamId) {
      return res.status(403).json({ success: false, error: 'Not a member of this team' });
    }

    const members = await sbSafeQuery('users', {
      select: 'id,name,email,role,created_at,lastLoginAt',
      eq: { teamId: teamId },
      order: 'created_at.desc'
    });

    // 获取每个成员的统计数据
    const membersWithStats = await Promise.all((members || []).map(async (member) => {
      const scripts = await sbSafeQuery('scripts', { select: 'id', eq: { user_id: member.id } });
      const practices = await sbSafeQuery('practice_sessions', { select: 'id,score', eq: { user_id: member.id } });

      const totalScore = (practices || []).reduce((sum, p) => sum + (p.score || 0), 0);
      const avgScore = practices?.length ? Math.round(totalScore / practices.length) : 0;

      return {
        ...member,
        stats: {
          scriptsGenerated: scripts?.length || 0,
          practicesCompleted: practices?.length || 0,
          avgPracticeScore: avgScore,
        }
      };
    }));

    res.json({ success: true, data: membersWithStats || [] });
  } catch (err) {
    logger.error('Get team members error:', err);
    res.status(500).json({ success: false, error: 'Failed to get members' });
  }
}

// 团队创建者直接创建成员账号
async function createTeamMember(req, res) {
  try {
    const jwt = requireAuth(req);
    const { teamId } = req.params;
    const { name, email, password } = req.body;

    // 验证是否是团队创建者
    const team = await sbSafeQuery('teams', { select: '*', eq: { id: teamId }, limit: 1 });
    if (!team?.[0] || team[0].owner_id !== jwt.userId) {
      return res.status(403).json({ success: false, error: 'Only team owner can create members' });
    }

    // 验证邮箱是否已存在
    const existingUser = await sbSafeQuery('users', { select: 'id', eq: { email }, limit: 1 });
    if (existingUser?.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }

    // 创建新用户
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password || '123456', 10);

    const newUser = await sbInsert('users', {
      id: crypto.randomUUID(),
      name,
      email,
      password: hashedPassword,
      role: 'USER',
      teamId: teamId,
      plan: team[0].plan || 'TEAM',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 更新团队成员数
    await sbUpdate('teams', { id: teamId }, {
      member_count: (team[0].member_count || 0) + 1,
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    logger.error('Create team member error:', err);
    res.status(500).json({ success: false, error: 'Failed to create member' });
  }
}

// 移除团队成员
async function removeTeamMember(req, res) {
  try {
    const jwt = requireAuth(req);
    const { teamId, memberId } = req.params;

    // 验证是否是团队创建者
    const team = await sbSafeQuery('teams', { select: '*', eq: { id: teamId }, limit: 1 });
    if (!team?.[0] || team[0].owner_id !== jwt.userId) {
      return res.status(403).json({ success: false, error: 'Only team owner can remove members' });
    }

    // 不能移除自己
    if (memberId === jwt.userId) {
      return res.status(400).json({ success: false, error: 'Cannot remove yourself' });
    }

    // 移除成员
    await sbUpdate('users', { id: memberId, teamId: teamId }, {
      teamId: null,
      updated_at: new Date().toISOString()
    });

    // 更新团队成员数
    await sbUpdate('teams', { id: teamId }, {
      member_count: Math.max(0, (team[0].member_count || 0) - 1),
      updated_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Remove team member error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove member' });
  }
}

// ==================== 团队统计 ====================

// 获取团队真实统计数据
async function getTeamStats(req, res) {
  try {
    const jwt = requireAuth(req);
    const { teamId } = req.params;

    // 验证用户是否属于该团队
    const user = await sbSafeQuery('users', { select: 'teamId', eq: { id: jwt.userId }, limit: 1 });
    if (!user?.[0]?.teamId || user[0].teamId !== teamId) {
      return res.status(403).json({ success: false, error: 'Not a member of this team' });
    }

    // 获取团队成员
    const members = await sbSafeQuery('users', { select: 'id', eq: { teamId: teamId } });
    const memberIds = (members || []).map(m => m.id);

    // 统计数据
    let totalScripts = 0;
    let totalPractices = 0;
    let totalScore = 0;
    let activeToday = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const memberId of memberIds) {
      const scripts = await sbSafeQuery('scripts', { select: 'id', eq: { user_id: memberId } });
      const practices = await sbSafeQuery('practice_sessions', { select: 'id,score,created_at', eq: { user_id: memberId } });

      totalScripts += scripts?.length || 0;
      totalPractices += practices?.length || 0;

      for (const p of practices || []) {
        totalScore += p.score || 0;
        if (p.created_at?.startsWith(today)) {
          activeToday++;
        }
      }
    }

    const avgPracticeScore = totalPractices > 0 ? Math.round(totalScore / totalPractices) : 0;

    // 获取弱项场景
    const weakScenarios = [];
    const scenarioScores = {};

    for (const memberId of memberIds) {
      const practices = await sbSafeQuery('practice_sessions', {
        select: 'scenario,score',
        eq: { user_id: memberId },
        order: 'created_at.desc',
        limit: 50
      });

      for (const p of practices || []) {
        if (p.scenario) {
          if (!scenarioScores[p.scenario]) {
            scenarioScores[p.scenario] = { total: 0, count: 0 };
          }
          scenarioScores[p.scenario].total += p.score || 0;
          scenarioScores[p.scenario].count++;
        }
      }
    }

    for (const [scenario, data] of Object.entries(scenarioScores)) {
      const avgScore = Math.round(data.total / data.count);
      if (avgScore < 70) {
        weakScenarios.push({ scenario, weakness: 100 - avgScore, avgScore });
      }
    }

    weakScenarios.sort((a, b) => b.weakness - a.weakness);

    res.json({
      success: true,
      data: {
        members: members || [],
        stats: {
          totalMembers: memberIds.length,
          activeToday,
          totalScriptsGenerated: totalScripts,
          avgPracticeScore
        },
        weakScenarios: weakScenarios.slice(0, 5)
      }
    });
  } catch (err) {
    logger.error('Get team stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
}

// ==================== 任务管理 ====================

// 创建任务
async function createTask(req, res) {
  try {
    const jwt = requireAuth(req);
    const { teamId } = req.params;
    const { type, assigneeId, deadline, scenario, description } = req.body;

    // 验证是否是团队创建者
    const team = await sbSafeQuery('teams', { select: '*', eq: { id: teamId }, limit: 1 });
    if (!team?.[0] || team[0].owner_id !== jwt.userId) {
      return res.status(403).json({ success: false, error: 'Only team owner can create tasks' });
    }

    const task = await sbInsert('team_tasks', {
      id: crypto.randomUUID(),
      team_id: teamId,
      assignee_id: assigneeId,
      type: type || 'practice',
      scenario: scenario || '通用场景',
      description: description || '',
      deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'PENDING',
      created_at: new Date().toISOString()
    });

    // 创建通知
    await sbInsert('notifications', {
      id: crypto.randomUUID(),
      user_id: assigneeId,
      type: 'TASK_ASSIGNED',
      title: '新任务分配',
      content: `你有一个新的练习任务：${scenario || '通用场景'}`,
      read: false,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, data: { id: task.id } });
  } catch (err) {
    logger.error('Create task error:', err);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
}

// 获取任务列表
async function getTasks(req, res) {
  try {
    const jwt = requireAuth(req);
    const { teamId } = req.params;

    const tasks = await sbSafeQuery('team_tasks', {
      select: '*',
      eq: { team_id: teamId },
      order: 'created_at.desc',
      limit: 50
    });

    // 获取分配人信息
    const tasksWithAssignee = await Promise.all((tasks || []).map(async (task) => {
      const assignee = await sbSafeQuery('users', { select: 'name', eq: { id: task.assignee_id }, limit: 1 });
      return {
        ...task,
        assigneeName: assignee?.[0]?.name || '未分配'
      };
    }));

    res.json({ success: true, data: tasksWithAssignee || [] });
  } catch (err) {
    logger.error('Get tasks error:', err);
    res.status(500).json({ success: false, error: 'Failed to get tasks' });
  }
}

// 更新任务状态
async function updateTask(req, res) {
  try {
    const jwt = requireAuth(req);
    const { teamId, taskId } = req.params;
    const { status } = req.body;

    await sbUpdate('team_tasks', { id: taskId, team_id: teamId }, {
      status: status,
      updated_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Update task error:', err);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
}

// ==================== 通知 ====================

// 获取用户通知
async function getNotifications(req, res) {
  try {
    const jwt = requireAuth(req);

    const notifications = await sbSafeQuery('notifications', {
      select: '*',
      eq: { user_id: jwt.userId },
      order: 'created_at.desc',
      limit: 20
    });

    const unreadCount = (notifications || []).filter(n => !n.read).length;

    res.json({
      success: true,
      data: {
        notifications: notifications || [],
        unreadCount
      }
    });
  } catch (err) {
    logger.error('Get notifications error:', err);
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
}

// 标记通知已读
async function markNotificationRead(req, res) {
  try {
    const jwt = requireAuth(req);
    const { notificationId } = req.params;

    await sbUpdate('notifications', { id: notificationId, user_id: jwt.userId }, {
      read: true
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Mark notification error:', err);
    res.status(500).json({ success: false, error: 'Failed to mark notification' });
  }
}

// ==================== 共享话术 ====================

// 获取共享话术列表
async function getSharedScripts(req, res) {
  try {
    const jwt = requireAuth(req);
    const { teamId } = req.params;

    const scripts = await sbSafeQuery('shared_scripts', {
      select: '*',
      eq: { team_id: teamId },
      order: 'created_at.desc',
      limit: 50
    });

    // 获取作者信息
    const scriptsWithAuthor = await Promise.all((scripts || []).map(async (script) => {
      const author = await sbSafeQuery('users', { select: 'name', eq: { id: script.author_id }, limit: 1 });
      return {
        ...script,
        authorName: author?.[0]?.name || '匿名'
      };
    }));

    res.json({ success: true, data: scriptsWithAuthor || [] });
  } catch (err) {
    logger.error('Get shared scripts error:', err);
    res.status(500).json({ success: false, error: 'Failed to get scripts' });
  }
}

// 分享话术
async function shareScript(req, res) {
  try {
    const jwt = requireAuth(req);
    const { teamId } = req.params;
    const { title, content, industry } = req.body;

    const script = await sbInsert('shared_scripts', {
      id: crypto.randomUUID(),
      team_id: teamId,
      author_id: jwt.userId,
      title: title || '未命名',
      content: content || '',
      industry: industry || '',
      likes: 0,
      approved: false,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, data: { id: script.id } });
  } catch (err) {
    logger.error('Share script error:', err);
    res.status(500).json({ success: false, error: 'Failed to share script' });
  }
}

// 点赞话术
async function likeScript(req, res) {
  try {
    const jwt = requireAuth(req);
    const { teamId, scriptId } = req.params;

    const script = await sbSafeQuery('shared_scripts', { select: 'likes', eq: { id: scriptId }, limit: 1 });
    if (script?.[0]) {
      await sbUpdate('shared_scripts', { id: scriptId }, {
        likes: (script[0].likes || 0) + 1
      });
    }

    res.json({ success: true, data: { likes: (script?.[0]?.likes || 0) + 1 } });
  } catch (err) {
    logger.error('Like script error:', err);
    res.status(500).json({ success: false, error: 'Failed to like script' });
  }
}

// 审批话术
async function approveScript(req, res) {
  try {
    const jwt = requireAuth(req);
    const { teamId, scriptId } = req.params;
    const { approved } = req.body;

    // 验证是否是团队创建者
    const team = await sbSafeQuery('teams', { select: '*', eq: { id: teamId }, limit: 1 });
    if (!team?.[0] || team[0].owner_id !== jwt.userId) {
      return res.status(403).json({ success: false, error: 'Only team owner can approve scripts' });
    }

    await sbUpdate('shared_scripts', { id: scriptId }, {
      approved: approved !== false
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Approve script error:', err);
    res.status(500).json({ success: false, error: 'Failed to approve script' });
  }
}

// 默认导出函数（Vercel Serverless Function 要求）
module.exports = async (req, res) => {
  // 这个文件是被 index.js require 的，不是独立运行
  // 如果被直接调用，返回 404
  res.status(404).json({ error: 'This module should be accessed via /api/teams' });
};

// 命名导出（供 index.js 使用）
module.exports.getTeamMembers = getTeamMembers;
module.exports.createTeamMember = createTeamMember;
module.exports.removeTeamMember = removeTeamMember;
module.exports.getTeamStats = getTeamStats;
module.exports.createTask = createTask;
module.exports.getTasks = getTasks;
module.exports.updateTask = updateTask;
module.exports.getNotifications = getNotifications;
module.exports.markNotificationRead = markNotificationRead;
module.exports.getSharedScripts = getSharedScripts;
module.exports.shareScript = shareScript;
module.exports.likeScript = likeScript;
module.exports.approveScript = approveScript;
