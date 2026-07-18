import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App';

const mockInvoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_state') {
        return Promise.resolve({
          version: 1,
          projects: [],
          sessions: [],
          settings: { theme: 'dark' },
        });
      }
      return Promise.resolve();
    });
  });

  it('renders import from Kimi button', async () => {
    render(<App />);
    expect(await screen.findByText('Import from Kimi')).toBeInTheDocument();
  });

  it('adds a project, opens a tab, and closes the tab', async () => {
    render(<App />);

    // Open add-project dialog
    fireEvent.click(screen.getByRole('button', { name: 'Add Project' }));
    expect(await screen.findByRole('heading', { name: 'Add Project' })).toBeInTheDocument();

    // Fill in project details
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Demo' },
    });
    fireEvent.change(screen.getByLabelText('Path'), {
      target: { value: '/tmp/demo' },
    });

    // Submit the form
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_state') {
        return Promise.resolve({
          version: 1,
          projects: [{ id: 'demo-1', name: 'Demo', path: '/tmp/demo' }],
          sessions: [],
          settings: { theme: 'dark' },
        });
      }
      if (cmd === 'add_project') {
        return Promise.resolve({
          version: 1,
          projects: [{ id: 'demo-1', name: 'Demo', path: '/tmp/demo' }],
          sessions: [],
          settings: { theme: 'dark' },
        });
      }
      if (cmd === 'is_terminal_running') {
        return Promise.resolve(true);
      }
      if (cmd === 'stop_terminal') {
        return Promise.resolve();
      }
      return Promise.resolve();
    });

    fireEvent.click(screen.getByText('Add'));

    // The new project should appear in the list
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Demo' })).toBeInTheDocument();
    });

    // Clicking the project opens a tab
    fireEvent.click(screen.getByRole('button', { name: 'Demo' }));

    // Close tab button should be present once the tab is open
    const closeButton = await screen.findByLabelText('Close tab');
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);

    // Tab should disappear
    await waitFor(() => {
      expect(screen.queryByLabelText('Close tab')).not.toBeInTheDocument();
    });
  });
});
