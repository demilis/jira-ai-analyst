import type { FC } from 'react';
import { cn } from '@/lib/utils';

const Dot: FC<{ className?: string }> = ({ className }) => (
  <div className={cn('h-3 w-3 md:h-4 md:h-4 rounded-full bg-primary-foreground', className)} />
);

export const DieFace: FC<{ value: number }> = ({ value }) => {
  if (value < 1 || value > 6 || !Number.isInteger(value)) {
    value = 1;
  }

  const patterns: Record<number, React.ReactNode> = {
    1: (
      <div className="flex h-full w-full items-center justify-center p-2">
        <Dot />
      </div>
    ),
    2: (
      <div className="flex h-full w-full flex-col justify-between p-2">
        <Dot className="self-start" />
        <Dot className="self-end" />
      </div>
    ),
    3: (
      <div className="flex h-full w-full flex-col justify-between p-2">
        <Dot className="self-start" />
        <Dot className="self-center" />
        <Dot className="self-end" />
      </div>
    ),
    4: (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 p-2">
        <Dot />
        <Dot />
        <Dot />
        <Dot />
      </div>
    ),
    5: (
      <div className="relative h-full w-full p-2">
        <div className="absolute top-1 left-1"><Dot /></div>
        <div className="absolute top-1 right-1"><Dot /></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"><Dot /></div>
        <div className="absolute bottom-1 left-1"><Dot /></div>
        <div className="absolute bottom-1 right-1"><Dot /></div>
      </div>
    ),
    6: (
      <div className="grid h-full w-full grid-cols-2 grid-rows-3 gap-2 p-2">
        <Dot />
        <Dot />
        <Dot />
        <Dot />
        <Dot />
        <Dot />
      </div>
    ),
  };

  return patterns[value];
};
