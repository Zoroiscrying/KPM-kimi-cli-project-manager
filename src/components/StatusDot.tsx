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
        <span className={`absolute inline-flex ${sizeClasses} animate-ping rounded-full bg-white opacity-75`} />
        <span className={`relative inline-flex ${sizeClasses} rounded-full bg-black ring-1 ring-white/50`} />
      </span>
    );
  }

  if (status === 'completed') {
    return (
      <span
        className={`inline-flex ${sizeClasses} rounded-full bg-[#1a88ff]`}
        title="已完成"
      />
    );
  }

  return (
    <span
      className={`inline-flex ${sizeClasses} rounded-full bg-white/70`}
      title="未开始"
    />
  );
}
