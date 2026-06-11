export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">服务条款</h1>
      <p className="text-sm text-gray-500 mb-8">最后更新日期：2026年6月11日</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. 服务说明</h2>
          <p className="text-gray-700 leading-relaxed">
            SalesCoach AI（"销冠AI教练"）是一个AI驱动的销售培训平台，提供话术生成、AI陪练、
            复盘分析等功能。本服务仅供合法商业用途。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. 账户注册</h2>
          <p className="text-gray-700 leading-relaxed">
            使用我们的服务需要注册账户。您需要：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>提供准确、完整的注册信息</li>
            <li>保护您的账户安全，不要与他人共享密码</li>
            <li>对账户下的所有活动负责</li>
            <li>年满16周岁方可注册</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. 使用规范</h2>
          <p className="text-gray-700 leading-relaxed">
            您同意不：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>将服务用于任何非法目的</li>
            <li>尝试绕过任何使用限制</li>
            <li>滥用AI功能（如批量自动化调用）</li>
            <li>上传恶意内容或病毒</li>
            <li>逆向工程或复制我们的服务</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. 订阅与支付</h2>
          <p className="text-gray-700 leading-relaxed">
            关于付费套餐：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>付费套餐按月计费，通过PayPal处理</li>
            <li>升级立即生效，按自然月计费</li>
            <li>您可以随时取消订阅，取消后当前计费周期结束时生效</li>
            <li>免费套餐有每日使用限制</li>
            <li>我们保留调整价格的权利，会提前30天通知</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">5. 知识产权</h2>
          <p className="text-gray-700 leading-relaxed">
            关于内容的知识产权：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>您上传的知识库内容归您所有</li>
            <li>AI生成的话术和分析结果可供您自由使用</li>
            <li>我们保留对平台本身的所有权利</li>
            <li>您授予我们使用您的数据改进服务的权利</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">6. 免责声明</h2>
          <p className="text-gray-700 leading-relaxed">
            请注意：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>AI生成的内容仅供参考，不保证商业效果</li>
            <li>我们不对因使用本服务导致的任何损失负责</li>
            <li>服务按"现状"提供，不作任何明示或暗示的保证</li>
            <li>我们不保证服务的连续性和无错误</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">7. 服务变更与终止</h2>
          <p className="text-gray-700 leading-relaxed">
            我们保留以下权利：
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
            <li>修改或终止服务的任何部分</li>
            <li>在违反条款的情况下暂停或终止您的账户</li>
            <li>调整使用限制和功能</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">8. 争议解决</h2>
          <p className="text-gray-700 leading-relaxed">
            本条款受中华人民共和国法律管辖。任何争议应首先通过友好协商解决，
            协商不成的，提交有管辖权的人民法院解决。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">9. 联系我们</h2>
          <p className="text-gray-700 leading-relaxed">
            如有疑问，请联系我们：legal@aisalecoach.com
          </p>
        </section>
      </div>
    </div>
  );
}
