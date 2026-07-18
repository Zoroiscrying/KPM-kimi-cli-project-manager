import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

interface AddProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (input: { name: string; path: string; description?: string }) => Promise<void>;
}

export function AddProjectDialog({ isOpen, onClose, onAdd }: AddProjectDialogProps) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setPath('');
      setDescription('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pickDirectory = async () => {
    try {
      const selected = await open({ directory: true });
      if (typeof selected === 'string') {
        setPath(selected);
        if (!name) {
          const parts = selected.replace(/\\/g, '/').split('/');
          setName(parts[parts.length - 1] || '');
        }
      }
    } catch {
      // User cancelled or dialog failed; ignore.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !path) return;
    try {
      await onAdd({ name, path, description: description || undefined });
      onClose();
    } catch {
      // Error is stored in the app store and surfaced via toast/alert elsewhere.
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-project-title"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#292929] p-6 shadow-2xl">
        <h2 id="add-project-title" className="mb-4 text-xl font-bold text-[#ffffffd6]">
          Add Project
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="add-project-name" className="mb-1 block text-sm text-[#ffffff8f]">
              Name
            </label>
            <input
              id="add-project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[#ffffffd6] outline-none focus:border-[#a16bff] focus:ring-1 focus:ring-[#a16bff]/50"
              required
            />
          </div>
          <div>
            <label htmlFor="add-project-path" className="mb-1 block text-sm text-[#ffffff8f]">
              Path
            </label>
            <div className="flex gap-2">
              <input
                id="add-project-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[#ffffffd6] outline-none focus:border-[#a16bff] focus:ring-1 focus:ring-[#a16bff]/50"
                required
              />
              <button
                type="button"
                onClick={pickDirectory}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#ffffffd6] hover:bg-white/10"
              >
                Browse
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="add-project-description" className="mb-1 block text-sm text-[#ffffff8f]">
              Description
            </label>
            <input
              id="add-project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[#ffffffd6] outline-none focus:border-[#a16bff] focus:ring-1 focus:ring-[#a16bff]/50"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#ffffffd6] hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#a16bff] to-[#8a5cf6] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-900/20 hover:from-[#a672ff] hover:to-[#9565f0]"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
