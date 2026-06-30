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
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const terminalRefs = useRef<Map<string, TerminalHandle>>(new Map());

  useEffect(() => {
    loadState();
  }, [loadState]);

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0811] text-[#a89bc4]">
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
    <div className="flex h-screen overflow-hidden bg-[#0a0811] text-[#e8e2f0]">
      {/* Left sidebar */}
      <div
        className={`flex flex-shrink-0 flex-col overflow-hidden border-r border-white/5 bg-[#0f0c17] transition-all duration-300 ease-out ${
          leftCollapsed ? 'w-14' : 'w-60'
        }`}
      >
        <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-white/5 px-3">
          {!leftCollapsed && (
            <span className="bg-gradient-to-r from-[#a855f7] to-[#6366f1] bg-clip-text text-sm font-bold text-transparent">
              Kimi Desktop
            </span>
          )}
          <button
            onClick={() => setLeftCollapsed((v) => !v)}
            className="rounded-md p-1.5 text-[#a89bc4] hover:bg-white/5 hover:text-white"
            aria-label={leftCollapsed ? '展开左侧面板' : '收起左侧面板'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 transition-transform ${leftCollapsed ? 'rotate-180' : ''}`}
            >
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <ProjectList
            projects={projects}
            selectedId={activeProject?.id ?? selectedId}
            onSelect={handleSelectProject}
            onDelete={handleDeleteProject}
            collapsed={leftCollapsed}
          />
        </div>

        {!leftCollapsed && (
          <div className="shrink-0 space-y-2 border-t border-white/5 p-3">
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] py-2 text-sm font-medium text-white shadow-lg shadow-purple-900/20 hover:from-[#6d28d9] hover:to-[#4338ca]"
            >
              <span>+</span>
              <span>Add Project</span>
            </button>
            <button
              onClick={() => importKimiProjects()}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-medium text-[#d4c8e8] hover:bg-white/10"
            >
              Import from Kimi
            </button>
          </div>
        )}

        {leftCollapsed && (
          <div className="flex shrink-0 flex-col items-center gap-2 border-t border-white/5 py-3">
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] text-white shadow-lg shadow-purple-900/20"
              aria-label="Add Project"
            >
              +
            </button>
            <button
              onClick={() => importKimiProjects()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#d4c8e8] hover:bg-white/10"
              aria-label="Import from Kimi"
            >
              ↓
            </button>
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Tab bar */}
        {tabs.length > 0 && (
          <div className="flex h-11 flex-shrink-0 items-center gap-1 border-b border-white/5 bg-[#0a0811] px-3">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  tab.id === activeTabId
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-[#9c8fb8] hover:bg-white/5 hover:text-[#d4c8e8]'
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

        {/* Center + right toggle */}
        <div className="relative flex flex-1 flex-row overflow-hidden">
          {/* Center terminal */}
          <div className="flex flex-1 flex-col overflow-hidden p-3">
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/5 bg-[#0d0a14] shadow-2xl">
              {tabs.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-[#7d7196]">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] text-3xl text-white shadow-lg shadow-purple-900/30">
                    K
                  </div>
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

            <div className="mt-3 h-14 shrink-0">
              <CommandInput
                onSubmit={handleCommandSubmit}
                disabled={!activeProject}
                placeholder={activeProject ? '输入命令发送到终端...' : '先选择一个项目'}
              />
            </div>
          </div>

          {/* Right sidebar toggle button */}
          <button
            onClick={() => setRightCollapsed((v) => !v)}
            className={`absolute right-3 top-3 z-20 rounded-lg border border-white/10 bg-[#151222] p-1.5 text-[#a89bc4] shadow-lg hover:bg-[#1c1830] hover:text-white ${
              rightCollapsed ? 'opacity-100' : 'opacity-0 hover:opacity-100'
            } transition-opacity`}
            aria-label={rightCollapsed ? '展开右侧面板' : '收起右侧面板'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 transition-transform ${rightCollapsed ? '' : 'rotate-180'}`}
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Right sidebar */}
          <div
            className={`flex-shrink-0 overflow-hidden border-l border-white/5 bg-[#0f0c17] transition-all duration-300 ease-out ${
              rightCollapsed ? 'w-0 opacity-0' : 'w-72 opacity-100'
            }`}
          >
            <RightPanel
              project={activeProject}
              sessions={sessions}
              onOpenKimi={() => activeProject && openKimi(activeProject)}
              onEdit={() => setIsEditOpen(true)}
              onCollapse={() => setRightCollapsed(true)}
            />
          </div>
        </div>
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
