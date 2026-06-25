import { logger } from '@/utils/logger';
import { useState } from 'react';
import { Plus, Calendar, User, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, SelectItem } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/Dialog';
import { useTeamStore, type TeamTask } from '@/stores/teamStore';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

const statusLabels: Record<TeamTask['status'], string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  expired: '已过期',
};

const statusVariants: Record<TeamTask['status'], 'default' | 'info' | 'success' | 'danger'> = {
  pending: 'info',
  in_progress: 'info',
  completed: 'success',
  expired: 'danger',
};

const typeLabels: Record<TeamTask['type'], string> = {
  practice: '陪练',
  scenario: '场景',
};

type TaskFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'expired';

interface TaskManagerProps {
  teamId: string | null;
}

export function TaskManager({ teamId }: TaskManagerProps) {
  const { tasks, addTask, updateTaskStatus, members } = useTeamStore();

  const [filter, setFilter] = useState<TaskFilter>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', type: 'practice' as TeamTask['type'], assigneeId: '', deadline: '', description: '',
  });

  const filteredTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.assigneeId || !newTask.deadline || !teamId) return;
    setCreating(true);
    try {
      const res = await api.post(`/teams/${teamId}/tasks`, {
        type: newTask.type,
        assigneeId: newTask.assigneeId,
        deadline: newTask.deadline,
        scenario: newTask.title,
        description: newTask.description,
      }) as any;

      const task: TeamTask = {
        id: res?.data?.id || `t${Date.now()}`,
        title: newTask.title,
        type: newTask.type,
        assigneeId: newTask.assigneeId,
        assigneeName: members.find((m) => m.id === newTask.assigneeId)?.name ?? '',
        deadline: newTask.deadline,
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0],
        description: newTask.description,
      };
      addTask(task);
      setNewTask({ title: '', type: 'practice', assigneeId: '', deadline: '', description: '' });
      setShowDialog(false);
    } catch (err) {
      logger.error('Failed to create task:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: TeamTask['status']) => {
    if (!teamId) return;
    updateTaskStatus(taskId, status); // Optimistic update
    try {
      await api.patch(`/teams/${teamId}/tasks/${taskId}`, { status });
    } catch (err) {
      logger.error('Failed to update task:', err);
      // Revert on failure
      updateTaskStatus(taskId, status === 'completed' ? 'pending' : status);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">任务分配</h3>
          <p className="mt-1 text-sm text-gray-500">共 {tasks.length} 个任务</p>
        </div>
        <Button onClick={() => setShowDialog(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          分配任务
        </Button>
      </div>

      {/* Filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(['all', 'pending', 'in_progress', 'completed', 'expired'] as TaskFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {f === 'all' ? '全部' : statusLabels[f]}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="mt-4 space-y-2">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3 transition-colors hover:border-gray-200 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{task.title}</span>
                <Badge variant={statusVariants[task.status]}>{statusLabels[task.status]}</Badge>
                <Badge variant="default">{typeLabels[task.type]}</Badge>
              </div>
              {task.description && (
                <p className="mt-1 text-xs text-gray-500">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {task.assigneeName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {task.deadline}
              </span>
              {task.status !== 'completed' && task.status !== 'expired' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange(task.id, 'completed')}
                  className="text-primary-600 hover:text-primary-700"
                >
                  标记完成
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="暂无任务"
            description="为团队成员分配陪练或场景模拟任务"
            action={{ label: '分配任务', onClick: () => setShowDialog(true) }}
          />
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分配新任务</DialogTitle>
            <DialogDescription>选择成员并设置任务详情</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">任务标题</label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="输入任务标题"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">任务类型</label>
                <Select
                  value={newTask.type}
                  onValueChange={(v) => setNewTask({ ...newTask, type: v as TeamTask['type'] })}
                >
                  <SelectItem value="practice">陪练任务</SelectItem>
                  <SelectItem value="scenario">场景模拟</SelectItem>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">截止日期</label>
                <Input
                  type="date"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">指派成员</label>
              <Select
                value={newTask.assigneeId}
                onValueChange={(v) => setNewTask({ ...newTask, assigneeId: v })}
                placeholder="选择成员"
              >
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">任务描述</label>
              <Input
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="可选的任务描述"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleCreateTask} disabled={!newTask.title || !newTask.assigneeId || !newTask.deadline || creating}>
              {creating ? '创建中...' : '创建任务'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
