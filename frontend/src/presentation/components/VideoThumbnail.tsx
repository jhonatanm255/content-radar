import React from 'react';
import { Play } from 'lucide-react';

interface VideoThumbnailProps {
  src?: string;
  title: string;
  className?: string;
  duration?: string;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  src,
  title,
  className = 'w-16 h-11',
  duration,
}) => {
  const [hasError, setHasError] = React.useState(false);

  // Fallback high quality creator thumbnail gradient if no image or error
  if (!src || hasError) {
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-900 border border-slate-700/60 relative overflow-hidden flex-shrink-0 flex items-center justify-center group shadow-sm`}
      >
        <div className="absolute inset-0 bg-blue-500/10" />
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-500/20 blur-md" />
        
        {/* Play badge */}
        <div className="w-5 h-5 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white/90">
          <Play size={10} className="fill-white translate-x-0.5" />
        </div>

        {duration && (
          <span className="absolute bottom-1 right-1 text-[8px] font-bold bg-black/80 text-white px-1 py-0.2 rounded">
            {duration}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-lg overflow-hidden relative flex-shrink-0 border border-slate-200/80 dark:border-slate-800 bg-slate-900 shadow-sm`}
    >
      <img
        src={src}
        alt={title}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/15 hover:bg-transparent transition-colors" />
      <div className="absolute bottom-1 right-1 w-4 h-4 rounded bg-red-600/90 text-white flex items-center justify-center">
        <Play size={8} className="fill-white translate-x-0.5" />
      </div>
    </div>
  );
};
