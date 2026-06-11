export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">隐私政策</h1>
      <p className="text-sm text-gray-500 mb-8">最后更新日期：2026年6月11日</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. 信息收集</h2>
          <p className="text-gray-700 leading-relaxed">
            我们收集以下信息以提供和改进我们的服务：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li><strong>账户信息：</strong>姓名、邮箱地址、行业、岗位</li>
            <li><strong>练习数据：</strong>对话记录、话术生成内容、练习成绩</li>
            <li><strong>使用数据：</strong>登录时间、功能使用频率、设备信息</li>
            <li><strong>支付信息：</strong>通过PayPal处理，我们不存储您的支付卡信息</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. 信息使用</h2>
          <p className="text-gray-700 leading-relaxed">
            我们使用收集的信息用于：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>提供、维护和改进我们的服务</li>
            <li>个性化您的学习体验</li>
            <li>生成AI驱动的销售话术和练习反馈</li>
            <li>发送服务相关通知</li>
            <li>防止欺诈和滥用</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. 信息共享</h2>
          <p className="text-gray-700 leading-relaxed">
            我们不会出售您的个人信息。我们可能在以下情况下共享信息：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li><strong>服务提供商：</strong>AI模型提供商（用于生成话术和分析）、支付处理商（PayPal）</li>
            <li><strong>团队功能：</strong>如果您加入团队，团队管理员可以查看团队成员的练习数据</li>
            <li><strong>法律要求：</strong>在法律要求的情况下</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. 数据安全</h2>
          <p className="text-gray-700 leading-relaxed">
            我们采取适当的安全措施保护您的个人信息：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>所有数据传输使用SSL/TLS加密</li>
            <li>密码使用PBKDF2算法加密存储</li>
            <li>数据库启用行级安全策略（RLS）</li>
            <li>定期安全审计和漏洞扫描</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">5. 数据保留</h2>
          <p className="text-gray-700 leading-relaxed">
            我们保留您的数据的时间：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>账户信息：在账户活跃期间保留</li>
            <li>对话和练习数据：保留2年</li>
            <li>日志数据：保留90天</li>
            <li>您可以随时请求删除您的数据</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">6. 您的权利</h2>
          <p className="text-gray-700 leading-relaxed">
            您有权：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>访问您的个人数据</li>
            <li>更正不准确的数据</li>
            <li>请求删除您的数据</li>
            <li>导出您的数据</li>
            <li>撤回同意</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-4">
            您可以在应用内的"数据权利"页面行使这些权利，或联系我们：privacy@aisalecoach.com
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Cookie使用</h2>
          <p className="text-gray-700 leading-relaxed">
            我们使用Cookie来：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>维持您的登录状态</li>
            <li>记住您的偏好设置</li>
            <li>分析使用模式以改进服务</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-4">
            您可以在浏览器设置中管理Cookie偏好。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">8. 联系我们</h2>
          <p className="text-gray-700 leading-relaxed">
            如果您对本隐私政策有任何疑问，请联系我们：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>邮箱：privacy@aisalecoach.com</li>
            <li>数据保护官：dpo@aisalecoach.com</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
