import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('Türkçe başlık ve açıklamayı gösterir', () => {
    render(
      <EmptyState
        title="Henüz kayıt yok"
        description="İlk kayıt oluşturulduğunda burada görüntülenecek."
      />,
    );

    expect(screen.getByRole('heading', { name: 'Henüz kayıt yok' })).toBeTruthy();
    expect(screen.getByText('İlk kayıt oluşturulduğunda burada görüntülenecek.')).toBeTruthy();
  });
});
