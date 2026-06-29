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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-project-title"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-lg bg-neutral-900 p-6 shadow-xl">
        <h2 id="edit-project-title" className="mb-4 text-xl font-bold text-neutral-100">
          Edit Project
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-project-name" className="mb-1 block text-sm text-neutral-400">
              Name
            </label>
            <input
              id="edit-project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>
          <div>
            <label htmlFor="edit-project-path" className="mb-1 block text-sm text-neutral-400">
              Path
            </label>
            <div className="flex gap-2">
              <input
                id="edit-project-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-1 rounded-md bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <button
                type="button"
                onClick={pickDirectory}
                className="rounded-md bg-neutral-700 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-600"
              >
                Browse
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="edit-project-description" className="mb-1 block text-sm text-neutral-400">
              Description
            </label>
            <input
              id="edit-project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
