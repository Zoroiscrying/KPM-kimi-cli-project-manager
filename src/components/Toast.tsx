import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-red-500/20 bg-[#2a1212] px-5 py-3 text-sm text-[#fca5a5] shadow-xl shadow-black/30">
      {message}
    </div>
  );
}
