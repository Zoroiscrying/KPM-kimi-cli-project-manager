import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import '@xterm/xterm/css/xterm.css';
import type { Project } from '../types';

export interface TerminalHandle {
  sendCommand: (command: string) => void;
  focus: () => void;
}

interface TerminalProps {
  project: Project;
  isActive: boolean;
}

// Kimi-inspired purple/blue terminal palette
const TERMINAL_THEME = {
  background: '#0d0a14',
  foreground: '#e8e2f0',
  cursor: '#c4b5fd',
  black: '#151222',
  brightBlack: '#4a4460',
  red: '#f87171',
  brightRed: '#fca5a5',
  green: '#34d399',
  brightGreen: '#6ee7b7',
  yellow: '#fbbf24',
  brightYellow: '#fcd34d',
  blue: '#818cf8',
  brightBlue: '#a5b4fc',
  magenta: '#c084fc',
  brightMagenta: '#d8b4fe',
  cyan: '#22d3ee',
  brightCyan: '#67e8f9',
  white: '#e8e2f0',
  brightWhite: '#ffffff',
};

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(
  ({ project, isActive }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const webglAddonRef = useRef<WebglAddon | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const initializedRef = useRef(false);

    useImperativeHandle(ref, () => ({
      sendCommand: (command: string) => {
        const sessionId = sessionIdRef.current;
        const term = terminalRef.current;
        if (!sessionId || !term) return;
        term.write(command);
        term.write('\r');
        invoke('write_terminal', { sessionId, data: command + '\r' }).catch(
          (err) => {
            term.writeln(`\r\n[write error: ${err}]`);
          }
        );
      },
      focus: () => {
        terminalRef.current?.focus();
      },
    }));

    // Initialize the terminal and PTY session the first time this tab becomes active.
    // We intentionally do NOT return a cleanup here: the session must keep running
    // when the tab becomes inactive so the user can switch back without losing state.
    useEffect(() => {
      if (!isActive || !containerRef.current || initializedRef.current) return;
      initializedRef.current = true;

      const term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
        fontWeight: 400,
        fontWeightBold: 700,
        lineHeight: 1.2,
        theme: TERMINAL_THEME,
        scrollback: 10000,
        allowProposedApi: true,
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      try {
        const webglAddon = new WebglAddon();
        term.loadAddon(webglAddon);
        webglAddonRef.current = webglAddon;
      } catch {
        // Fall back to DOM renderer if WebGL is unavailable
      }

      term.open(containerRef.current);
      fitAddon.fit();

      terminalRef.current = term;
      fitAddonRef.current = fitAddon;

      const onDataDisposable = term.onData((data) => {
        const sessionId = sessionIdRef.current;
        if (sessionId) {
          invoke('write_terminal', { sessionId, data }).catch((err) => {
            term.writeln(`\r\n[write error: ${err}]`);
          });
        }
      });

      const handleResize = () => {
        if (!isActive) return;
        fitAddon.fit();
        const sessionId = sessionIdRef.current;
        if (sessionId) {
          const rows = term.rows;
          const cols = term.cols;
          if (rows && cols) {
            invoke('resize_terminal', { sessionId, rows, cols }).catch(() => {});
          }
        }
      };
      window.addEventListener('resize', handleResize);

      let mounted = true;
      let unlisten: UnlistenFn | null = null;

      async function setupSession() {
        const sessionId = `term-${project.id}`;
        sessionIdRef.current = sessionId;

        unlisten = await listen<{ data: string }>('terminal-output', (event) => {
          if (!mounted) return;
          if (event.payload.data && sessionIdRef.current === sessionId && terminalRef.current) {
            terminalRef.current.write(event.payload.data);
          }
        });

        try {
          await invoke('start_terminal', { sessionId, cwd: project.path });
        } catch (err) {
          if (terminalRef.current) {
            terminalRef.current.writeln(`\r\n[failed to start terminal: ${err}]`);
          }
        }
      }
      setupSession();

      cleanupRef.current = () => {
        mounted = false;
        window.removeEventListener('resize', handleResize);
        onDataDisposable.dispose();
        unlisten?.();
        if (sessionIdRef.current) {
          invoke('stop_terminal', { sessionId: sessionIdRef.current }).catch(() => {});
          sessionIdRef.current = null;
        }
        webglAddonRef.current?.dispose();
        webglAddonRef.current = null;
        term.dispose();
        terminalRef.current = null;
        fitAddonRef.current = null;
      };
    }, [isActive, project]);

    // When the tab becomes active, refit and focus the terminal.
    useEffect(() => {
      if (!isActive) {
        terminalRef.current?.blur();
        return;
      }
      if (!terminalRef.current || !fitAddonRef.current) return;
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
        const rows = terminalRef.current?.rows;
        const cols = terminalRef.current?.cols;
        const sessionId = sessionIdRef.current;
        if (rows && cols && sessionId) {
          invoke('resize_terminal', { sessionId, rows, cols }).catch(() => {});
        }
        terminalRef.current?.focus();
      });
    }, [isActive]);

    // On unmount (tab closed), tear everything down.
    useEffect(() => {
      return () => {
        cleanupRef.current?.();
        cleanupRef.current = null;
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={`h-full w-full ${isActive ? '' : 'invisible pointer-events-none'}`}
      />
    );
  }
);

Terminal.displayName = 'Terminal';
