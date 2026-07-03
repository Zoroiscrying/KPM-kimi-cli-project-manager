import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// xterm.js requires a real browser environment (canvas, matchMedia, etc.)
// so we provide a minimal mock for component tests.
vi.mock('@xterm/xterm', () => ({
  Terminal: class MockTerminal {
    loadAddon() {}
    open() {}
    write() {}
    writeln() {}
    clear() {}
    dispose() {}
    focus() {}
    scrollToBottom() {}
    refresh() {}
    onData(_handler: (data: string) => void) {
      return { dispose: () => {} };
    }
    onResize(_handler: (data: { cols: number; rows: number }) => void) {
      return { dispose: () => {} };
    }
    get rows() {
      return 24;
    }
    get cols() {
      return 80;
    }
  },
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class MockFitAddon {
    loadAddon() {}
    fit() {}
  },
}));



Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
