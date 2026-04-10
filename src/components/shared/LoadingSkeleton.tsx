import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

const LoadingSkeleton: React.FC<SkeletonProps> = ({ 
  className = "", 
  width = "100%", 
  height = "1rem", 
  borderRadius = "0.75rem" 
}) => {
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ 
        width, 
        height, 
        borderRadius,
        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      }}
    >
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.8s ease-in-out infinite',
        }}
      />
    </div>
  );
};

export const CardSkeleton = () => (
  <div className="p-6 bg-white rounded-xl border border-slate-100 space-y-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
    <div className="flex items-center">
      <LoadingSkeleton width="44px" height="44px" borderRadius="12px" />
      <div className="ml-3 space-y-2 flex-1">
        <LoadingSkeleton width="60%" height="1.25rem" />
        <LoadingSkeleton width="40%" height="0.75rem" />
      </div>
    </div>
    <div className="space-y-2.5">
      <LoadingSkeleton width="100%" height="0.75rem" />
      <LoadingSkeleton width="85%" height="0.75rem" />
      <LoadingSkeleton width="65%" height="0.75rem" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="w-full space-y-3">
    <div className="flex space-x-4 pb-3 border-b border-slate-100">
      <LoadingSkeleton width="20%" height="0.875rem" />
      <LoadingSkeleton width="30%" height="0.875rem" />
      <LoadingSkeleton width="25%" height="0.875rem" />
      <LoadingSkeleton width="15%" height="0.875rem" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4 py-2.5" style={{ opacity: 1 - i * 0.12 }}>
        <LoadingSkeleton width="20%" height="0.75rem" />
        <LoadingSkeleton width="30%" height="0.75rem" />
        <LoadingSkeleton width="25%" height="0.75rem" />
        <LoadingSkeleton width="15%" height="0.75rem" />
      </div>
    ))}
  </div>
);

export const StatCardSkeleton = () => (
  <div className="p-5 sm:p-6 bg-white rounded-xl border border-slate-100 relative overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
    <div className="flex items-start justify-between">
      <div className="space-y-3 flex-1">
        <LoadingSkeleton width="70%" height="0.75rem" />
        <LoadingSkeleton width="50%" height="1.75rem" />
        <LoadingSkeleton width="40%" height="0.625rem" />
      </div>
      <LoadingSkeleton width="48px" height="48px" borderRadius="12px" />
    </div>
  </div>
);

export default LoadingSkeleton;
