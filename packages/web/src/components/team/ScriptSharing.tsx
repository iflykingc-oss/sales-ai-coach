import { logger } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { ThumbsUp, Share2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTeamStore } from '@/stores/teamStore';
import { useUserStore } from '@/stores/userStore';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

export function ScriptSharing() {
  const { sharedScripts, setSharedScripts, toggleScriptLike, approveScript, rejectScript } = useTeamStore();
  const user = useUserStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareTitle, setShareTitle] = useState('');
  const [shareContent, setShareContent] = useState('');

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        // Get team ID from user's team
        const teamRes = await api.get('/teams/my') as any;
        const team = teamRes?.data;
        if (!team?.id) {
          setLoading(false);
          return;
        }

        const res = await api.get(`/shared-scripts/${team.id}`) as any;
        const scripts = res?.data || [];
        setSharedScripts(scripts);
      } catch (err) {
        logger.error('Failed to fetch shared scripts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchScripts();
  }, [setSharedScripts]);

  const handleShare = async () => {
    if (!shareTitle || !shareContent) return;
    try {
      const teamRes = await api.get('/teams/my') as any;
      const teamId = teamRes?.data?.id;
      if (!teamId) return;

      await api.post(`/shared-scripts/${teamId}`, {
        title: shareTitle,
        content: shareContent,
      });
      setShareTitle('');
      setShareContent('');
      setShowShareDialog(false);
      // Refresh list
      const res = await api.get(`/shared-scripts/${teamId}`) as any;
      setSharedScripts(res?.data || []);
    } catch (err) {
      logger.error('Failed to share script:', err);
    }
  };

  const handleLike = async (scriptId: string) => {
    try {
      const teamRes = await api.get('/teams/my') as any;
      const teamId = teamRes?.data?.id;
      if (!teamId) return;

      await api.post(`/shared-scripts/${teamId}/${scriptId}/like`);
      toggleScriptLike(scriptId);
    } catch (err) {
      logger.error('Failed to like script:', err);
    }
  };

  const handleApprove = async (scriptId: string, approved: boolean) => {
    try {
      const teamRes = await api.get('/teams/my') as any;
      const teamId = teamRes?.data?.id;
      if (!teamId) return;

      await api.patch(`/shared-scripts/${teamId}/${scriptId}/approve`, { approved });
      if (approved) {
        approveScript(scriptId);
      } else {
        rejectScript(scriptId);
      }
    } catch (err) {
      logger.error('Failed to approve script:', err);
    }
  };

  const isOwner = user?.role === 'TEAM_OWNER' || user?.role === 'ADMIN';
  const sortedScripts = [...sharedScripts].sort((a, b) => b.likes - a.likes);
  const pendingApproval = sharedScripts.filter((s) => !s.approved);

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-3 w-3/4 rounded bg-gray-200" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Share Button */}
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setShowShareDialog(true)}>
          <Share2 className="mr-1.5 h-4 w-4" />
          分享话术到团队
        </Button>
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <Card className="border-primary-200">
          <h4 className="mb-3 font-medium text-gray-900">分享话术</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="话术标题"
              value={shareTitle}
              onChange={(e) => setShareTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <textarea
              placeholder="话术内容..."
              value={shareContent}
              onChange={(e) => setShareContent(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowShareDialog(false)}>取消</Button>
              <Button size="sm" onClick={handleShare} disabled={!shareTitle || !shareContent}>分享</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Approval Queue */}
      {isOwner && pendingApproval.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <h3 className="text-base font-semibold text-gray-900">待审批话术</h3>
            <Badge variant="warning">{pendingApproval.length}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {pendingApproval.map((script) => (
              <div key={script.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{script.title}</p>
                  <p className="text-xs text-gray-500">{script.authorName} · {script.createdAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleApprove(script.id, true)}>
                    <CheckCircle className="mr-1 h-3.5 w-3.5 text-green-600" />
                    通过
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleApprove(script.id, false)}>
                    <XCircle className="mr-1 h-3.5 w-3.5 text-red-600" />
                    拒绝
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Script List */}
      {sortedScripts.length === 0 ? (
        <EmptyState
          icon={<Share2 className="h-6 w-6" />}
          title="暂无共享话术"
          description="分享你的优质话术到团队，帮助新人快速成长"
          action={{ label: '分享话术', onClick: () => setShowShareDialog(true) }}
        />
      ) : (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">话术排行榜</h3>
          <div className="space-y-3">
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
                    {script.industry && <span>{script.industry}</span>}
                    <span>{script.createdAt}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLike(script.id)}
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
      )}
    </div>
  );
}
