/**
 * @file industry-context.js
 * @description 商业级行业上下文仓储中心。支持后台动态热更新注册、配置数据清洗与高性能正则矩阵预编译。
 * @version 2.0.0
 */

class IndustryRegistry {
  constructor() {
    // 内存常驻存储
    this.contexts = new Map();
    this.compiledMatrix = new Map();
  }

  /**
   * 动态注册或热更新行业规则
   */
  register(name, config) {
    if (!name || typeof name !== 'string' || !config) return false;

    // 生产级防空兜底：严格规范化结构
    const sanitizedConfig = {
      role: config.role || '专业顾问',
      keywords: Array.isArray(config.keywords) ? config.keywords.filter(Boolean) : [],
      colloquialPhrases: Array.isArray(config.colloquialPhrases) ? config.colloquialPhrases.filter(Boolean) : [],
      painPoints: Array.isArray(config.painPoints) ? config.painPoints.filter(Boolean) : [],
      valueProps: Array.isArray(config.valueProps) ? config.valueProps.filter(Boolean) : [],
      objectionHandling: config.objectionHandling && typeof config.objectionHandling === 'object' ? config.objectionHandling : {},
      closingTechniques: Array.isArray(config.closingTechniques) ? config.closingTechniques.filter(Boolean) : [],
      sampleData: config.sampleData && typeof config.sampleData === 'object' ? config.sampleData : {}
    };

    this.contexts.set(name, sanitizedConfig);
    this._compile(name, sanitizedConfig);
    return true;
  }

  /**
   * 动态注销行业
   */
  unregister(name) {
    this.contexts.delete(name);
    this.compiledMatrix.delete(name);
  }

  /**
   * 获取行业配置
   */
  getContext(name) {
    return this.contexts.get(name);
  }

  /**
   * 获取所有已注册行业
   */
  getRegisteredIndustries() {
    return Array.from(this.contexts.keys());
  }

  /**
   * 获取预编译后的正则矩阵
   */
  getCompiledMatrix() {
    return Array.from(this.compiledMatrix.values());
  }

  /**
   * L1 高性能正则匹配
   */
  matchL1Rule(input) {
    let bestMatchIndustry = '通用';
    let maxScore = 0;
    const matrix = this.getCompiledMatrix();

    for (const rule of matrix) {
      const matches = input.match(rule.regex);
      if (!matches) continue;

      let score = 0;
      let keywordMatchCount = 0;
      const uniqueMatches = new Set(matches.map(m => m.toLowerCase()));

      for (const token of uniqueMatches) {
        const meta = rule.wordWeights.get(token);
        if (meta) {
          score += meta.weight;
          if (meta.isKeyword) keywordMatchCount++;
        }
      }

      if (score > 0) {
        const densityBonus = keywordMatchCount / rule.keywordCount;
        score += densityBonus;

        if (score >= 2.0 && score > maxScore) {
          maxScore = score;
          bestMatchIndustry = rule.industry;
        }
      }
    }
    return bestMatchIndustry;
  }

  /**
   * 生成行业特定的 Prompt 补充
   */
  generateIndustryPrompt(industry, scenario) {
    const ctx = this.contexts.get(industry);
    if (!ctx) return '';

    return `
【行业自动识别】
检测到行业：${industry}
销售角色：${ctx.role || '专业顾问'}

【行业核心痛点】
${(ctx.painPoints || []).map(p => `- ${p}`).join('\n')}

【行业价值主张】
${(ctx.valueProps || []).map(v => `- ${v}`).join('\n')}

【行业异议处理参考】
${Object.entries(ctx.objectionHandling || {}).map(([obj, method]) => `- 客户说"${obj}"：${method}`).join('\n')}

【行业参考数据】（请在话术中使用这些具体数据）
${Object.entries(ctx.sampleData || {}).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

【行业成交技巧】
${(ctx.closingTechniques || []).map(t => `- ${t}`).join('\n')}
`;
  }

  /**
   * 内部编译机制
   * @private
   */
  _compile(name, config) {
    const wordWeights = new Map();

    // 核心词高权重
    (config.keywords || []).forEach(w => {
      wordWeights.set(w.toLowerCase(), { weight: 2.5, isKeyword: true });
    });

    // 口语词基础权重
    (config.colloquialPhrases || []).forEach(w => {
      const lowerW = w.toLowerCase();
      if (!wordWeights.has(lowerW)) {
        wordWeights.set(lowerW, { weight: 1.0, isKeyword: false });
      }
    });

    const allWords = Array.from(wordWeights.keys());

    if (allWords.length === 0) {
      this.compiledMatrix.delete(name);
      return;
    }

    allWords.sort((a, b) => b.length - a.length);

    const pattern = allWords
      .map(w => /^[a-zA-Z0-9_-]+$/.test(w) ? `\\b${w}\\b` : this._escapeRegExp(w))
      .join('|');

    this.compiledMatrix.set(name, {
      industry: name,
      regex: new RegExp(pattern, 'gi'),
      wordWeights,
      keywordCount: (config.keywords || []).length || 1
    });
  }

