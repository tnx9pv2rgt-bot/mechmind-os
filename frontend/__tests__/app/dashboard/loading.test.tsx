import React from 'react';
import { render } from '@testing-library/react';

import Loading from '@/app/dashboard/loading';

describe('DashboardLoading', () => {
  it('renderizza il componente senza crash', () => {
    const { container } = render(<Loading />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('ha classe animate-pulse per skeleton loading', () => {
    const { container } = render(<Loading />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('animate-pulse');
  });

  it('ha classe flex nel wrapper principale', () => {
    const { container } = render(<Loading />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('flex');
  });

  it('contiene elementi skeleton per i KPI', () => {
    const { container } = render(<Loading />);
    const skeletons = container.querySelectorAll('.rounded-lg, .rounded');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });
});
