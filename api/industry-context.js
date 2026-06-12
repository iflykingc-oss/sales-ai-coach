// 行业内置算法 - 自动根据行业注入专业知识
// 不再需要用户手动安装插件，系统自动识别行业并应用对应知识

const INDUSTRY_CONTEXT = {
  // ====== 国内行业 ======
  '房地产': {
    keywords: ['房子', '房价', '楼盘', '户型', '学区', '地铁', '物业', '首付', '贷款', '购房', '置业'],
    role: '置业顾问',
    painPoints: ['价格敏感', '学区焦虑', '通勤距离', '升值空间', '物业质量'],
    valueProps: ['得房率', '学区资源', '交通便利', '升值潜力', '品牌物业'],
    objectionHandling: {
      '价格贵': '帮客户算实际得房率和长期成本，对比竞品隐藏费用',
      '要对比': '主动提供对比清单，突出差异化优势（学区/地铁/物业）',
      '犹豫不决': '制造稀缺感（楼层/户型有限），提供限时优惠',
    },
    closingTechniques: ['带看现场', '算账法', '稀缺法', '从众法'],
    sampleData: {
      discountRate: '85%',
      schoolDistrict: '省重点小学',
      subwayDistance: '步行5分钟',
      propertyBrand: '万科/保利/绿城',
    },
  },
  '保险': {
    keywords: ['保险', '保障', '理赔', '保费', '保额', '重疾', '医疗', '养老', '教育金'],
    role: '保险顾问',
    painPoints: ['担心买错', '觉得贵', '不信任', '拖延症', '已有社保'],
    valueProps: ['保障全面', '理赔快速', '品牌实力', '专业服务', '长期价值'],
    objectionHandling: {
      '太贵了': '拆解为每日成本，对比风险发生时的损失',
      '不需要': '用真实案例说明风险无处不在，社保缺口',
      '要考虑': '强调越早买越便宜，健康时才能买',
    },
    closingTechniques: ['需求分析法', '案例法', '对比法', '限时法'],
    sampleData: {
      dailyCost: '每天不到10元',
      coverage: '100万保额',
      claimSpeed: '3天快速理赔',
      brandStrength: '世界500强',
    },
  },
  '教育培训': {
    keywords: ['课程', '学习', '培训', '考试', '升学', '辅导', '老师', '教学', '成绩'],
    role: '课程顾问',
    painPoints: ['效果不确定', '价格敏感', '时间冲突', '孩子不配合', '已有辅导'],
    valueProps: ['名师授课', '小班教学', '提分保障', '个性辅导', '品牌口碑'],
    objectionHandling: {
      '太贵了': '拆解为课时费，对比提分效果和长期价值',
      '效果不好': '展示学员案例和提分数据，提供试听',
      '没时间': '提供灵活排课，线上线下结合',
    },
    closingTechniques: ['试听法', '案例法', '对比法', '限时优惠法'],
    sampleData: {
      teacherQuality: '985/211名师',
      classSize: '6人小班',
      scoreImprovement: '平均提分30+',
      successRate: '95%满意度',
    },
  },
  'SaaS软件': {
    keywords: ['软件', '系统', 'CRM', 'ERP', '数字化', '效率', '降本', '增效', '数据'],
    role: '客户成功经理',
    painPoints: ['怕用不起来', '数据迁移难', '培训成本高', '功能不匹配', '价格贵'],
    valueProps: ['提升效率', '降低成本', '数据驱动', '灵活定制', '专业服务'],
    objectionHandling: {
      '价格贵': '算ROI，展示效率提升和成本节省',
      '用不起来': '提供免费培训和专属客服',
      '功能不够': '展示定制能力和API集成',
    },
    closingTechniques: ['ROI算法', '试用法', '案例法', '对比法'],
    sampleData: {
      efficiencyGain: '效率提升300%',
      costSaving: '年节省50万',
      implementation: '7天快速上线',
      support: '7×24专属客服',
    },
  },
  '金融理财': {
    keywords: ['理财', '投资', '收益', '风险', '基金', '股票', '存款', '年化', '本金'],
    role: '理财顾问',
    painPoints: ['怕亏本', '不信任', '收益不确定', '流动性需求', '已有投资'],
    valueProps: ['稳健收益', '风险可控', '专业团队', '灵活赎回', '品牌实力'],
    objectionHandling: {
      '怕亏本': '展示历史业绩和风控措施',
      '收益低': '对比同类产品和通胀率',
      '不信任': '展示资质和监管信息',
    },
    closingTechniques: ['数据法', '对比法', '限时法', '组合法'],
    sampleData: {
      annualReturn: '年化6-8%',
      riskControl: '银行级风控',
      liquidity: 'T+1灵活赎回',
      brandStrength: '持牌机构',
    },
  },
  '医疗健康': {
    keywords: ['体检', '健康', '医疗', '检查', '诊断', '治疗', '专家', '设备'],
    role: '健康顾问',
    painPoints: ['怕查出问题', '价格贵', '排队久', '不信任', '已有体检'],
    valueProps: ['专家团队', '先进设备', '快速出报告', '隐私保护', '后续服务'],
    objectionHandling: {
      '价格贵': '拆解为单项检查费，对比三甲医院',
      '怕查出问题': '强调早发现早治疗的重要性',
      '没时间': '提供VIP快速通道和上门服务',
    },
    closingTechniques: ['健康法', '对比法', '限时法', '组合法'],
    sampleData: {
      expertTeam: '三甲医院专家',
      equipment: '进口高端设备',
      reportTime: '24小时出报告',
      privacy: '一对一隐私保护',
    },
  },
  '汽车销售': {
    keywords: ['汽车', '车', '驾驶', '油耗', '动力', '配置', '优惠', '贷款', '保养'],
    role: '销售顾问',
    painPoints: ['价格敏感', '怕买贵', '配置选择困难', '售后担心', '竞品对比'],
    valueProps: ['品牌口碑', '性价比高', '售后保障', '保值率高', '驾驶体验'],
    objectionHandling: {
      '太贵了': '算月供和日均成本，对比竞品配置',
      '要对比': '主动提供竞品对比表，突出优势',
      '犹豫不决': '限时优惠和现车稀缺',
    },
    closingTechniques: ['试驾法', '算账法', '限时法', '从众法'],
    sampleData: {
      monthlyPayment: '月供低至2000元',
      fuelEfficiency: '百公里油耗6L',
      warranty: '5年10万公里质保',
      resaleValue: '3年保值率70%',
    },
  },
  // ====== 海外行业 ======
  '跨境电商': {
    keywords: ['跨境', 'Amazon', 'Shopify', '独立站', '物流', '支付', '选品', '运营'],
    role: '跨境电商顾问',
    painPoints: ['物流复杂', '支付风险', '选品困难', '运营成本高', '合规风险'],
    valueProps: ['一站式服务', '本地化支持', '物流解决方案', '支付保障', '运营指导'],
    objectionHandling: {
      '太复杂': '提供一站式解决方案和全程指导',
      '风险高': '展示成功案例和风险控制措施',
      '成本高': '算ROI和长期价值',
    },
    closingTechniques: ['案例法', 'ROI法', '试用法', '对比法'],
    sampleData: {
      logistics: '7天全球达',
      payment: '多币种结算',
      successRate: '90%卖家盈利',
      support: '7×24多语言客服',
    },
  },
  '海外SaaS': {
    keywords: ['SaaS', 'software', 'platform', 'subscription', 'enterprise', 'cloud'],
    role: 'Customer Success Manager',
    painPoints: ['Integration complexity', 'Data migration', 'User adoption', 'Pricing concerns', 'Security worries'],
    valueProps: ['Seamless integration', 'Enterprise security', '24/7 support', 'Scalable solution', 'ROI driven'],
    objectionHandling: {
      'too expensive': 'Calculate ROI and time savings',
      'too complex': 'Show onboarding process and support',
      'security concerns': '展示合规认证和安全措施',
    },
    closingTechniques: ['ROI method', 'Trial method', 'Case study', 'Comparison'],
    sampleData: {
      integration: '500+ integrations',
      security: 'SOC2/ISO27001 certified',
      support: '24/7 dedicated support',
      roi: '300% ROI in 6 months',
    },
  },
};

