import { ThumbsUp, Share2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Badge';
import { useTeamStore, type SharedScript } from '@/stores/teamStore';
import { cn } from '@/utils/cn';

const mockScripts: SharedScript[] = [
  {
    id: 's1', title: 'SaaS软件价格谈判话术', authorId: '1', authorName: '张伟',
    content: '当客户提到价格偏高时，不要急于降价，而是...',
    industry: 'SaaS软件', likes: 24, likedByCurrentUser: false, approved: true,
    createdAt: '2025-05-20',
  },
  {
    id: 's2', title: '医疗器械首访开场白', authorId: '2', authorName: '李娜',
    content: '王主任您好，我是XX公司的销售代表，今天来...',
    industry: '医疗器械', likes: 18, likedByCurrentUser: true, approved: true,
    createdAt: '2025-05-19',
  },
  {
    id: 's3', title: '教培行业续费沟通模板', authorId: '3', authorName: '王芳',
    content: '张妈妈您好，课程即将结束，我想和您聊聊...',
    industry: '教育培训', likes: 15, likedByCurrentUser: false, approved: false,
    createdAt: '2025-05-22',
  },
  {
    id: 's4', title: '房地产行业带看话术', authorId: '4', authorName: '刘洋',
    content: '李先生，这套房子最大的亮点是...',
    industry: '房地产', likes: 12, likedByCurrentUser: false, approved: true,
    createdAt: '2025-05-18',
  },
  {
    id: 's5', title: '快消品渠道拓展话术', authorId: '5', authorName: '陈静',
    content: '老板您好，我们这款产品在周边社区卖得很好...',
    industry: '快消品', likes: 8, likedByCurrentUser: false, approved: false,
    createdAt: '2025-05-23',
  },
];

export function ScriptSharing() {
  const { sharedScripts, toggleScriptLike, approveScript, rejectScript } = useTeamStore();

  const displayScripts = sharedScripts.length > 0 ? sharedScripts : mockScripts;
  const sortedScripts = [...displayScripts].sort((a, b) => b.likes - a.likes);
  const pendingApproval = displayScripts.filter((s) => !s.approved);

  return (
    <div className="space-y-6">
      {/* Approval Queue */}
      {pendingApproval.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <h3 className="text-base font-semibold text-gray-900">待审批话术</h3>
            <Badge variant="warning">{pendingApproval.length}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {pendingApproval.map((script) => (
              <div
                key={script.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{script.title}</p>
                  <p className="text-xs text-gray-500">
                    {script.authorName} · {script.industry} · {script.createdAt}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => approveScript(script.id)}
                  >
                    <CheckCircle className="mr-1 h-3.5 w-3.5 text-green-600" />
                    通过
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => rejectScript(script.id)}
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5 text-red-600" />
                    拒绝
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Script Leaderboard */}
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">话术排行榜</h3>
          <Button variant="secondary" size="sm">
            <Share2 className="mr-1.5 h-4 w-4" />
            分享到团队
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {sortedScripts.map((script, index) => (
            <div
              key={script.id}
              className={cn(
                'flex items-start gap-4 rounded-lg border border-gray-100 p-4 transition-colors hover:border-gray-200',
                index === 0 && 'border-yellow-200 bg-yellow-50/50',
                index === 1 && 'border-gray-300 bg-gray-50/50',
                index === 2 && 'border-orange-200 bg-orange-50/50',
              )}
            >
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                index === 0 && 'bg-yellow-400 text-white',
                index === 1 && 'bg-gray-400 text-white',
                index === 2 && 'bg-orange-400 text-white',
                index > 2 && 'bg-gray-100 text-gray-500',
              )}>
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{script.title}</span>
                  {script.approved ? (
                    <Badge variant="success">已通过</Badge>
                  ) : (
                    <Badge variant="warning">待审核</Badge>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">{script.content}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                  <span>{script.authorName}</span>
                  <span>{script.industry}</span>
                  <span>{script.createdAt}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleScriptLike(script.id)}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors',
                  script.likedByCurrentUser
                    ? 'text-primary-600 hover:text-primary-700'
                    : 'text-gray-400 hover:text-gray-600',
                )}
              >
                <ThumbsUp className="h-4 w-4" />
                {script.likes}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
