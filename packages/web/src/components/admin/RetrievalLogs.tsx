import { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronRight, Clock, Zap, Database, Brain, Target } from 'lucide-react';
import { api } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface RetrievalLog {
  id: string;
  user_id: string;
  query: string;
  industry: string;
  objection: string;
  persona: string;
  graph_results: any[];
  coarse_results: any[];
  bm25_results: any[];
  final_results: any[];
  injected_knowledge: any[];
  created_at: string;
}

interface Summary {
  total: number;
  avg_graph_results: number;
  avg_final_results: number;
  top_queries: { query: string; count: number }[];
}

export function RetrievalLogs() {
  const [logs, setLogs] = useState<RetrievalLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 筛选条件
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userId, setUserId] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (userId) params.set('user_id', userId);
      params.set('limit', '50');

      const res = await api.get(`/admin/retrieval-logs?${params.toString()}`);
      setLogs(res.data || []);
      setSummary(res.summary || null);
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleSearch = () => { fetchLogs(); };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 mb-1 block">搜索 Query</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="输入关键词搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">开始日期</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">结束日期</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">用户 ID</label>
            <Input placeholder="可选" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-40" />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? '查询中...' : '查询'}
          </Button>
        </div>
      </Card>

      {/* 统计摘要 */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-xs text-gray-500">总日志数</div>
            <div className="text-xl font-semibold">{summary.total}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">平均图谱命中</div>
            <div className="text-xl font-semibold">{summary.avg_graph_results.toFixed(1)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">平均最终注入</div>
            <div className="text-xl font-semibold">{summary.avg_final_results.toFixed(1)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">热门 Query</div>
            <div className="text-sm font-medium truncate">{summary.top_queries[0]?.query || '-'}</div>
          </Card>
        </div>
      )}

      {/* 日志列表 */}
      <div className="space-y-2">
        {logs.length === 0 && !loading && (
          <Card className="p-8 text-center text-gray-400">暂无日志数据</Card>
        )}

        {logs.map((log) => (
          <Card key={log.id} className="overflow-hidden">
            {/* 日志头部（可点击展开） */}
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(log.id)}
            >
              <div className="flex-shrink-0">
                {expandedId === log.id ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{log.query}</span>
                  {log.industry && (
                    <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">{log.industry}</span>
                  )}
                  {log.objection && (
                    <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">{log.objection}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                <span className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  图谱:{log.graph_results?.length || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  粗筛:{log.coarse_results?.length || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  BM25:{log.bm25_results?.length || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  注入:{log.final_results?.length || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(log.created_at)}
                </span>
              </div>
            </div>

            {/* 展开详情 */}
            {expandedId === log.id && (
              <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
                {/* Pipeline 可视化 */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded">
                    <Database className="h-3 w-3" />
                    图谱 {log.graph_results?.length || 0}
                  </div>
                  <span className="text-gray-300">→</span>
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    <Search className="h-3 w-3" />
                    粗筛 {log.coarse_results?.length || 0}
                  </div>
                  <span className="text-gray-300">→</span>
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                    <Zap className="h-3 w-3" />
                    BM25 {log.bm25_results?.length || 0}
                  </div>
                  <span className="text-gray-300">→</span>
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded">
                    <Target className="h-3 w-3" />
                    注入 {log.final_results?.length || 0}
                  </div>
                </div>

                {/* 图谱结果 */}
                {log.graph_results?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-purple-700 mb-2">🧠 图谱检索结果</h4>
                    <div className="space-y-1">
                      {log.graph_results.map((r: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-white p-2 rounded border">
                          <span className="font-medium">{r.strategy}</span>
                          <span className="text-gray-500">得分: {(r.score * 100).toFixed(0)}%</span>
                          <span className="text-gray-400 truncate flex-1">{r.content_preview}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 粗筛结果 */}
                {log.coarse_results?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-blue-700 mb-2">📊 粗筛结果 (Top 10)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b">
                            <th className="text-left py-1 pr-2">内容</th>
                            <th className="text-right py-1 px-2">行业</th>
                            <th className="text-right py-1 px-2">权重</th>
                            <th className="text-right py-1 px-2">Trigram</th>
                            <th className="text-right py-1 px-2">FTS</th>
                            <th className="text-right py-1 pl-2">综合</th>
                          </tr>
                        </thead>
                        <tbody>
                          {log.coarse_results.map((r: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-1 pr-2 truncate max-w-[200px]">{r.content_preview}</td>
                              <td className="text-right py-1 px-2">{r.industry}</td>
                              <td className="text-right py-1 px-2">{r.weight?.toFixed(2)}</td>
                              <td className="text-right py-1 px-2">{(r.trigram_score * 100).toFixed(0)}%</td>
                              <td className="text-right py-1 px-2">{(r.fts_rank * 100).toFixed(0)}%</td>
                              <td className="text-right py-1 pl-2 font-medium">{(r.final_score * 100).toFixed(0)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* BM25 精排结果 */}
                {log.bm25_results?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-yellow-700 mb-2">⚡ BM25 精排结果</h4>
                    <div className="space-y-1">
                      {log.bm25_results.map((r: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-white p-2 rounded border">
                          <span className="w-5 text-gray-400">#{i + 1}</span>
                          <span className="flex-1 truncate">{r.content_preview}</span>
                          <span className="text-gray-500">BM25: {r.bm25_score?.toFixed(3)}</span>
                          {r.graph_score > 0 && <span className="text-purple-500">图谱: {(r.graph_score * 100).toFixed(0)}%</span>}
                          <span className="text-gray-500">权重: {r.weight?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 最终注入 */}
                {log.injected_knowledge?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-green-700 mb-2">✅ 最终注入知识</h4>
                    <div className="space-y-2">
                      {log.injected_knowledge.map((k: any, i: number) => (
                        <div key={i} className="bg-white p-3 rounded border border-green-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">{k.type}</span>
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">{k.industry}</span>
                          </div>
                          <p className="text-xs text-gray-700">{k.content_preview}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
