import { useState } from 'react';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/Dialog';
import { api } from '@/services/api';
import { toast } from '@/hooks/useToast';

interface CreateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  onSuccess: () => void;
}

export function CreateMemberDialog({ open, onOpenChange, teamId, onSuccess }: CreateMemberDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name || !email) {
      toast.error('请填写姓名和邮箱');
      return;
    }

    setCreating(true);
    try {
      await api.post(`/teams/${teamId}/members`, {
        name,
        email,
        password: password || '123456', // 默认密码
      });

      toast.success('成员创建成功');
      setName('');
      setEmail('');
      setPassword('');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '创建失败';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            添加团队成员
          </DialogTitle>
          <DialogDescription>
            直接创建团队成员账号，无需邀请
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">姓名 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="成员姓名"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">邮箱 *</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">密码</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="留空则默认密码 123456"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">留空则使用默认密码 123456</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? '创建中...' : '创建成员'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
