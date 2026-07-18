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
import { playCompletionSound } from '../sound';

export interface TerminalHandle {
  sendCommand: (command: string) => void;
  focus: () => void;
  dumpScreen: () => string;
}

interface TerminalProps {
  project: Project;
  sessionId: string;
  isActive: boolean;
  onSessionStart?: () => void;
  onSessionStatusChange?: (status: SessionStatus) => void;
}

// Kimi CLI is a full-screen TUI: when it goes idle it repaints an input box
// whose prompt line is a bare ">" framed by box borders. The box also stays
// visible while generating, so a bare prompt alone is not enough -- we also
// require that no braille spinner is visible in the bottom area.
const IDLE_PROMPT_RE = /^\s*[│┃|]?\s*>[\s│┃|█]*$/;
const SPINNER_RE = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/;

function bufferShowsIdlePrompt(term: XTerm): boolean {
  const buf = term.buffer.active;
  const lines: string[] = [];
  const bottom = buf.baseY + term.rows - 1;
  for (let y = bottom; y >= buf.baseY && lines.length < 12; y--) {
    const line = buf.getLine(y);
    if (!line) continue;
    const text = line.translateToString(true).trimEnd();
    if (text.length > 0) lines.push(text);
  }
  const hasPrompt = lines.some((line) => IDLE_PROMPT_RE.test(line));
  const hasSpinner = lines.some((line) => SPINNER_RE.test(line));
  return hasPrompt && !hasSpinner;
}

