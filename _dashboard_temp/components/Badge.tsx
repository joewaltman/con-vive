import { getFunnelStageColor } from '@/lib/constants';

interface BadgeProps {
  stage: string;
  size?: 'sm' | 'md';
}

export default function Badge({ stage, size = 'sm' }: BadgeProps) {
  const color = getFunnelStageColor(stage);

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full whitespace-nowrap
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
      `}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {stage}
    </span>
  );
}
