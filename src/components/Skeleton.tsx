import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={`animate-pulse bg-white/10 rounded-xl ${className}`} 
        />
      ))}
    </>
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="backdrop-blur-md bg-white/10 border border-white/20 shadow-xl rounded-2xl p-6 min-h-[160px] flex flex-col justify-between">
    <div className="flex justify-between items-start">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);
