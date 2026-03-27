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
  borderRadius = "0.5rem" 
}) => {
  return (
    <div 
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${className}`}
      style={{ 
        width, 
        height, 
        borderRadius 
      }}
    />
  );
};

export const CardSkeleton = () => (
  <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
    <div className="flex items-center space-y-2">
      <LoadingSkeleton width="40px" height="40px" borderRadius="9999px" />
      <div className="ml-3 space-y-2 flex-1">
        <LoadingSkeleton width="60%" height="1.25rem" />
        <LoadingSkeleton width="40%" height="0.875rem" />
      </div>
    </div>
    <div className="space-y-2">
      <LoadingSkeleton width="100%" height="0.875rem" />
      <LoadingSkeleton width="90%" height="0.875rem" />
      <LoadingSkeleton width="70%" height="0.875rem" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="w-full space-y-4">
    <div className="flex space-x-4 border-b pb-2">
      <LoadingSkeleton width="20%" height="1rem" />
      <LoadingSkeleton width="30%" height="1rem" />
      <LoadingSkeleton width="25%" height="1rem" />
      <LoadingSkeleton width="15%" height="1rem" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4 py-2">
        <LoadingSkeleton width="20%" height="0.875rem" />
        <LoadingSkeleton width="30%" height="0.875rem" />
        <LoadingSkeleton width="25%" height="0.875rem" />
        <LoadingSkeleton width="15%" height="0.875rem" />
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
