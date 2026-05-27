import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, MessageSquare, Dumbbell, BookOpen, ClipboardList, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  section: string;
  action: () => void;
}

function useCommands() {
  const navigate = useNavigate();

  return [
    {
      id: 'session',
      label: '新建会话',
      description: '开始一个新的AI销售教练会话',
      icon: <MessageSquare className="h-4 w-4" />,
      section: '快捷操作',
      action: () => navigate('/app'),
    },
    {
      id: 'practice',
      label: 'AI陪练',
      description: '进入销售技能陪练模式',
      icon: <Dumbbell className="h-4 w-4" />,
      section: '快捷操作',
      action: () => navigate('/app/practice'),
    },
    {
      id: 'knowledge',
      label: '知识库',
      description: '浏览和管理个人知识库',
      icon: <BookOpen className="h-4 w-4" />,
      section: '快捷操作',
      action: () => navigate('/app/knowledge'),
    },
    {
      id: 'review',
      label: '复盘分析',
      description: '上传对话记录进行复盘分析',
      icon: <ClipboardList className="h-4 w-4" />,
      section: '快捷操作',
      action: () => navigate('/app/review'),
    },
    {
      id: 'team',
      label: '团队管理',
      description: '查看团队数据和任务',
      icon: <MessageSquare className="h-4 w-4" />,
      section: '快捷操作',
      action: () => navigate('/app/team'),
    },
    {
      id: 'plugins',
      label: '行业插件',
      description: '浏览和安装行业插件包',
      icon: <BookOpen className="h-4 w-4" />,
      section: '快捷操作',
      action: () => navigate('/app/plugins'),
    },
  ] as CommandItem[];
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const commands = useCommands();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Filter commands
  const filtered = query
    ? commands.filter(
        (c) => fuzzyMatch(query, c.label) || fuzzyMatch(query, c.description || ''),
      )
    : commands;

  // Group by section
  const sections = new Map<string, CommandItem[]>();
  for (const cmd of filtered) {
    const items = sections.get(cmd.section) || [];
    items.push(cmd);
    sections.set(cmd.section, items);
  }

  // Flatten for keyboard navigation
  const flatItems = filtered;

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      cmd.action();
      setOpen(false);
      setQuery('');
    },
    [navigate],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
      e.preventDefault();
      executeCommand(flatItems[selectedIndex]);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/50 animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-[10%] z-[100] w-full max-w-xl -translate-x-1/2 rounded-xl border border-gray-200 bg-white shadow-2xl animate-scale-in"
          onPointerDownOutside={() => setOpen(false)}
        >
          {/* Search input */}
          <div className="flex items-center border-b border-gray-200 px-4">
            <Search className="h-5 w-5 text-gray-400" />
            <Dialog.Title className="sr-only">命令面板</Dialog.Title>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入命令或搜索..."
              className="w-full border-0 bg-transparent px-3 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              autoFocus
            />
            <kbd className="hidden rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 sm:inline-block">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {flatItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">无匹配结果</div>
            ) : (
              Array.from(sections.entries()).map(([section, items]) => (
                <div key={section} className="mb-2 last:mb-0">
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-400">{section}</div>
                  {items.map((cmd) => {
                    const globalIdx = flatItems.indexOf(cmd);
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                          globalIdx === selectedIndex
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        {cmd.icon}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-xs text-gray-400">{cmd.description}</div>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-2 text-xs text-gray-400">
            <kbd className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5">↑↓</kbd>
            <span>导航</span>
            <kbd className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5">↵</kbd>
            <span>执行</span>
            <kbd className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5">ESC</kbd>
            <span>关闭</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
