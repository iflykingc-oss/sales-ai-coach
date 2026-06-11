import { describe, it, expect } from 'vitest';

describe('Sales Champion Path', () => {
  const TRAINING_PATH = [
    {
      id: 'fundamentals',
      title: '基础功',
      lessons: [
        { id: 'opening', name: '开场白训练' },
        { id: 'discovery', name: '需求挖掘' },
        { id: 'presentation', name: '产品介绍' },
      ],
    },
    {
      id: 'advanced',
      title: '进阶技能',
      lessons: [
        { id: 'objection', name: '异议处理' },
        { id: 'negotiation', name: '价格谈判' },
        { id: 'closing', name: '促单技巧' },
      ],
    },
    {
      id: 'simulation',
      title: '实战模拟',
      lessons: [
        { id: 'full-cycle', name: '新客户开发全流程' },
        { id: 'renewal', name: '老客户续约谈判' },
        { id: 'enterprise', name: '大客户攻坚' },
      ],
    },
    {
      id: 'challenge',
      title: '挑战模式',
      lessons: [
        { id: 'hell', name: '地狱难度：超难客户' },
        { id: 'complaint', name: '危机处理：投诉应对' },
      ],
    },
  ];

  it('should have 4 training modules', () => {
    expect(TRAINING_PATH.length).toBe(4);
  });

  it('should have correct module structure', () => {
    TRAINING_PATH.forEach(module => {
      expect(module).toHaveProperty('id');
      expect(module).toHaveProperty('title');
      expect(module).toHaveProperty('lessons');
      expect(Array.isArray(module.lessons)).toBe(true);
    });
  });

  it('should have 11 total lessons', () => {
    const totalLessons = TRAINING_PATH.reduce((sum, m) => sum + m.lessons.length, 0);
    expect(totalLessons).toBe(11);
  });

  it('should unlock modules based on progress', () => {
    const getModuleProgress = (moduleId: string, totalPractices: number) => {
      let currentIndex = 0;
      for (const module of TRAINING_PATH) {
        for (const lesson of module.lessons) {
          if (module.id === moduleId) {
            const completed = Math.min(Math.max(totalPractices - currentIndex, 0), module.lessons.length);
            return { completed, total: module.lessons.length };
          }
          currentIndex++;
        }
      }
      return { completed: 0, total: 0 };
    };

    const isModuleUnlocked = (moduleIndex: number, totalPractices: number) => {
      if (moduleIndex === 0) return true;
      const prevModule = TRAINING_PATH[moduleIndex - 1];
      const progress = getModuleProgress(prevModule.id, totalPractices);
      return progress.completed >= Math.ceil(progress.total * 0.6);
    };

    // First module always unlocked
    expect(isModuleUnlocked(0, 0)).toBe(true);

    // Second module unlocks after completing 2 practices (60% of 3 = 1.8, round up to 2)
    expect(isModuleUnlocked(1, 2)).toBe(true); // 2 practices completed in fundamentals
    expect(isModuleUnlocked(1, 1)).toBe(false); // Only 1 practice completed
  });

  it('should calculate user level based on practice count', () => {
    const USER_LEVELS = [
      { level: 0, name: '新手销售', minPractices: 0 },
      { level: 1, name: '见习销售', minPractices: 3 },
      { level: 2, name: '铜牌销售', minPractices: 10 },
      { level: 3, name: '银牌销售', minPractices: 25 },
      { level: 4, name: '金牌销售', minPractices: 50 },
      { level: 5, name: '销售冠军', minPractices: 100 },
    ];

    const getUserLevel = (totalPractices: number) => {
      for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
        if (totalPractices >= USER_LEVELS[i].minPractices) return USER_LEVELS[i];
      }
      return USER_LEVELS[0];
    };

    expect(getUserLevel(0).name).toBe('新手销售');
    expect(getUserLevel(5).name).toBe('见习销售');
    expect(getUserLevel(15).name).toBe('铜牌销售');
    expect(getUserLevel(30).name).toBe('银牌销售');
    expect(getUserLevel(60).name).toBe('金牌销售');
    expect(getUserLevel(100).name).toBe('销售冠军');
  });
});

describe('Quick Practice Flow', () => {
  const QUICK_SCENARIOS = {
    'cold-call': {
      id: 'cold-call',
      title: '冷启动电话',
      difficulty: 'medium',
    },
    'needs-analysis': {
      id: 'needs-analysis',
      title: '需求诊断',
      difficulty: 'medium',
    },
  };

  it('should have predefined quick scenarios', () => {
    expect(Object.keys(QUICK_SCENARIOS).length).toBeGreaterThan(0);
  });

  it('should find scenario by id', () => {
    const scenario = QUICK_SCENARIOS['cold-call'];
    expect(scenario).toBeDefined();
    expect(scenario.title).toBe('冷启动电话');
  });

  it('should return undefined for non-existent scenario', () => {
    const scenario = QUICK_SCENARIOS['non-existent'];
    expect(scenario).toBeUndefined();
  });
});

describe('Auto-Report', () => {
  it('should generate report with correct structure', () => {
    const report = {
      overall_score: 0.75,
      strengths: ['开场白自然', '需求探寻有针对性'],
      weaknesses: ['异议处理需加强', '促成时机把握不够'],
      radarScores: {
        开场白: 80,
        需求探寻: 75,
        价值传递: 70,
        异议处理: 60,
        促成能力: 55,
        倾听技巧: 65,
        情绪管理: 70,
        专业形象: 75,
      },
    };

    expect(report.overall_score).toBeGreaterThan(0);
    expect(report.overall_score).toBeLessThanOrEqual(1);
    expect(Array.isArray(report.strengths)).toBe(true);
    expect(Array.isArray(report.weaknesses)).toBe(true);
    expect(typeof report.radarScores).toBe('object');
  });

  it('should have 8 radar dimensions', () => {
    const radarScores = {
      开场白: 80,
      需求探寻: 75,
      价值传递: 70,
      异议处理: 60,
      促成能力: 55,
      倾听技巧: 65,
      情绪管理: 70,
      专业形象: 75,
    };

    expect(Object.keys(radarScores).length).toBe(8);
  });

  it('should categorize score correctly', () => {
    const getScoreCategory = (score: number) => {
      if (score >= 0.8) return '优秀';
      if (score >= 0.6) return '良好';
      return '需要加油';
    };

    expect(getScoreCategory(0.9)).toBe('优秀');
    expect(getScoreCategory(0.7)).toBe('良好');
    expect(getScoreCategory(0.5)).toBe('需要加油');
  });
});
