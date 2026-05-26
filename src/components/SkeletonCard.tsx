import React from 'react';
import { Skeleton } from './common/Skeleton';

export function SkeletonCard() {
  return (
    <div className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden w-full flex flex-col">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="pt-3 border-t border-white/5 flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-2 w-8" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      </div>
    </div>
  );
}
