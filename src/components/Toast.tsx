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
    <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-red-500/20 bg-gradient-to-r from-[#7f1d1d] to-[#450a0a] px-5 py-3 text-sm text-white shadow-2xl shadow-red-900/30">
      {message}
    </div>
  );
}
