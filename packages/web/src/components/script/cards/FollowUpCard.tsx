import { memo } from 'react';
import { MessageCircleQuestion, ChevronRight } from 'lucide-react';

export const FollowUpCard = memo(function FollowUpCard({ questions }: { questions?: string[] }) {
  if (!questions?.length) return null;
  return (
    <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-teal-700"><MessageCircleQuestion className="h-4 w-4" />跟进提问建议</h4>
      <ul className="space-y-2">{questions.map((q, i) => <li key={i} className="flex items-start gap-2 text-sm text-teal-800"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />{q}</li>)}</ul>
    </div>
  );
});
