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
【行业背景】
行业：${industry}
销售角色：${ctx.role || '专业顾问'}
核心痛点：${(ctx.painPoints || []).join('、')}
价值主张：${(ctx.valueProps || []).join('、')}

【行业异议深度分析】（必须在话术中使用这些策略）
${Object.entries(ctx.objectionHandling || {}).map(([obj, method]) => `
客户说"${obj}"：
- 应对策略：${method}
- 心理学根因：客户说这句话时，真实的心理状态是什么
- 禁忌：绝对不能说什么`).join('\n')}

【行业参考数据】（话术中必须使用这些具体数字，不能用占位符）
${Object.entries(ctx.sampleData || {}).map(([key, value]) => `${key}：${value}`).join('\n')}

【行业成交关键时刻】
${(ctx.closingTechniques || []).map(t => `- ${t}`).join('\n')}

【行业客户画像】
这个行业的典型客户特征、决策心理、信息获取渠道、信任建立方式。
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
      '价格贵': '算实际得房率（"这套得房率85%，隔壁楼盘只有72%，实际每平米反而便宜"），算长期成本（"月供虽然多500，但学区房每年升值8%，3年后等于白住"），用锚定效应（"同小区上个月成交价比这个高3万"）',
      '要对比': '主动提供对比清单（"我帮您列了个表，您看这几个维度"），突出差异化（"我们有地铁，他们没有，您每天通勤多花40分钟"）',
      '犹豫不决': '制造稀缺（"这个户型只剩2套了，上周已经被订走一套"），限时优惠（"这个价格月底截止，下个月涨2%"），损失厌恶（"您犹豫的这一个月，房价可能又涨了"）',
      '再看看': '不阻拦但留钩子（"没问题，您去看。但我建议您重点看XX和XX两个盘，看完您再回来，我帮您对比"）',
      '首付不够': '提供解决方案（"首付可以分期，先交30%，剩余3个月内补齐"），算杠杆（"现在利率是历史低位，月供其实比租房还便宜"）',
      '怕跌': '用数据反驳（"这个板块过去5年均价涨了60%，即使2022年最差的时候也只回调了5%"），用租售比（"就算不涨，租金回报率也有3.5%，比存银行强"）',
    },
    closingTechniques: ['带看现场', '算账法', '稀缺法', '从众法', '学区焦虑法', '投资回报法'],
    sampleData: { discountRate: '85%得房率', schoolDistrict: '省重点小学划片', subwayDistance: '步行5分钟到地铁', propertyBrand: '万科/保利/绿城', priceHistory: '过去5年均价涨60%', rentalYield: '租金回报率3.5%' },
  },
  '保险': {
    role: '保险顾问',
    keywords: ['保险', '保障', '理赔', '保费', '保额', '重疾', '医疗', '养老', '教育金', '寿险'],
    colloquialPhrases: ['生病', '住院', '看病', '老了以后', '出事', '意外', '小孩子', '生大病', '报销', '能赔', '没钱治', '社保', '医保', '白交钱', '没用', '被骗', '安全感', '存钱'],
    painPoints: ['担心买错', '觉得贵', '不信任', '拖延症', '已有社保'],
    valueProps: ['保障全面', '理赔快速', '品牌实力', '专业服务', '长期价值'],
    objectionHandling: {
      '太贵了': '拆解为每日成本（"每天不到10元"），对比风险发生时的损失（"一次住院平均花费8万，社保只能报4万"），用损失厌恶框架',
      '不需要': '用真实案例说明风险无处不在（"上个月一个客户也这么说，结果体检查出了..."），社保缺口数据（"社保报销上限是XX，重大疾病平均花费XX"）',
      '要考虑': '强调越早买越便宜（"同样保额，30岁买比40岁便宜40%"），健康时才能买（"一旦体检有问题，可能被拒保"）',
      '我老公/老婆不同意': '邀请夫妻一起沟通（"要不我们约个时间，我给您和您先生一起讲讲？"），先搞定决策者',
      '之前被保险骗过': '共情+差异化（"我理解您的顾虑，之前那个产品确实有问题。但我们不一样，我给您看看理赔数据..."）',
      '我身体很好不需要': '用概率数据（"30岁得重疾的概率是XX%"），用案例（"上个月一个健身教练也这么说，结果..."）',
    },
    closingTechniques: ['需求分析法', '案例法', '对比法', '限时法', '家庭责任法', '恐惧唤醒法'],
    sampleData: { dailyCost: '每天不到10元', coverage: '100万保额', claimSpeed: '3天快速理赔', brandStrength: '世界500强', socialSecurityGap: '社保报销上限50万，重大疾病平均花费80万', ageDiscount: '30岁比40岁便宜40%' },
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
      '价格贵': '拆解人均成本（"每人每天X元"），对比效率提升ROI（"每周省X小时×时薪=每月省XX元"），用TCO对比（"自建成本是我们的3倍"）',
      '用不起来': '免费试用（"14天免费，不满意不收费"），成功案例（"XX公司和您一样，2周后使用率95%"），培训保障（"1对1培训+视频教程+7×24客服"）',
      '功能不够': '定制能力（"支持API对接和自定义字段"），路线图（"这个功能Q3上线"），替代方案（"XX功能可以实现同样效果"）',
      '要和领导商量': '帮建内部案（"我帮您准备ROI报告给领导看"），安排演示（"要不我给领导也演示一次？"）',
      '数据安全': '安全认证（"ISO27001/SOC2认证"），数据主权（"数据在阿里云，您随时可导出"）',
      '已有系统': '迁移方案（"3天完成迁移，零数据丢失"），痛点对比（"您现在的系统在XX方面有限"），切换保障（"前3个月免费，不满意随时退"）',
    },
    closingTechniques: ['ROI算法', '试用法', '案例法', '对比法', '风险逆转法'],
    sampleData: { efficiencyGain: '效率提升300%', costSaving: '年节省50万', implementation: '7天快速上线', support: '7×24专属客服', roi: '3个月回本', security: 'ISO27001认证', trial: '14天免费试用' },
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
  '医疗器械': {
    role: '医疗器械顾问',
    keywords: ['医疗', '器械', '设备', '医院', '临床', '诊断', '治疗', '手术', '耗材', '检验'],
    colloquialPhrases: ['科室需要', '采购计划', '招标', '临床效果', '售后维护', '培训', '资质', '注册证'],
    painPoints: ['设备故障率高影响临床', '采购流程长审批难', '售后响应慢', '培训不到位', '合规风险'],
    valueProps: ['临床验证数据', '全生命周期服务', '合规无忧', '培训体系完善'],
    objectionHandling: {
      '价格贵': '临床效果和长期运维成本对比，总体拥有成本更低',
      '已有供应商': '提供试用对比，用数据说话',
      '审批难': '提供完整的资质文件和临床报告，协助走审批流程',
    },
    closingTechniques: ['临床数据法', '试用对比法', '合规保障法', 'TCO法'],
    sampleData: { accuracy: '99.5%准确率', responseTime: '4小时售后响应', compliance: 'CFDA/FDA双认证', training: '免费上门培训' },
  },
  '法律服务': {
    role: '法律顾问',
    keywords: ['法律', '律师', '诉讼', '合同', '知识产权', '合规', '仲裁', '纠纷', '劳动法', '公司法'],
    colloquialPhrases: ['打官司', '签合同', '告他', '被起诉', '维权', '法律风险', '法律顾问', '法律咨询'],
    painPoints: ['法律风险防控不足', '诉讼成本高周期长', '合同漏洞多', '知识产权被侵权', '劳动纠纷频发'],
    valueProps: ['风险前置防控', '诉讼胜率高', '合同模板标准化', '知识产权全链条保护'],
    objectionHandling: {
      '太贵了': '一次诉讼的费用可能远超一年的法律顾问费，预防远比补救便宜',
      '不需要': '企业经营中法律风险无处不在，等到出事再找律师成本翻倍',
      '自己能处理': '专业的事交给专业的人，自己处理容易遗漏关键细节',
    },
    closingTechniques: ['风险警示法', '案例对比法', '免费咨询法', '年度包干法'],
    sampleData: { winRate: '92%诉讼胜率', responseTime: '24小时响应', clients: '服务500+企业', coverage: '全领域覆盖' },
  },
  '物流供应链': {
    role: '物流解决方案顾问',
    keywords: ['物流', '仓储', '供应链', '运输', '配送', '快递', '冷链', '跨境', '库存', '周转'],
    colloquialPhrases: ['发货', '到货', '运费', '仓库', '库存', '周转率', '时效', '破损率'],
    painPoints: ['物流成本高', '时效不稳定', '破损率高', '库存周转慢', '信息不透明'],
    valueProps: ['降本增效', '全程可视化', '智能调度', '仓配一体化'],
    objectionHandling: {
      '价格高': '综合计算仓储+运输+损耗的总成本，我们的方案反而更便宜',
      '时效不保证': 'SLA承诺+赔付机制，超时全额退款',
      '怕丢件': '全程GPS追踪+全额保险，丢件必赔',
    },
    closingTechniques: ['成本核算法', '试运营法', 'SLA承诺法', '标杆客户法'],
    sampleData: { onTimeRate: '99.2%准时率', damageRate: '0.01%破损率', coverage: '全国2000+网点', savings: '平均降本15%' },
  },
  '快消品': {
    role: '快消品销售顾问',
    keywords: ['快消', '食品', '饮料', '日化', '零食', '乳制品', '调味品', '包装', '铺货', '动销'],
    colloquialPhrases: ['铺货', '动销', '促销', '临期', '退货', '陈列', '进店费', '返点'],
    painPoints: ['动销慢库存积压', '竞品促销压力大', '渠道费用高', '临期损耗', '品牌知名度低'],
    valueProps: ['高频复购', '品牌拉力强', '利润空间大', '动销支持多'],
    objectionHandling: {
      '卖不动': '提供动销方案+促销支持+临期换货保障',
      '利润低': '高毛利产品组合+季度返点+陈列奖励',
      '品牌不知名': '线上种草+线下活动+KOL合作全方位品牌支持',
    },
    closingTechniques: ['试销法', '组合套餐法', '返点激励法', '竞品对比法'],
    sampleData: { repurchaseRate: '68%复购率', grossMargin: '35%毛利率', promotion: '月度促销支持', coverage: '10万+终端网点' },
  },
  '3C数码': {
    role: '数码产品顾问',
    keywords: ['手机', '电脑', '平板', '耳机', '充电', '数码', '电子', '智能', '配件', '外设'],
    colloquialPhrases: ['性价比', '配置', '跑分', '续航', '拍照', '屏幕', '处理器', '内存'],
    painPoints: ['产品同质化严重', '价格战激烈', '售后体验差', '新品迭代快', '库存压力大'],
    valueProps: ['差异化卖点', '高性价比', '优质售后', '品牌口碑'],
    objectionHandling: {
      '太贵了': '同配置对比，我们的价格已经是行业最低，而且售后更好',
      '不如XX品牌': '具体参数对比，我们在核心指标上领先，而且价格更优',
      '等新款': '现在买享受最大优惠，新款上市价格会更高',
    },
    closingTechniques: ['参数对比法', '体验试用法', '限时优惠法', '配件赠送法'],
    sampleData: { satisfaction: '98%好评率', warranty: '2年质保', price: '同配置最低价', delivery: '次日达' },
  },
  '咨询服务': {
    role: '咨询顾问',
    keywords: ['咨询', '战略', '管理', '数字化', '转型', '组织', '流程', '优化', '变革', '方案'],
    colloquialPhrases: ['落地', '效果', 'ROI', '实施方案', '项目周期', '团队配置', '交付', '验收'],
    painPoints: ['方案落不了地', '咨询费贵效果难衡量', '内部推不动变革', '数字化转型迷茫', '组织效率低'],
    valueProps: ['陪跑式落地', '效果可量化', '行业最佳实践', '方法论成熟'],
    objectionHandling: {
      '太贵了': '一次失败的变革成本远超咨询费，我们帮您避免试错成本',
      '落不了地': '我们是陪跑式服务，从方案到执行全程参与，确保落地',
      '之前失败过': '我们会复盘之前的失败原因，针对性设计新的方案',
    },
    closingTechniques: ['诊断报告法', '标杆参观法', '分阶段法', '效果对赌法'],
    sampleData: { successRate: '85%项目成功率', roi: '平均3倍ROI', cases: '200+成功案例', team: '50+资深顾问' },
  },
  '教育培训': {
    role: '课程顾问',
    keywords: ['培训', '课程', '学习', '教育', '考证', '技能', '提升', '辅导', '班课', '一对一'],
    colloquialPhrases: ['报名', '学费', '课时', '效果', '退费', '试听', '师资', '通过率'],
    painPoints: ['学习效果难保证', '学费贵', '时间不灵活', '找不到好老师', '通过率低'],
    valueProps: ['名师授课', '通过率高', '灵活排课', '不过退费'],
    objectionHandling: {
      '太贵了': '算单课时价格，我们比同行便宜，而且效果有保障',
      '没时间': '线上线下结合，随时随地学习，碎片化时间也能用',
      '怕没效果': '免费试听+不过退费，零风险体验',
    },
    closingTechniques: ['试听法', '通过率法', '限时优惠法', '组团报名法'],
    sampleData: { passRate: '92%通过率', teachers: '100+名师', students: '10万+学员', satisfaction: '96%满意度' },
  },
  '人力资源': {
    role: '人力资源顾问',
    keywords: ['招聘', 'HR', '人力', '猎头', '薪酬', '绩效', '培训', '员工', '社保', '公积金'],
    colloquialPhrases: ['招人', '留人', '裁员', '绩效考核', '薪资', '五险一金', '劳动合同', '离职'],
    painPoints: ['招人难留人更难', '人力成本高', '劳动纠纷风险', '绩效体系不科学', '社保合规压力'],
    valueProps: ['降本增效', '合规无忧', '人才精准匹配', '数据驱动决策'],
    objectionHandling: {
      '太贵了': '一次劳动仲裁的赔偿可能远超一年的人力资源服务费',
      '自己能招': '专业猎头的渠道和资源是企业自己无法触及的',
      '效果不好': '按结果付费，招到合适的人才收服务费',
    },
    closingTechniques: ['风险警示法', '按结果付费法', '免费诊断法', '标杆案例法'],
    sampleData: { fillRate: '95%岗位填充率', timeToHire: '平均15天到岗', retention: '1年留存率90%', compliance: '0劳动纠纷' },
  },
};

// 初始化装载内置种子数据
Object.entries(COMMERCIAL_SEED_DATA).forEach(([industryName, config]) => {
  registry.register(industryName, config);
});

module.exports = registry;
