import { open } from '@tauri-apps/plugin-shell';
import type { Project, Session } from '../types';
import type { SessionStatus } from './StatusDot';

interface RightPanelProps {
  project: Project | null;
  sessions: Session[];
  status?: SessionStatus | 'none';
  onOpenKimi?: () => void;
  onEdit?: () => void;
  onCollapse?: () => void;
  onRefresh?: () => void;
}

export function RightPanel({
  project,
  sessions,
  status = 'none',
  onOpenKimi,
  onEdit,
  onCollapse,
  onRefresh,
}: RightPanelProps) {
  const projectSessions = project
    ? sessions.filter((s) => s.projectId === project.id).slice(-10).reverse()
    : [];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#1f1f1f]">
      <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-white/5 px-4">
        <h2 className="text-sm font-semibold text-[#ffffffd6]">环境信息</h2>
        <button
          onClick={onCollapse}
          className="rounded-md p-1.5 text-[#ffffff8f] hover:bg-white/5 hover:text-white"
          aria-label="收起右侧面板"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!project ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-[#ffffff6b]">选择一个项目以查看详情</p>
          </div>
        ) : (
          <div className="space-y-6">
            {status !== 'none' && (
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#ffffff6b]">
                  状态
                </h3>
                <div
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium ${
                    status === 'running'
                      ? 'border-white/10 bg-black text-white'
                      : status === 'completed'
                      ? 'border-[#1a88ff]/20 bg-[#1a88ff]/10 text-[#7ab8ff]'
                      : 'border-white/10 bg-white/10 text-[#ffffffd6]'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      status === 'running'
                        ? 'animate-pulse bg-white'
                        : status === 'completed'
                        ? 'bg-[#1a88ff]'
                        : 'bg-white/70'
                    }`}
                  />
                  {status === 'running'
                    ? 'Kimi 正在运行…'
                    : status === 'completed'
                    ? 'Kimi 已结束'
                    : 'Kimi 未启动'}
                </div>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#ffffff6b]">
                项目
              </h3>
              <div className="rounded-2xl border border-white/5 bg-[#292929] p-4">
                <p className="text-base font-semibold text-[#ffffffd6]">{project.name}</p>
                <p className="mt-1 break-all text-xs text-[#ffffff6b]" title={project.path}>
                  {project.path}
                </p>
                {project.description && (
                  <p className="mt-3 text-sm leading-relaxed text-[#ffffff8f]">
                    {project.description}
                  </p>
                )}
                {project.tags && project.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#a16bff]/20 px-2.5 py-0.5 text-xs text-[#c9aaff]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenKimi}
                className="rounded-xl bg-gradient-to-r from-[#a16bff] to-[#8a5cf6] px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-900/20 hover:from-[#a672ff] hover:to-[#9565f0]"
              >
                在 Kimi 中打开
              </button>
              <button
                onClick={onEdit}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-[#ffffffd6] hover:bg-white/10"
              >
                编辑项目
              </button>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#ffffff6b]">
                最近会话
              </h3>
              {projectSessions.length === 0 ? (
                <p className="text-sm text-[#ffffff6b]">暂无会话记录。</p>
              ) : (
                <ul className="space-y-2">
                  {projectSessions.map((session) => (
                    <li
                      key={session.id}
                      className="rounded-2xl border border-white/5 bg-[#292929] p-3"
                    >
                      <p className="text-xs text-[#ffffffd6]">
                        {new Date(session.startedAt).toLocaleString('zh-CN')}
                      </p>
                      {session.command && (
                        <p className="mt-1 font-mono text-xs text-[#ffffff6b]">
                          {session.command}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#ffffff6b]">
                工具
              </h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => project && open(project.path)}
                  className="w-full rounded-xl border border-white/5 bg-[#292929] px-3 py-2 text-left text-xs text-[#ffffff8f] hover:bg-[#343434]"
                >
                  打开文件夹
                </button>
                <button
                  onClick={() => project && navigator.clipboard.writeText(project.path)}
                  className="w-full rounded-xl border border-white/5 bg-[#292929] px-3 py-2 text-left text-xs text-[#ffffff8f] hover:bg-[#343434]"
                >
                  复制项目路径
                </button>
                <button
                  onClick={onRefresh}
                  className="w-full rounded-xl border border-white/5 bg-[#292929] px-3 py-2 text-left text-xs text-[#ffffff8f] hover:bg-[#343434]"
                >
                  刷新窗口渲染
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
