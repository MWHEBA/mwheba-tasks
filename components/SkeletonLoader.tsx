import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-lg';
      case 'card':
        return 'rounded-xl';
      case 'text':
      default:
        return 'rounded';
    }
  };

  const getDefaultSize = () => {
    switch (variant) {
      case 'circular':
        return { width: '40px', height: '40px' };
      case 'card':
        return { width: '100%', height: '200px' };
      case 'rectangular':
        return { width: '100%', height: '100px' };
      case 'text':
      default:
        return { width: '100%', height: '16px' };
    }
  };

  const defaultSize = getDefaultSize();
  const style = {
    width: width || defaultSize.width,
    height: height || defaultSize.height,
  };

  const skeleton = (
    <div
      className={`bg-slate-200 animate-pulse ${getVariantClasses()} ${className}`}
      style={style}
      role="status"
      aria-label="جاري التحميل"
    />
  );

  if (count === 1) {
    return skeleton;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{skeleton}</div>
      ))}
    </div>
  );
};

// Preset skeleton components for common use cases
export const TaskCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonLoader variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" width="60%" height={20} />
          <SkeletonLoader variant="text" width="40%" height={16} />
        </div>
        <SkeletonLoader variant="rectangular" width={80} height={32} />
      </div>
      <SkeletonLoader variant="text" width="100%" height={12} />
      <SkeletonLoader variant="text" width="80%" height={12} />
    </div>
  );
};

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <TaskCardSkeleton key={index} />
      ))}
    </div>
  );
};
