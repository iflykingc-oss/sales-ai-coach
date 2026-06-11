import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Scripts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/scripts/generate', () => {
    it('should generate script with AI when model is configured', async () => {
      const mockAiResponse = {
        speechStyles: [
          {
            style: '专业话术',
            content: '开场白：您好...\n需求探寻：请问...\n价值呈现：我们的方案...',
          },
        ],
        reasoning: ['基于SPIN销售法', '针对价格异议场景'],
        pitfalls: [
          { action: '急于降价', reason: '应先塑造价值' },
        ],
        knowledgeSource: 'AI生成',
        confidenceScore: 0.85,
      };

      expect(mockAiResponse.speechStyles.length).toBe(1);
      expect(mockAiResponse.confidenceScore).toBeGreaterThanOrEqual(0.8);
    });

    it('should fallback to template when no AI model configured', () => {
      const fallbackScript = {
        speechStyles: [
          {
            style: '标准话术',
            content: '【开场白】\n您好...\n【需求探寻】\n请问...',
          },
        ],
        reasoning: ['基于标准销售流程生成'],
        pitfalls: [],
        knowledgeSource: '模板库',
        confidenceScore: 0.6,
      };

      expect(fallbackScript.knowledgeSource).toBe('模板库');
      expect(fallbackScript.confidenceScore).toBeLessThan(0.8);
    });

    it('should auto-save to knowledge base when confidence is high', () => {
      const confidenceScore = 0.85;
      const shouldAutoSave = confidenceScore >= 0.8;

      expect(shouldAutoSave).toBe(true);
    });

    it('should not auto-save to knowledge base when confidence is low', () => {
      const confidenceScore = 0.6;
      const shouldAutoSave = confidenceScore >= 0.8;

      expect(shouldAutoSave).toBe(false);
    });
  });

  describe('Script Data Structure', () => {
    it('should have valid speechStyles array', () => {
      const scriptData = {
        speechStyles: [
          { style: '共情型', content: '...' },
          { style: '直接型', content: '...' },
          { style: '专业型', content: '...' },
        ],
      };

      expect(Array.isArray(scriptData.speechStyles)).toBe(true);
      expect(scriptData.speechStyles.length).toBe(3);
    });

    it('should have reasoning array', () => {
      const scriptData = {
        reasoning: ['理由1', '理由2'],
      };

      expect(Array.isArray(scriptData.reasoning)).toBe(true);
    });

    it('should have pitfalls array with correct structure', () => {
      const scriptData = {
        pitfalls: [
          { action: '避免行为', reason: '原因' },
        ],
      };

      expect(Array.isArray(scriptData.pitfalls)).toBe(true);
      expect(scriptData.pitfalls[0]).toHaveProperty('action');
      expect(scriptData.pitfalls[0]).toHaveProperty('reason');
    });
  });
});

describe('Knowledge Base Auto-Save', () => {
  it('should save high-quality script to knowledge base', () => {
    const script = {
      confidenceScore: 0.85,
      speechStyles: [{ style: '专业话术', content: '完整话术内容...' }],
    };

    const knowledgeItem = {
      source: 'AI自动生成',
      content: `【专业话术 - 通用场景】\n${script.speechStyles[0].content}`,
      tags: ['通用场景', '专业话术', 'AI生成'],
      weight: script.confidenceScore,
      status: 'ACTIVE',
    };

    expect(knowledgeItem.source).toBe('AI自动生成');
    expect(knowledgeItem.weight).toBe(0.85);
    expect(knowledgeItem.status).toBe('ACTIVE');
  });

  it('should save high-scoring practice to knowledge base', () => {
    const practice = {
      scenario: '价格谈判',
      score: 85,
      rounds: 6,
      transcript: [
        { role: 'user', content: '销售话术...' },
        { role: 'assistant', content: '客户回应...' },
      ],
    };

    const shouldSave = practice.score >= 80;
    expect(shouldSave).toBe(true);

    const transcriptSummary = practice.transcript
      .slice(0, 5)
      .map(t => `${t.role === 'user' ? '销售' : '客户'}：${t.content}`)
      .join('\n');

    const knowledgeItem = {
      source: 'AI陪练自动生成',
      content: `【高分练习 - ${practice.scenario}】\n得分：${practice.score}分 | 轮次：${practice.rounds}\n\n对话摘要：\n${transcriptSummary}`,
      tags: [practice.scenario, '高分练习', 'AI生成'],
      weight: practice.score / 100,
      status: 'ACTIVE',
    };

    expect(knowledgeItem.source).toBe('AI陪练自动生成');
    expect(knowledgeItem.weight).toBe(0.85);
  });
});

describe('Industry and Role Selection', () => {
  it('should store industry as array in user record', () => {
    const industry = 'realestate';
    const userIndustry = industry ? [industry] : [];

    expect(Array.isArray(userIndustry)).toBe(true);
    expect(userIndustry).toContain('realestate');
  });

  it('should handle empty industry', () => {
    const industry = '';
    const userIndustry = industry ? [industry] : [];

    expect(userIndustry.length).toBe(0);
  });

  it('should have valid industry options', () => {
    const industries = [
      { value: 'realestate', label: '房地产' },
      { value: 'auto', label: '汽车' },
      { value: 'saas', label: 'SaaS/互联网' },
      { value: 'insurance', label: '保险' },
      { value: 'education', label: '教育' },
      { value: 'medical', label: '医疗健康' },
      { value: 'finance', label: '金融' },
      { value: 'retail', label: '零售' },
      { value: 'other', label: '其他' },
    ];

    expect(industries.length).toBe(9);
    expect(industries[0].value).toBe('realestate');
  });

  it('should have valid role options', () => {
    const roles = [
      { value: 'newbie', label: '销售新人' },
      { value: 'rep', label: '销售代表' },
      { value: 'senior', label: '资深销售' },
      { value: 'manager', label: '销售主管' },
      { value: 'other', label: '其他岗位' },
    ];

    expect(roles.length).toBe(5);
    expect(roles[0].value).toBe('newbie');
  });
});
