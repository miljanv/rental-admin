import { render, screen } from '@testing-library/react';
import { FileIcon } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(
      <EmptyState
        icon={FileIcon}
        title="No files yet"
        description="Drag a file into the upload area above to get started."
      />,
    );

    expect(screen.getByText('No files yet')).toBeInTheDocument();
    expect(
      screen.getByText('Drag a file into the upload area above to get started.'),
    ).toBeInTheDocument();
  });

  it('renders the action when one is provided', () => {
    render(
      <EmptyState
        icon={FileIcon}
        title="No files yet"
        description="Upload your first file."
        action={<button type="button">Choose a file</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Choose a file' })).toBeInTheDocument();
  });

  it('omits the action area when no action is given', () => {
    render(<EmptyState icon={FileIcon} title="No files yet" description="Nothing here." />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
