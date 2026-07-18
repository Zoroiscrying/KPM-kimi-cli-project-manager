import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ProjectList } from './components/ProjectList';
import { Terminal, type TerminalHandle } from './components/Terminal';
import { RightPanel } from './components/RightPanel';
import { AddProjectDialog } from './components/AddProjectDialog';
import { EditProjectDialog } from './components/EditProjectDialog';
import { Toast } from './components/Toast';
import { StatusDot, type SessionStatus } from './components/StatusDot';
import { useAppStore } from './store/useAppStore';
import { useI18n } from './i18n';
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
  const [sessionStatuses, setSessionStatuses] = useState<Record<string, SessionStatus>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const startedTabsRef = useRef<Set<string>>(new Set());
  const terminalRefs = useRef<Map<string, TerminalHandle>>(new Map());
  const { t, lang, setLang } = useI18n();

  const setTabStatus = (tabId: string, status: SessionStatus) => {
    setSessionStatuses((prev) => ({ ...prev, [tabId]: status }));
  };

  const removeTabStatus = (tabId: string) => {
    setSessionStatuses((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    startedTabsRef.current.delete(tabId);
  };

  const getProjectStatus = (projectId: string): SessionStatus => {
    const projectTabs = tabs.filter((t) => t.project.id === projectId);
    if (projectTabs.length === 0) return 'not-started';
    if (projectTabs.some((t) => sessionStatuses[t.id] === 'running')) return 'running';
    if (projectTabs.some((t) => sessionStatuses[t.id] === 'completed')) return 'completed';
    return 'not-started';
  };

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Poll real process liveness for running tabs.
  useEffect(() => {
    if (tabs.length === 0) return;

    const interval = setInterval(() => {
      for (const tab of tabs) {
        if (!startedTabsRef.current.has(tab.id)) continue;
        const sessionId = sessionIdForTab(tab);
        import('@tauri-apps/api/core')
          .then(({ invoke }) => invoke<boolean>('is_terminal_running', { sessionId }))
          .then((running) => {
            if (!running) {
              setTabStatus(tab.id, 'completed');
              startedTabsRef.current.delete(tab.id);
            }
          })
          .catch(() => {});
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tabs, sessionStatuses]);

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d0d0d] text-[#ffffff99]">
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
    setTabStatus(newTab.id, 'not-started');
  };

  const sessionIdForTab = (tab: Tab) => `term-${tab.id}`;

  const handleCloseTab = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      try {
        await import('@tauri-apps/api/core').then(({ invoke }) =>
          invoke('stop_terminal', { sessionId: sessionIdForTab(tab) })
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
    removeTabStatus(tabId);
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

  const handleRefresh = async () => {
    try {
      await invoke('refresh_window');
    } catch {
      // ignore
    }
  };

  const handleDumpDebug = () => {
    if (!activeTabId) return;
    const handle = terminalRefs.current.get(activeTabId);
    if (!handle) return;
    navigator.clipboard.writeText(handle.dumpScreen()).then(() => {
      setNotice(t('app.debugCopied'));
      setTimeout(() => setNotice(null), 3000);
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0d0d] text-[#ffffff]">
      {/* Left sidebar */}
      <div
        className={`flex flex-shrink-0 flex-col overflow-hidden border-r border-white/5 bg-[#161616] transition-all duration-300 ease-out ${
          leftCollapsed ? 'w-14' : 'w-60'
        }`}
      >
        <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-white/5 px-3">
          {!leftCollapsed && (
            <span className="text-sm font-bold text-white">Kimi CLI PM</span>
          )}
          <div className="flex items-center gap-1">
            {!leftCollapsed && (
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as 'zh' | 'en')}
                className="cursor-pointer rounded-md border border-white/10 bg-[#1e1e1e] px-1.5 py-1 text-xs text-[#ffffff99] outline-none hover:bg-white/5"
                aria-label="Language"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            )}
            <button
              onClick={() => setLeftCollapsed((v) => !v)}
              className="rounded-md p-1.5 text-[#ffffff99] hover:bg-white/5 hover:text-white"
              aria-label={leftCollapsed ? t('app.expandLeft') : t('app.collapseLeft')}
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
        </div>

        <div className="flex-1 overflow-hidden">
          <ProjectList
            projects={projects}
            selectedId={activeProject?.id ?? selectedId}
            onSelect={handleSelectProject}
            onDelete={handleDeleteProject}
            collapsed={leftCollapsed}
            getStatus={getProjectStatus}
          />
        </div>

        {!leftCollapsed && (
          <div className="shrink-0 space-y-2 border-t border-white/5 p-3">
            <button
              onClick={() => setIsAddOpen(true)}
              aria-label={t('app.addProject')}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1783ff] to-[#258eff] py-2 text-sm font-medium text-white shadow-lg shadow-black/20 hover:from-[#258eff] hover:to-[#1a88ff]"
            >
              <span>+</span>
              <span>{t('app.addProject')}</span>
            </button>
            <button
              onClick={() => importKimiProjects()}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-medium text-[#ffffff] hover:bg-white/10"
            >
              {t('app.importKimi')}
            </button>
          </div>
        )}

        {leftCollapsed && (
          <div className="flex shrink-0 flex-col items-center gap-2 border-t border-white/5 py-3">
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[#1783ff] to-[#258eff] text-white shadow-lg shadow-black/20"
              aria-label={t('app.addProject')}
            >
              +
            </button>
            <button
              onClick={() => importKimiProjects()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#ffffff] hover:bg-white/10"
              aria-label={t('app.importKimi')}
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
          <div className="flex h-11 flex-shrink-0 items-center gap-1 border-b border-white/5 bg-[#0d0d0d] px-3">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  tab.id === activeTabId
                    ? 'bg-[#1783ff]/15 text-[#5cadff]'
                    : 'text-[#ffffff99] hover:bg-white/5 hover:text-[#ffffff]'
                }`}
              >
                <StatusDot status={sessionStatuses[tab.id] ?? 'not-started'} size="sm" />
                <span className="max-w-[140px] truncate">{tab.project.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                  className="rounded p-0.5 opacity-60 hover:bg-white/10 hover:opacity-100"
                  aria-label={t('app.closeTab')}
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
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-2xl shadow-black/10">
              {tabs.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-[#ffffff66]">
                  <img
                    src="/icon.svg"
                    alt="Kimi CLI Project Manager"
                    className="mb-4 h-16 w-16 rounded-2xl shadow-lg shadow-black/30"
                  />
                  <p className="text-sm">{t('app.emptyHint')}</p>
                </div>
              ) : (
                tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`absolute inset-0 ${
                      tab.id === activeTabId ? 'visible z-10' : 'invisible z-0'
                    }`}
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
                      sessionId={sessionIdForTab(tab)}
                      isActive={tab.id === activeTabId}
                      onSessionStart={() => {
                        startedTabsRef.current.add(tab.id);
                      }}
                      onSessionStatusChange={(status) => setTabStatus(tab.id, status)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right sidebar toggle button */}
          <button
            onClick={() => setRightCollapsed((v) => !v)}
            className={`absolute right-3 top-3 z-20 rounded-lg border border-white/10 bg-[#1e1e1e] p-1.5 text-[#ffffff99] shadow-lg hover:bg-[#262626] hover:text-white ${
              rightCollapsed ? 'opacity-100' : 'opacity-0 hover:opacity-100'
            } transition-opacity`}
            aria-label={rightCollapsed ? t('app.expandRight') : t('app.collapseRight')}
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
            className={`flex-shrink-0 overflow-hidden border-l border-white/5 bg-[#161616] transition-all duration-300 ease-out ${
              rightCollapsed ? 'w-0 opacity-0' : 'w-72 opacity-100'
            }`}
          >
            <RightPanel
              project={activeProject}
              sessions={sessions}
              status={activeTabId ? sessionStatuses[activeTabId] ?? 'not-started' : 'none'}
              onOpenKimi={() => activeProject && openKimi(activeProject)}
              onEdit={() => setIsEditOpen(true)}
              onCollapse={() => setRightCollapsed(true)}
              onRefresh={handleRefresh}
              onDumpDebug={handleDumpDebug}
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
      {notice && (
        <div
          className="fixed bottom-4 right-4 z-50 rounded-2xl border border-[#1783ff]/30 bg-[#161616] px-5 py-3 text-sm text-[#5cadff] shadow-xl shadow-black/30"
          onClick={() => setNotice(null)}
        >
          {notice}
        </div>
      )}
    </div>
  );
}

export default App;
