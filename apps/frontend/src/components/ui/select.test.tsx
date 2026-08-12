import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Select } from './select';

const options = [
  { value: 'WAITING', label: 'Bekliyor' },
  { value: 'READY', label: 'Hazır' },
  { value: 'CANCELLED', label: 'İptal' },
] as const;

describe('Select', () => {
  it('klavyeyle seçenek değiştirir ve seçili değeri bildirir', () => {
    const onChange = vi.fn();
    render(<Select value="WAITING" options={[...options]} onChange={onChange} ariaLabel="Durum" />);

    const trigger = screen.getByRole('button', { name: 'Durum' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('READY');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape ile yalnızca seçenek listesini kapatır', () => {
    render(<Select value="WAITING" options={[...options]} onChange={vi.fn()} ariaLabel="Durum" />);
    const trigger = screen.getByRole('button', { name: 'Durum' });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
