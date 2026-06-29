import { useEffect, useRef, useState } from 'react';
import { ProjectList } from './components/ProjectList';
import { Terminal, type TerminalHandle } from './components/Terminal';
import { RightPanel } from './components/RightPanel';
import { CommandInput } from './components/CommandInput';
import { AddProjectDialog } from './components/AddProjectDialog';
import { EditProjectDialog } from './components/EditProjectDialog';
import { Toast } from './components/Toast';
import { useAppStore } from './store/useAppStore';
import type { Project } from './types';

interface Tab {
  id: string;
  project: Project;
}

function App() {
  const {
    projects,
    sessions,
    loaded,
    error,
    loadState,
    addProject,
    updateProject,
    deleteProject,
    openKimi,
    importKimiProjects,
    clearError,
  } = useAppStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const terminalRefs = useRef<Map<string, TerminalHandle>>(new Map());

  useEffect(() => {
    loadState();
  }, [loadState]);

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-neutral-400">
        Loading...
      </div>
    );
  }

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;
  const activeProject = activeTab?.project || null;
  const editingProject = activeProject;

  const handleSelectProject = (id: string) => {
    setSelectedId(id);
    const project = projects.find((p) => p.id === id);
    if (!project) return;

    const existing = tabs.find((t) => t.project.id === id);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const newTab: Tab = { id: `tab-${id}-${Date.now()}`, project };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      try {
        await import('@tauri-apps/api/core').then(({ invoke }) =>
          invoke('stop_terminal', { sessionId: `term-${tab.project.id}` })
        );
      } catch {
        // ignore
      }
    }

    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        const nextActive = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
        setActiveTabId(nextActive?.id ?? null);
      }
      return next;
    });
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    if (selectedId === id) {
      setSelectedId(null);
    }
    const tabsToClose = tabs.filter((t) => t.project.id === id);
    for (const tab of tabsToClose) {
      await handleCloseTab(tab.id);
    }
  };

  const handleCommandSubmit = (command: string) => {
    if (!activeTabId) return;
    const handle = terminalRefs.current.get(activeTabId);
    handle?.sendCommand(command);
    handle?.focus();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-neutral-100">
      {/* Left sidebar: projects */}
      <div className="flex w-60 flex-shrink-0 flex-col overflow-hidden border-r border-neutral-800 bg-neutral-900">
        <div className="flex-1 overflow-hidden">
          <ProjectList
            projects={projects}
            selectedId={activeProject?.id ?? selectedId}
            onSelect={handleSelectProject}
            onDelete={handleDeleteProject}
          />
        </div>
        <div className="shrink-0 space-y-2 border-t border-neutral-800 p-3">
          <button
            onClick={() => setIsAddOpen(true)}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            + Add Project
          </button>
          <button
            onClick={() => importKimiProjects()}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-700"
          >
            Import from Kimi
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden p-3">
        {/* Tab bar */}
        {tabs.length > 0 && (
          <div className="mb-2 flex h-9 flex-shrink-0 items-center gap-1 overflow-x-auto border-b border-neutral-800 pb-2">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab.id === activeTabId
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                <span className="max-w-[140px] truncate">{tab.project.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                  className="rounded p-0.5 opacity-60 hover:bg-white/10 hover:opacity-100"
                  aria-label="Close tab"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Terminal surface */}
        <div className="relative flex-1 overflow-hidden">
          {tabs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-500">
              <p className="text-sm">从左侧选择一个项目开始</p>
            </div>
          ) : (
            tabs.map((tab) => (
              <div
                key={tab.id}
                className={`absolute inset-0 ${tab.id === activeTabId ? 'z-10' : 'z-0 opacity-0'}`}
              >
                <Terminal
                  ref={(el) => {
                    if (el) {
                      terminalRefs.current.set(tab.id, el);
                    } else {
                      terminalRefs.current.delete(tab.id);
                    }
                  }}
                  project={tab.project}
                  isActive={tab.id === activeTabId}
                />
              </div>
            ))
          )}
        </div>

        {/* Bottom command input */}
        <div className="mt-3 h-14 shrink-0">
          <CommandInput
            onSubmit={handleCommandSubmit}
            disabled={!activeProject}
            placeholder={activeProject ? '输入命令发送到终端...' : '先选择一个项目'}
          />
        </div>
      </div>

      {/* Right sidebar: active project info */}
      <div className="w-72 flex-shrink-0 overflow-hidden border-l border-neutral-800 bg-neutral-900">
        <RightPanel
          project={activeProject}
          sessions={sessions}
          onOpenKimi={() => activeProject && openKimi(activeProject)}
          onEdit={() => setIsEditOpen(true)}
        />
      </div>

      <AddProjectDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={addProject}
      />
      <EditProjectDialog
        project={editingProject}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={updateProject}
      />
      {error && <Toast message={error} onClose={clearError} />}
    </div>
  );
}

export default App;
