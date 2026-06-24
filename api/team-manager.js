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
const { sbSafeQuery, sbInsert, sbUpdate, sbDelete } = require('./index.js');

// ==================== 团队成员管理 ====================

// 获取团队成员列表
async function getTeamMembers(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
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
    console.error('Get team members error:', err);
    res.status(500).json({ success: false, error: 'Failed to get members' });
  }
}

// 团队创建者直接创建成员账号
async function createTeamMember(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
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
    console.error('Create team member error:', err);
    res.status(500).json({ success: false, error: 'Failed to create member' });
  }
}

// 移除团队成员
async function removeTeamMember(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
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
    console.error('Remove team member error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove member' });
  }
}

// ==================== 团队统计 ====================

// 获取团队真实统计数据
async function getTeamStats(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
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
    console.error('Get team stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
}

// ==================== 任务管理 ====================

// 创建任务
async function createTask(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
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
    console.error('Create task error:', err);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
}

// 获取任务列表
async function getTasks(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
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
    console.error('Get tasks error:', err);
    res.status(500).json({ success: false, error: 'Failed to get tasks' });
  }
}

// 更新任务状态
async function updateTask(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
    const { teamId, taskId } = req.params;
    const { status } = req.body;

    await sbUpdate('team_tasks', { id: taskId, team_id: teamId }, {
      status: status,
      updated_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
}

// ==================== 通知 ====================

// 获取用户通知
async function getNotifications(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);

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
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
}

// 标记通知已读
async function markNotificationRead(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
    const { notificationId } = req.params;

    await sbUpdate('notifications', { id: notificationId, user_id: jwt.userId }, {
      read: true
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Mark notification error:', err);
    res.status(500).json({ success: false, error: 'Failed to mark notification' });
  }
}

// ==================== 共享话术 ====================

// 获取共享话术列表
async function getSharedScripts(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
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
    console.error('Get shared scripts error:', err);
    res.status(500).json({ success: false, error: 'Failed to get scripts' });
  }
}

// 分享话术
async function shareScript(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
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
    console.error('Share script error:', err);
    res.status(500).json({ success: false, error: 'Failed to share script' });
  }
}

// 点赞话术
async function likeScript(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
    const { teamId, scriptId } = req.params;

    const script = await sbSafeQuery('shared_scripts', { select: 'likes', eq: { id: scriptId }, limit: 1 });
    if (script?.[0]) {
      await sbUpdate('shared_scripts', { id: scriptId }, {
        likes: (script[0].likes || 0) + 1
      });
    }

    res.json({ success: true, data: { likes: (script?.[0]?.likes || 0) + 1 } });
  } catch (err) {
    console.error('Like script error:', err);
    res.status(500).json({ success: false, error: 'Failed to like script' });
  }
}

// 审批话术
async function approveScript(req, res) {
  try {
    const jwt = require('./index.js').requireAuth(req);
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
    console.error('Approve script error:', err);
    res.status(500).json({ success: false, error: 'Failed to approve script' });
  }
}

module.exports = {
  getTeamMembers,
  createTeamMember,
  removeTeamMember,
  getTeamStats,
  createTask,
  getTasks,
  updateTask,
  getNotifications,
  markNotificationRead,
  getSharedScripts,
  shareScript,
  likeScript,
  approveScript
};