// Kimi-inspired purple/blue terminal palette
const TERMINAL_THEME = {
  background: '#121212',
  foreground: '#ffffffd6',
  cursor: '#ffffff',
  black: '#292929',
  brightBlack: '#4d4d4d',
  red: '#f87171',
  brightRed: '#fca5a5',
  green: '#34d399',
  brightGreen: '#6ee7b7',
  yellow: '#fbbf24',
  brightYellow: '#fcd34d',
  blue: '#258eff',
  brightBlue: '#5cadff',
  magenta: '#a16bff',
  brightMagenta: '#c9aaff',
  cyan: '#22d3ee',
  brightCyan: '#67e8f9',
  white: '#ffffffd6',
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
    const userScrolledUpRef = useRef(false);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastEvalRef = useRef(0);
    const progressSignalRef = useRef(false);
    const oscTailRef = useRef('');
    const lastEmittedStatusRef = useRef<SessionStatus | null>(null);

    // Emit status changes; play a short chime on the transition INTO completed.
    const emitStatus = (status: SessionStatus) => {
      if (status === 'completed' && lastEmittedStatusRef.current !== 'completed') {
        playCompletionSound();
      }
      lastEmittedStatusRef.current = status;
      onSessionStatusChange?.(status);
    };

    // Completion detection, three layered signals:
    // 1. term.onBell — Kimi emits a terminal bell (BEL) / OSC 9 on turn-complete.
    // 2. Trailing timer — after output pauses, check the parsed screen for the
    //    idle input box (bare ">" prompt) without a spinner.
    // 3. Throttled per-chunk check — same screen check, covers the case where
    //    the status bar keeps repainting so output never fully pauses.
    const evaluateStatus = () => {
      const term = terminalRef.current;
      if (!term || !hasInputRef.current) return;
      if (bufferShowsIdlePrompt(term)) {
        emitStatus('completed');
      }
    };

    const scheduleStatusCheck = () => {
      emitStatus('running');
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        idleTimerRef.current = null;
        evaluateStatus();
      }, 300);
    };

    useImperativeHandle(ref, () => ({
      sendCommand: (command: string) => {
        const term = terminalRef.current;
        if (!term || !command) return;
        hasInputRef.current = true;
        emitStatus('running');
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
      dumpScreen: () => {
        const term = terminalRef.current;
        if (!term) return 'no terminal';
        const buf = term.buffer.active;
        const lines: string[] = [];
        const bottom = buf.baseY + term.rows - 1;
        for (let y = bottom; y >= buf.baseY && lines.length < 14; y--) {
          const line = buf.getLine(y);
          if (!line) continue;
          const text = line.translateToString(true).trimEnd();
          if (text.length > 0) lines.push(`${y}: ${JSON.stringify(text)}`);
        }
        return (
          `hasInput=${hasInputRef.current} baseY=${buf.baseY} rows=${term.rows} length=${buf.length}\n` +
          lines.join('\n')
        );
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
        scheduleStatusCheck();
        invoke('write_terminal', { sessionId, data }).catch((err) => {
          term.writeln(`\r\n[write error: ${err}]`);
        });
      });

      const onScrollDisposable = term.onScroll(() => {
        if (!terminalRef.current) return;
        const atBottom =
          terminalRef.current.buffer.active.viewportY ===
          terminalRef.current.buffer.active.baseY;
        userScrolledUpRef.current = !atBottom;
      });

      // Kimi Code emits a terminal bell / OSC 9 notification on turn-complete.
      const onBellDisposable = term.onBell(() => {
        if (hasInputRef.current) {
          emitStatus('completed');
        }
      });

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
              const wasScrolledUp = userScrolledUpRef.current;
              const data = event.payload.data;
              term.write(data);
              if (!wasScrolledUp) {
                requestAnimationFrame(() => {
                  terminalRef.current?.scrollToBottom();
                });
              }
              // Authoritative signal: Kimi emits OSC 9;4;3 when work starts
              // (and every second as keepalive) and OSC 9;4;0 when it clears.
              // Keep a small tail so sequences split across chunks still match.
              const oscHay = oscTailRef.current + data;
              let handled = false;
              if (oscHay.includes('\x1b]9;4;3')) {
                progressSignalRef.current = true;
                emitStatus('running');
                handled = true;
              } else if (oscHay.includes('\x1b]9;4;0')) {
                progressSignalRef.current = true;
                emitStatus('completed');
                handled = true;
              }
              oscTailRef.current = oscHay.slice(-16);
              // Screen-content heuristics only run until the authoritative
              // progress signal shows up (older Kimi builds may not emit it).
              if (!handled && !progressSignalRef.current && hasInputRef.current) {
                scheduleStatusCheck();
                const now = Date.now();
                if (now - lastEvalRef.current > 500) {
                  lastEvalRef.current = now;
                  // Let xterm parse the chunk before reading the buffer.
                  setTimeout(evaluateStatus, 0);
                }
              }
            }
          }
        );

        try {
          await invoke('start_terminal', { sessionId, cwd: project.path });
          onSessionStart?.();
        } catch (err) {
          emitStatus('completed');
          if (terminalRef.current) {
            terminalRef.current.writeln(`\r\n[failed to start terminal: ${err}]`);
          }
        }
      }
      setupSession();

      cleanupRef.current = () => {
        mounted = false;
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
        onDataDisposable.dispose();
        onScrollDisposable.dispose();
        onBellDisposable.dispose();
        unlisten?.();
        invoke('stop_terminal', { sessionId }).catch(() => {});
        term.dispose();
        terminalRef.current = null;
        fitAddonRef.current = null;
      };
    }, [isActive, project, onSessionStart, onSessionStatusChange]);

    // Fit on actual container size changes; scroll/focus when becoming active.
    useEffect(() => {
      if (!isActive || !containerRef.current || !terminalRef.current || !fitAddonRef.current) {
        terminalRef.current?.blur();
        return;
      }

      const container = containerRef.current;
      let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

      const fitAndResize = () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (!fitAddonRef.current || !terminalRef.current || !containerRef.current) return;
          const { clientWidth, clientHeight } = containerRef.current;
          if (clientWidth === 0 || clientHeight === 0) return;
          fitAddonRef.current.fit();
          const rows = terminalRef.current.rows;
          const cols = terminalRef.current.cols;
          if (rows && cols) {
            invoke('resize_terminal', { sessionId, rows, cols }).catch(() => {});
          }
          requestAnimationFrame(() => {
            terminalRef.current?.scrollToBottom();
          });
        }, 100);
      };

      const ro = new ResizeObserver(fitAndResize);
      ro.observe(container);

      // Aggressively scroll to bottom when the tab becomes visible; xterm's
      // canvas renderer sometimes resets the viewport while hidden or during
      // the first paint after visibility changes.
      const scrollLater = (delay: number) => {
        setTimeout(() => {
          terminalRef.current?.scrollToBottom();
        }, delay);
      };
      scrollLater(0);
      scrollLater(50);
      scrollLater(150);
      scrollLater(300);
      terminalRef.current?.focus();

      return () => {
        ro.disconnect();
        if (resizeTimeout) clearTimeout(resizeTimeout);
      };
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
