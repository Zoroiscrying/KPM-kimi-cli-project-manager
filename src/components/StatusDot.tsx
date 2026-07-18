export type SessionStatus = 'not-started' | 'running' | 'completed';

interface StatusDotProps {
  status: SessionStatus;
  size?: 'sm' | 'md';
}

export function StatusDot({ status, size = 'sm' }: StatusDotProps) {
  const sizeClasses = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2';

  if (status === 'running') {
    return (
      <span className="relative inline-flex" title="运行中">
        <span className={`absolute inline-flex ${sizeClasses} animate-ping rounded-full bg-[#258eff] opacity-60`} />
        <span className={`relative inline-flex ${sizeClasses} rounded-full bg-[#1783ff]`} />
      </span>
    );
  }

  if (status === 'completed') {
    return (
      <span
        className={`inline-flex ${sizeClasses} rounded-full bg-[#1783ff]`}
        title="已完成"
      />
    );
  }

  return (
    <span
      className={`inline-flex ${sizeClasses} rounded-full bg-white/25`}
      title="未开始"
    />
  );
}
