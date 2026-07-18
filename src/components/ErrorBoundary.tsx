import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0d0d0d] px-6 text-center text-[#ffffff]">
          <h1 className="text-xl font-semibold text-[#f87171]">界面渲染出错</h1>
          <p className="max-w-md text-sm text-[#ffffff99]">
            应用遇到了意外错误。请尝试点击右上角关闭后重新启动，或到右侧面板使用“刷新窗口渲染”。
          </p>
          {this.state.error && (
            <pre className="max-h-48 max-w-lg overflow-auto rounded-xl border border-white/10 bg-[#1e1e1e] p-4 text-left text-xs text-[#ffffff66]">
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-gradient-to-r from-[#1783ff] to-[#258eff] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-black/20"
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