  /**
   * 转义正则特殊字符
   * @private
   */
  _escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// 实例化全局单例
const registry = new IndustryRegistry();

// 工业级内置种子数据
const COMMERCIAL_SEED_DATA = {
  '房地产': {
    role: '置业顾问',
    keywords: ['房子', '房价', '楼盘', '户型', '学区', '地铁', '物业', '首付', '贷款', '购房', '置业', '看房'],
    colloquialPhrases: ['月供', '公积金', '交房', '房贷', '首套', '二套', '不够钱', '凑钱', '离地铁', '几居室', '孩子上学', '学校划片', '降价', '跌了', '涨了', '单价', '总价', '定金', '认购'],
    painPoints: ['价格敏感', '学区焦虑', '通勤距离', '升值空间', '物业质量'],
    valueProps: ['得房率', '学区资源', '交通便利', '升值潜力', '品牌物业'],
    objectionHandling: {
      '价格贵': '帮客户算实际得房率和长期成本，对比竞品隐藏费用',
      '要对比': '主动提供对比清单，突出差异化优势（学区/地铁/物业）',
      '犹豫不决': '制造稀缺感（楼层/户型有限），提供限时优惠',
    },
    closingTechniques: ['带看现场', '算账法', '稀缺法', '从众法'],
    sampleData: { discountRate: '85%', schoolDistrict: '省重点小学', subwayDistance: '步行5分钟', propertyBrand: '万科/保利/绿城' },
  },
  '保险': {
    role: '保险顾问',
    keywords: ['保险', '保障', '理赔', '保费', '保额', '重疾', '医疗', '养老', '教育金', '寿险'],
    colloquialPhrases: ['生病', '住院', '看病', '老了以后', '出事', '意外', '小孩子', '生大病', '报销', '能赔', '没钱治', '社保', '医保', '白交钱', '没用', '被骗', '安全感', '存钱'],
    painPoints: ['担心买错', '觉得贵', '不信任', '拖延症', '已有社保'],
    valueProps: ['保障全面', '理赔快速', '品牌实力', '专业服务', '长期价值'],
    objectionHandling: {
      '太贵了': '拆解为每日成本，对比风险发生时的损失',
      '不需要': '用真实案例说明风险无处不在，社保缺口',
      '要考虑': '强调越早买越便宜，健康时才能买',
    },
    closingTechniques: ['需求分析法', '案例法', '对比法', '限时法'],
    sampleData: { dailyCost: '每天不到10元', coverage: '100万保额', claimSpeed: '3天快速理赔', brandStrength: '世界500强' },
  },
  '教育培训': {
    role: '课程顾问',
    keywords: ['课程', '学习', '培训', '考试', '升学', '辅导', '老师', '教学', '成绩', '补习'],
    colloquialPhrases: ['孩子', '家长', '提分', '补课', '一对一', '小班', '名师', '试听', '续费', '退费', '跟不上', '偏科', '高考', '中考', '英语', '数学'],
    painPoints: ['效果不确定', '价格敏感', '时间冲突', '孩子不配合', '已有辅导'],
    valueProps: ['名师授课', '小班教学', '提分保障', '个性辅导', '品牌口碑'],
    objectionHandling: {
      '太贵了': '拆解为课时费，对比提分效果和长期价值',
      '效果不好': '展示学员案例和提分数据，提供试听',
      '没时间': '提供灵活排课，线上线下结合',
    },
    closingTechniques: ['试听法', '案例法', '对比法', '限时优惠法'],
    sampleData: { teacherQuality: '985/211名师', classSize: '6人小班', scoreImprovement: '平均提分30+', successRate: '95%满意度' },
  },
  'SaaS软件': {
    role: '客户成功经理',
    keywords: ['软件', '系统', 'CRM', 'ERP', '数字化', '效率', '降本', '增效', '自动化', '信息化'],
    colloquialPhrases: ['打通', '对接', '数据导出', '功能', '账号', '后台', '权限', '流程', '表格', '手工', '效率低', '对账', '客户管理', '钉钉', '企业微信', '企微', '飞书', '功能定制', '系统崩溃', '数据丢了'],
    painPoints: ['怕用不起来', '数据迁移难', '培训成本高', '功能不匹配', '价格贵'],
    valueProps: ['提升效率', '降低成本', '数据驱动', '灵活定制', '专业服务'],
    objectionHandling: {
      '价格贵': '算ROI，展示效率提升和成本节省',
      '用不起来': '提供免费培训和专属客服',
      '功能不够': '展示定制能力和API集成',
    },
    closingTechniques: ['ROI算法', '试用法', '案例法', '对比法'],
    sampleData: { efficiencyGain: '效率提升300%', costSaving: '年节省50万', implementation: '7天快速上线', support: '7×24专属客服' },
  },
  '金融理财': {
    role: '理财顾问',
    keywords: ['理财', '投资', '收益', '风险', '基金', '股票', '存款', '年化', '本金', '回本'],
    colloquialPhrases: ['亏了', '赚了', '保本', '利息', '银行', '定期', '活期', '余额宝', '通货膨胀', '贬值', '存钱', '取钱', '到期', '赎回', '买入', '卖出'],
    painPoints: ['怕亏本', '不信任', '收益不确定', '流动性需求', '已有投资'],
    valueProps: ['稳健收益', '风险可控', '专业团队', '灵活赎回', '品牌实力'],
    objectionHandling: {
      '怕亏本': '展示历史业绩和风控措施',
      '收益低': '对比同类产品和通胀率',
      '不信任': '展示资质和监管信息',
    },
    closingTechniques: ['数据法', '对比法', '限时法', '组合法'],
    sampleData: { annualReturn: '年化6-8%', riskControl: '银行级风控', liquidity: 'T+1灵活赎回', brandStrength: '持牌机构' },
  },
  '医疗健康': {
    role: '健康顾问',
    keywords: ['体检', '健康', '医疗', '检查', '诊断', '治疗', '专家', '设备', '门诊', '住院'],
    colloquialPhrases: ['不舒服', '难受', '头疼', '胃疼', '挂号', '排队', '看医生', '拍片', '化验', '报告', '指标', '偏高', '偏低', '复查', '手术', '住院'],
    painPoints: ['怕查出问题', '价格贵', '排队久', '不信任', '已有体检'],
    valueProps: ['专家团队', '先进设备', '快速出报告', '隐私保护', '后续服务'],
    objectionHandling: {
      '价格贵': '拆解为单项检查费，对比三甲医院',
      '怕查出问题': '强调早发现早治疗的重要性',
      '没时间': '提供VIP快速通道和上门服务',
    },
    closingTechniques: ['健康法', '对比法', '限时法', '组合法'],
    sampleData: { expertTeam: '三甲医院专家', equipment: '进口高端设备', reportTime: '24小时出报告', privacy: '一对一隐私保护' },
  },
  '汽车销售': {
    role: '销售顾问',
    keywords: ['汽车', '车', '驾驶', '油耗', '动力', '配置', '优惠', '贷款', '保养', '4S店'],
    colloquialPhrases: ['试驾', '提车', '砍价', '落地价', '裸车', '保险', '上牌', '购置税', '分期', '全款', '置换', '旧车', '新车', '库存', '现车', '订车', '等车'],
    painPoints: ['价格敏感', '怕买贵', '配置选择困难', '售后担心', '竞品对比'],
    valueProps: ['品牌口碑', '性价比高', '售后保障', '保值率高', '驾驶体验'],
    objectionHandling: {
      '太贵了': '算月供和日均成本，对比竞品配置',
      '要对比': '主动提供竞品对比表，突出优势',
      '犹豫不决': '限时优惠和现车稀缺',
    },
    closingTechniques: ['试驾法', '算账法', '限时法', '从众法'],
    sampleData: { monthlyPayment: '月供低至2000元', fuelEfficiency: '百公里油耗6L', warranty: '5年10万公里质保', resaleValue: '3年保值率70%' },
  },
  '跨境电商': {
    role: '跨境电商顾问',
    keywords: ['跨境', 'Amazon', 'Shopify', '独立站', '物流', '支付', '选品', '运营', '出海'],
    colloquialPhrases: ['发货', '海外仓', 'FBA', '自发货', 'listing', '广告', 'ACOS', '转化率', '退货', '差评', '爆款', '铺货', '精品', '供应链', '头程', '尾程'],
    painPoints: ['物流复杂', '支付风险', '选品困难', '运营成本高', '合规风险'],
    valueProps: ['一站式服务', '本地化支持', '物流解决方案', '支付保障', '运营指导'],
    objectionHandling: {
      '太复杂': '提供一站式解决方案和全程指导',
      '风险高': '展示成功案例和风险控制措施',
      '成本高': '算ROI和长期价值',
    },
    closingTechniques: ['案例法', 'ROI法', '试用法', '对比法'],
    sampleData: { logistics: '7天全球达', payment: '多币种结算', successRate: '90%卖家盈利', support: '7×24多语言客服' },
  },
};

// 初始化装载内置种子数据
Object.entries(COMMERCIAL_SEED_DATA).forEach(([industryName, config]) => {
  registry.register(industryName, config);
});

module.exports = registry;
