export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  projectId: string;
  startedAt: string;
  summary?: string;
  command?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  launchOnStartup?: boolean;
  globalShortcut?: string;
}

export interface AppState {
  version: number;
  projects: Project[];
  sessions: Session[];
  settings: AppSettings;
}
