import React from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { formatEngagementCount } from '../utils/format';

interface VideoEngagementBadgeProps {
  likes: number;
  dislikes?: number | null;
  compact?: boolean;
}

export const VideoEngagementBadge: React.FC<VideoEngagementBadgeProps> = ({
  likes,
  dislikes,
  compact = false,
}) => (
  <div
    className={`flex items-center gap-2 text-[10px] font-semibold ${
      compact ? '' : 'mt-1'
    }`}
  >
    <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
      <ThumbsUp size={11} />
      {formatEngagementCount(likes)}
    </span>
    <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-cr-muted">
      <ThumbsDown size={11} />
      {formatEngagementCount(dislikes)}
    </span>
  </div>
);