/**
 * 根据用户输入自动识别行业
 */
function detectIndustry(input, userIndustry) {
  // 优先使用用户指定的行业
  if (userIndustry && INDUSTRY_CONTEXT[userIndustry]) {
    return userIndustry;
  }

  // 从输入中自动识别
  const text = (input || '').toLowerCase();
  for (const [industry, context] of Object.entries(INDUSTRY_CONTEXT)) {
    const matchCount = context.keywords.filter(kw => text.includes(kw)).length;
    if (matchCount >= 2) {
      return industry;
    }
  }

  // 默认返回通用
  return '通用';
}

/**
 * 获取行业的上下文信息
 */
function getIndustryContext(industry) {
  return INDUSTRY_CONTEXT[industry] || null;
}

/**
 * 生成行业特定的 prompt 补充
 */
function generateIndustryPrompt(industry, scenario) {
  const context = INDUSTRY_CONTEXT[industry];
  if (!context) return '';

  return `
【行业自动识别】
检测到行业：${industry}
销售角色：${context.role}

【行业核心痛点】
${context.painPoints.map(p => `- ${p}`).join('\n')}

【行业价值主张】
${context.valueProps.map(v => `- ${v}`).join('\n')}

【行业异议处理参考】
${Object.entries(context.objectionHandling).map(([obj, method]) => `- 客户说"${obj}"：${method}`).join('\n')}

【行业参考数据】（请在话术中使用这些具体数据）
${Object.entries(context.sampleData).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

【行业成交技巧】
${context.closingTechniques.map(t => `- ${t}`).join('\n')}
`;
}

module.exports = {
  INDUSTRY_CONTEXT,
  detectIndustry,
  getIndustryContext,
  generateIndustryPrompt,
};
