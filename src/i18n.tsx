import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'zh' | 'en';

const translations: Record<Language, Record<string, string>> = {
  zh: {
    'app.expandLeft': '展开左侧面板',
    'app.collapseLeft': '收起左侧面板',
    'app.expandRight': '展开右侧面板',
    'app.collapseRight': '收起右侧面板',
    'app.addProject': '添加项目',
    'app.importKimi': '从 Kimi 导入',
    'app.emptyHint': '从左侧选择一个项目开始',
    'app.closeTab': '关闭标签页',
    'app.langSwitch': 'Switch to English',
    'list.search': '搜索项目...',
    'list.empty': '还没有项目。',
    'list.noMatch': '没有匹配的项目。',
    'list.delete': '删除项目',
    'panel.title': '环境信息',
    'panel.selectHint': '选择一个项目以查看详情',
    'panel.status': '状态',
    'panel.statusRunning': 'Kimi 正在运行…',
    'panel.statusCompleted': 'Kimi 已结束',
    'panel.statusIdle': 'Kimi 未启动',
    'panel.project': '项目',
    'panel.openInKimi': '在 Kimi 中打开',
    'panel.edit': '编辑项目',
    'panel.recent': '最近会话',
    'panel.noSessions': '暂无会话记录。',
    'panel.tools': '工具',
    'panel.openFolder': '打开文件夹',
    'panel.copyPath': '复制项目路径',
    'panel.refresh': '刷新窗口渲染',
    'panel.dumpDebug': '复制诊断信息',
    'app.debugCopied': '诊断信息已复制到剪贴板',
    'status.running': '运行中',
    'status.completed': '已完成',
    'status.notStarted': '未开始',
    'dialog.addTitle': '添加项目',
    'dialog.editTitle': '编辑项目',
    'dialog.name': '名称',
    'dialog.path': '路径',
    'dialog.description': '描述',
    'dialog.browse': '浏览',
    'dialog.cancel': '取消',
    'dialog.add': '添加',
    'dialog.save': '保存',
    'error.title': '界面渲染出错',
    'error.desc': '应用遇到了意外错误。请尝试重新加载，或到右侧面板使用“刷新窗口渲染”。',
    'error.reload': '重新加载',
  },
  en: {
    'app.expandLeft': 'Expand left panel',
    'app.collapseLeft': 'Collapse left panel',
    'app.expandRight': 'Expand right panel',
    'app.collapseRight': 'Collapse right panel',
    'app.addProject': 'Add Project',
    'app.importKimi': 'Import from Kimi',
    'app.emptyHint': 'Select a project on the left to get started',
    'app.closeTab': 'Close tab',
    'app.langSwitch': '切换到中文',
    'list.search': 'Search projects...',
    'list.empty': 'No projects yet.',
    'list.noMatch': 'No projects match your search.',
    'list.delete': 'Delete project',
    'panel.title': 'Environment',
    'panel.selectHint': 'Select a project to see details',
    'panel.status': 'Status',
    'panel.statusRunning': 'Kimi is running…',
    'panel.statusCompleted': 'Kimi finished',
    'panel.statusIdle': 'Kimi not started',
    'panel.project': 'Project',
    'panel.openInKimi': 'Open in Kimi',
    'panel.edit': 'Edit project',
    'panel.recent': 'Recent sessions',
    'panel.noSessions': 'No sessions yet.',
    'panel.tools': 'Tools',
    'panel.openFolder': 'Open folder',
    'panel.copyPath': 'Copy project path',
    'panel.refresh': 'Refresh window',
    'panel.dumpDebug': 'Copy debug info',
    'app.debugCopied': 'Debug info copied to clipboard',
    'status.running': 'Running',
    'status.completed': 'Completed',
    'status.notStarted': 'Not started',
    'dialog.addTitle': 'Add Project',
    'dialog.editTitle': 'Edit Project',
    'dialog.name': 'Name',
    'dialog.path': 'Path',
    'dialog.description': 'Description',
    'dialog.browse': 'Browse',
    'dialog.cancel': 'Cancel',
    'dialog.add': 'Add',
    'dialog.save': 'Save',
    'error.title': 'Something went wrong',
    'error.desc': 'The app hit an unexpected error. Try reloading, or use "Refresh window" in the right panel.',
    'error.reload': 'Reload',
  },
};

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
  locale: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem('kpm-lang');
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    // localStorage unavailable; fall through to browser detection.
  }
  return (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectLanguage);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  const setLang = (next: Language) => {
    try {
      localStorage.setItem('kpm-lang', next);
    } catch {
      // ignore persistence failures
    }
    setLangState(next);
  };

  const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh');

  const t = (key: string) => translations[lang][key] ?? key;

  return (
    <I18nContext.Provider
      value={{ lang, setLang, toggleLang, t, locale: lang === 'zh' ? 'zh-CN' : 'en-US' }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Standalone usage (e.g. component tests without the provider):
    // fall back to the auto-detected language instead of crashing.
    const lang = detectLanguage();
    return {
      lang,
      setLang: () => {},
      toggleLang: () => {},
      t: (key: string) => translations[lang][key] ?? key,
      locale: lang === 'zh' ? 'zh-CN' : 'en-US',
    };
  }
  return ctx;
}
