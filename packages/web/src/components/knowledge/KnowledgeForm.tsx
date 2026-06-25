import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/Dialog';
import { useKnowledgeStore, type KnowledgeItem } from '@/stores/knowledgeStore';
import { api } from '@/services/api';

interface KnowledgeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INDUSTRY_VALUES = ['房地产', '汽车', 'SaaS', '保险', '金融', '零售', '教育', '其他'] as const;

export function KnowledgeForm({ open, onOpenChange }: KnowledgeFormProps) {
  const { t } = useTranslation();
  const { editingItem, setEditingItem, setIsFormOpen, addItem, updateItem } = useKnowledgeStore();
  const [content, setContent] = useState('');
  const [source, setSource] = useState<'manual' | 'import' | 'ai_generated'>('manual');
  const [industry, setIndustry] = useState('');
  const [weight, setWeight] = useState(5);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const prevOpen = useRef(false);
  if (open && !prevOpen.current) {
    if (editingItem) {
      setContent(editingItem.content);
      setSource(editingItem.source);
      setIndustry(editingItem.industry);
      setWeight(editingItem.weight);
      setTags([...editingItem.tags]);
    } else {
      setContent('');
      setSource('manual');
      setIndustry('');
      setWeight(5);
      setTags([]);
    }
    setTagInput('');
  }
  prevOpen.current = open;

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<KnowledgeItem> & { id?: string }) => {
      if (data.id) {
        return api.put(`/knowledge/${data.id}`, data);
      }
      return api.post('/knowledge', data);
    },
    onSuccess: (res: any, variables) => {
      // For create: add item with server-generated ID
      if (!variables.id && res?.data) {
        const serverItem = res.data;
        addItem({
          id: serverItem.id,
          content: serverItem.content,
          source: serverItem.source || 'manual',
          tags: serverItem.tags || [],
          industry: serverItem.industry || '',
          weight: serverItem.weight || 5,
          createdAt: serverItem.createdAt || new Date().toISOString(),
          updatedAt: serverItem.updatedAt || new Date().toISOString(),
        });
      }
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) return;

    if (editingItem) {
      updateItem(editingItem.id, { content, source, industry, weight, tags });
      saveMutation.mutate({ id: editingItem.id, content, source, industry, weight, tags });
    } else {
      // Don't add to store yet — wait for API response with real ID
      saveMutation.mutate({ content, source, industry, weight, tags });
    }

    setEditingItem(null);
    onOpenChange(false);
    setIsFormOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editingItem ? t('knowledgeForm.editTitle') : t('knowledgeForm.addTitle')}</DialogTitle>
          <DialogDescription>
            {editingItem ? t('knowledgeForm.editDesc') : t('knowledgeForm.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('knowledgeForm.content')}</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('knowledgeForm.contentPlaceholder')}
              rows={5}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('knowledgeForm.source')}</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as KnowledgeItem['source'])}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="manual">{t('knowledgeForm.sourceManual')}</option>
                <option value="import">{t('knowledgeForm.sourceImport')}</option>
                <option value="ai_generated">{t('knowledgeForm.sourceAi')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('knowledgeForm.industry')}</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">{t('knowledgeForm.industryPlaceholder')}</option>
                {INDUSTRY_VALUES.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('knowledgeForm.weightLabel')}: <span className="text-primary-600 font-bold">{weight}</span>/10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{t('knowledgeForm.low')}</span>
              <span>{t('knowledgeForm.high')}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('knowledgeForm.tags')}</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                >
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder={t('knowledgeForm.tagPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => { onOpenChange(false); setEditingItem(null); }}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!content.trim()}>
            {editingItem ? t('knowledgeForm.saveChanges') : t('knowledgeForm.addKnowledge')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
