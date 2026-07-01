import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { CanvasAddon } from '@xterm/addon-canvas';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import '@xterm/xterm/css/xterm.css';
import type { Project } from '../types';
import type { SessionStatus } from './StatusDot';

export interface TerminalHandle {
  sendCommand: (command: string) => void;
  focus: () => void;
}

interface TerminalProps {
  project: Project;
  sessionId: string;
  isActive: boolean;
  onSessionStart?: () => void;
  onSessionStatusChange?: (status: SessionStatus) => void;
}

const ANSI_ESCAPE_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_RE, '');
}

function looksLikePrompt(tail: string): boolean {
  const plain = stripAnsi(tail);
  // Match a line that is just ">" or "> " at the very end of output.
  return /[\r\n]>\s*$/.test(plain);
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
  ({ project, sessionId, isActive, onSessionStart, onSessionStatusChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const initializedRef = useRef(false);
    const hasInputRef = useRef(false);
    const outputTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const outputTailRef = useRef('');

    const clearOutputTimer = () => {
      if (outputTimerRef.current) {
        clearTimeout(outputTimerRef.current);
        outputTimerRef.current = null;
      }
    };

    const startOutputTimer = () => {
      clearOutputTimer();
      outputTimerRef.current = setTimeout(() => {
        onSessionStatusChange?.('completed');
      }, 3000);
    };

    useImperativeHandle(ref, () => ({
      sendCommand: (command: string) => {
        const term = terminalRef.current;
        if (!term || !command) return;
        hasInputRef.current = true;
        outputTailRef.current = '';
        onSessionStatusChange?.('running');
        startOutputTimer();
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
        lineHeight: 1.0,
        theme: TERMINAL_THEME,
        scrollback: 10000,
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new CanvasAddon());

      term.open(containerRef.current);
      fitAddon.fit();

      terminalRef.current = term;
      fitAddonRef.current = fitAddon;

      const onDataDisposable = term.onData((data) => {
        hasInputRef.current = true;
        outputTailRef.current = '';
        onSessionStatusChange?.('running');
        startOutputTimer();
        invoke('write_terminal', { sessionId, data }).catch((err) => {
          term.writeln(`\r\n[write error: ${err}]`);
        });
      });

      const handleResize = () => {
        if (!isActive) return;
        fitAddon.fit();
        term.scrollToBottom();
        const rows = term.rows;
        const cols = term.cols;
        if (rows && cols) {
          invoke('resize_terminal', { sessionId, rows, cols }).catch(() => {});
        }
      };
      window.addEventListener('resize', handleResize);

      let mounted = true;
      let unlisten: UnlistenFn | null = null;

      async function setupSession() {
        unlisten = await listen<{ session_id: string; data: string }>(
          'terminal-output',
          (event) => {
            if (!mounted) return;
            if (
              event.payload.session_id === sessionId &&
              event.payload.data &&
              terminalRef.current
            ) {
              const term = terminalRef.current;
              const wasAtBottom =
                term.buffer.active.viewportY === term.buffer.active.baseY;
              term.write(event.payload.data);
              if (wasAtBottom) {
                term.scrollToBottom();
              }
              if (hasInputRef.current) {
                outputTailRef.current += event.payload.data;
                if (outputTailRef.current.length > 256) {
                  outputTailRef.current = outputTailRef.current.slice(-256);
                }
                if (looksLikePrompt(outputTailRef.current)) {
                  clearOutputTimer();
                  onSessionStatusChange?.('completed');
                } else {
                  onSessionStatusChange?.('running');
                  startOutputTimer();
                }
              }
            }
          }
        );

        try {
          await invoke('start_terminal', { sessionId, cwd: project.path });
          onSessionStart?.();
        } catch (err) {
          onSessionStatusChange?.('completed');
          if (terminalRef.current) {
            terminalRef.current.writeln(`\r\n[failed to start terminal: ${err}]`);
          }
        }
      }
      setupSession();

      cleanupRef.current = () => {
        mounted = false;
        clearOutputTimer();
        window.removeEventListener('resize', handleResize);
        onDataDisposable.dispose();
        unlisten?.();
        invoke('stop_terminal', { sessionId }).catch(() => {});
        term.dispose();
        terminalRef.current = null;
        fitAddonRef.current = null;
      };
    }, [isActive, project, onSessionStart, onSessionStatusChange]);

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
        if (rows && cols) {
          invoke('resize_terminal', { sessionId, rows, cols }).catch(() => {});
        }
        terminalRef.current?.refresh(0, (terminalRef.current?.rows ?? 1) - 1);
        terminalRef.current?.scrollToBottom();
        terminalRef.current?.focus();
      });
    }, [isActive, sessionId]);

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
        className="h-full w-full"
      />
    );
  }
);

Terminal.displayName = 'Terminal';
