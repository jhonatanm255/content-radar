import React, { useState } from 'react';
import { Youtube } from 'lucide-react';
import { normalizeYoutubeImageUrl } from '../../infrastructure/utils/images';

interface ChannelAvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-sm',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const ChannelAvatar: React.FC<ChannelAvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);
  const normalizedSrc = normalizeYoutubeImageUrl(src);
  const showImage = normalizedSrc && !failed;

  if (showImage) {
    return (
      <img
        src={normalizedSrc}
        alt={name}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${sizeMap[size]} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-full flex-shrink-0 bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-white ${className}`}
      title={name}
    >
      {name ? getInitials(name) : <Youtube size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
    </div>
  );
};
