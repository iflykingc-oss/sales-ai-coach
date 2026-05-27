import { Pencil, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { type KnowledgeItem } from '@/stores/knowledgeStore';
import { cn } from '@/utils/cn';

interface KnowledgeCardProps {
  item: KnowledgeItem;
  onEdit: (item: KnowledgeItem) => void;
  onDelete: (id: string) => void;
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  manual: { label: '手动录入', color: 'info' },
  import: { label: '导入', color: 'warning' },
  ai_generated: { label: 'AI生成', color: 'default' },
};

const tagColors = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
];

function getTagColor(index: number) {
  return tagColors[index % tagColors.length];
}

export function KnowledgeCard({ item, onEdit, onDelete }: KnowledgeCardProps) {
  const sourceInfo = sourceLabels[item.source] || sourceLabels.manual;

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-gray-800 line-clamp-3">
            {item.content}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.tags.map((tag, i) => (
              <span
                key={tag}
                className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', getTagColor(i))}
              >
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </span>
            ))}
            <Badge variant={sourceInfo.color as 'info' | 'warning' | 'default' | 'success' | 'danger'}>
              {sourceInfo.label}
            </Badge>
            {item.industry && (
              <Badge variant="default">{item.industry}</Badge>
            )}
            <span className="ml-auto text-xs text-gray-400">
              权重: {item.weight}/10
            </span>
          </div>
        </div>
        <div className="ml-3 flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
