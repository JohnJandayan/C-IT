import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Monaco loads from a CDN at runtime; replace it with a plain textarea in tests.
vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value?: string }) => <textarea data-testid="editor" defaultValue={value} />,
}));

import App from '@/App';

describe('App', () => {
  it('renders the main layout', () => {
    render(<App />);
    expect(screen.getByText('C-It')).toBeInTheDocument();
    expect(screen.getByTestId('editor')).toBeInTheDocument();
  });
});
