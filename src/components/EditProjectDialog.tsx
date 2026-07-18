import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import type { Project } from '../types';

interface EditProjectDialogProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => Promise<void>;
}

export function EditProjectDialog({ project, isOpen, onClose, onSave }: EditProjectDialogProps) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen && project) {
      setName(project.name);
      setPath(project.path);
      setDescription(project.description || '');
    } else if (!isOpen) {
      setName('');
      setPath('');
      setDescription('');
    }
  }, [isOpen, project]);

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

  if (!isOpen || !project) return null;

  const pickDirectory = async () => {
    try {
      const selected = await open({ directory: true });
      if (typeof selected === 'string') {
        setPath(selected);
      }
    } catch {
      // User cancelled or dialog failed; ignore.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !path) return;
    try {
      await onSave({ ...project, name, path, description: description || undefined });
      onClose();
    } catch {
      // Error is surfaced via the app store.
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
      aria-labelledby="edit-project-title"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1e1e1e] p-6 shadow-2xl">
        <h2 id="edit-project-title" className="mb-4 text-xl font-bold text-[#ffffff]">
          Edit Project
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-project-name" className="mb-1 block text-sm text-[#ffffff99]">
              Name
            </label>
            <input
              id="edit-project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-[#ffffff] outline-none focus:border-[#1783ff] focus:ring-1 focus:ring-[#1783ff]/50"
              required
            />
          </div>
          <div>
            <label htmlFor="edit-project-path" className="mb-1 block text-sm text-[#ffffff99]">
              Path
            </label>
            <div className="flex gap-2">
              <input
                id="edit-project-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-[#ffffff] outline-none focus:border-[#1783ff] focus:ring-1 focus:ring-[#1783ff]/50"
                required
              />
              <button
                type="button"
                onClick={pickDirectory}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#ffffff] hover:bg-white/10"
              >
                Browse
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="edit-project-description" className="mb-1 block text-sm text-[#ffffff99]">
              Description
            </label>
            <input
              id="edit-project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-2 text-[#ffffff] outline-none focus:border-[#1783ff] focus:ring-1 focus:ring-[#1783ff]/50"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#ffffff] hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#1783ff] to-[#258eff] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-black/20 hover:from-[#258eff] hover:to-[#1a88ff]"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
