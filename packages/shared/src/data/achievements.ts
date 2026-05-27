export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'practice' | 'skill' | 'streak' | 'social' | 'milestone';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: {
    type: 'count' | 'score' | 'streak' | 'special';
    metric: string;
    threshold: number;
  };
  xp: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Practice achievements
  {
    id: 'first_practice',
    name: '初次登台',
    description: '完成第一次练习',
    icon: '\u{1F3AD}',
    category: 'practice',
    tier: 'bronze',
    requirement: { type: 'count', metric: 'practice_sessions', threshold: 1 },
    xp: 50,
  },
  {
    id: 'practice_10',
    name: '勤学苦练',
    description: '完成10次练习',
    icon: '\u{1F4DA}',
    category: 'practice',
    tier: 'silver',
    requirement: { type: 'count', metric: 'practice_sessions', threshold: 10 },
    xp: 200,
  },
  {
    id: 'practice_50',
    name: '百炼成钢',
    description: '完成50次练习',
    icon: '\u{2694}\u{FE0F}',
    category: 'practice',
    tier: 'gold',
    requirement: { type: 'count', metric: 'practice_sessions', threshold: 50 },
    xp: 500,
  },
  {
    id: 'practice_100',
    name: '销冠之路',
    description: '完成100次练习',
    icon: '\u{1F451}',
    category: 'practice',
    tier: 'platinum',
    requirement: { type: 'count', metric: 'practice_sessions', threshold: 100 },
    xp: 1000,
  },

  // Skill achievements
  {
    id: 'objection_master',
    name: '异议大师',
    description: '异议处理维度得分达到90分',
    icon: '\u{1F6E1}\u{FE0F}',
    category: 'skill',
    tier: 'gold',
    requirement: { type: 'score', metric: 'objection_handling', threshold: 90 },
    xp: 300,
  },
  {
    id: 'discovery_pro',
    name: '需求挖掘专家',
    description: '需求挖掘维度得分达到90分',
    icon: '\u{1F50D}',
    category: 'skill',
    tier: 'gold',
    requirement: { type: 'score', metric: 'need_discovery', threshold: 90 },
    xp: 300,
  },
  {
    id: 'closing_king',
    name: '促单王者',
    description: '促单能力维度得分达到90分',
    icon: '\u{1F3AF}',
    category: 'skill',
    tier: 'gold',
    requirement: { type: 'score', metric: 'closing_ability', threshold: 90 },
    xp: 300,
  },
  {
    id: 'empathy_expert',
    name: '共情达人',
    description: '情绪管理维度得分达到90分',
    icon: '\u{2764}\u{FE0F}',
    category: 'skill',
    tier: 'gold',
    requirement: { type: 'score', metric: 'emotion_management', threshold: 90 },
    xp: 300,
  },
  {
    id: 'trust_builder',
    name: '信任建筑师',
    description: '信任建立维度得分达到90分',
    icon: '\u{1F91D}',
    category: 'skill',
    tier: 'gold',
    requirement: { type: 'score', metric: 'trust_building', threshold: 90 },
    xp: 300,
  },
  {
    id: 'all_rounder',
    name: '全能选手',
    description: '所有8个维度得分均超过80分',
    icon: '\u{2B50}',
    category: 'skill',
    tier: 'platinum',
    requirement: { type: 'special', metric: 'all_dimensions_above_80', threshold: 1 },
    xp: 800,
  },

  // Streak achievements
  {
    id: 'streak_3',
    name: '三天打鱼',
    description: '连续练习3天',
    icon: '\u{1F525}',
    category: 'streak',
    tier: 'bronze',
    requirement: { type: 'streak', metric: 'practice_days', threshold: 3 },
    xp: 100,
  },
  {
    id: 'streak_7',
    name: '一周坚持',
    description: '连续练习7天',
    icon: '\u{1F4AA}',
    category: 'streak',
    tier: 'silver',
    requirement: { type: 'streak', metric: 'practice_days', threshold: 7 },
    xp: 250,
  },
  {
    id: 'streak_30',
    name: '月度冠军',
    description: '连续练习30天',
    icon: '\u{1F3C6}',
    category: 'streak',
    tier: 'gold',
    requirement: { type: 'streak', metric: 'practice_days', threshold: 30 },
    xp: 1000,
  },
  {
    id: 'streak_100',
    name: '百日修行',
    description: '连续练习100天',
    icon: '\u{1F48E}',
    category: 'streak',
    tier: 'platinum',
    requirement: { type: 'streak', metric: 'practice_days', threshold: 100 },
    xp: 3000,
  },

  // Milestone achievements
  {
    id: 'first_perfect',
    name: '满分答卷',
    description: '单次练习总分达到100分',
    icon: '\u{1F4AF}',
    category: 'milestone',
    tier: 'gold',
    requirement: { type: 'score', metric: 'total_score', threshold: 100 },
    xp: 500,
  },
  {
    id: 'improvement_20',
    name: '突飞猛进',
    description: '总分提升20分以上',
    icon: '\u{1F4C8}',
    category: 'milestone',
    tier: 'silver',
    requirement: { type: 'special', metric: 'score_improvement', threshold: 20 },
    xp: 300,
  },
  {
    id: 'expert_defeated',
    name: '征服地狱',
    description: '在地狱难度下完成一次练习',
    icon: '\u{1F608}',
    category: 'milestone',
    tier: 'gold',
    requirement: { type: 'special', metric: 'expert_difficulty_completed', threshold: 1 },
    xp: 400,
  },
];

// XP levels
export const XP_LEVELS = [
  { level: 1, name: '销售新手', xpRequired: 0, icon: '\u{1F331}' },
  { level: 2, name: '销售学徒', xpRequired: 200, icon: '\u{1F4D7}' },
  { level: 3, name: '销售专员', xpRequired: 500, icon: '\u{1F4D8}' },
  { level: 4, name: '销售高手', xpRequired: 1000, icon: '\u{1F4D9}' },
  { level: 5, name: '销售专家', xpRequired: 2000, icon: '\u{1F4D5}' },
  { level: 6, name: '销售大师', xpRequired: 4000, icon: '\u{1F3C6}' },
  { level: 7, name: '销冠', xpRequired: 8000, icon: '\u{1F451}' },
  { level: 8, name: '传奇销冠', xpRequired: 15000, icon: '\u{1F48E}' },
];

export function getLevelForXp(xp: number) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].xpRequired) return XP_LEVELS[i];
  }
  return XP_LEVELS[0];
}

export function getXpForNextLevel(currentXp: number) {
  const currentLevel = getLevelForXp(currentXp);
  const nextLevelIndex = XP_LEVELS.findIndex((l) => l.level === currentLevel.level + 1);
  if (nextLevelIndex === -1) return 0;
  return XP_LEVELS[nextLevelIndex].xpRequired - currentXp;
}
