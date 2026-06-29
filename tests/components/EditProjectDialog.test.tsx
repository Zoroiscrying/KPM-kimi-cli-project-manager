import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditProjectDialog } from '../../src/components/EditProjectDialog';

const project = {
  id: '1',
  name: 'web-app',
  path: '/tmp/web-app',
  description: 'Frontend',
  createdAt: '2026-06-29T00:00:00Z',
  updatedAt: '2026-06-29T00:00:00Z',
};

describe('EditProjectDialog', () => {
  it('prefills project data', () => {
    render(<EditProjectDialog project={project} isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByDisplayValue('web-app')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/tmp/web-app')).toBeInTheDocument();
  });

  it('calls onSave with updated project', () => {
    const onSave = vi.fn();
    render(<EditProjectDialog project={project} isOpen={true} onClose={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByDisplayValue('web-app'), { target: { value: 'web-app-v2' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'web-app-v2' }));
  });

  it('renders nothing when closed', () => {
    const { container } = render(<EditProjectDialog project={project} isOpen={false} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
