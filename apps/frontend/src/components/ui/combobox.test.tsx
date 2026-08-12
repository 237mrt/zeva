import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Combobox } from './combobox';

const options = [
  { value: 'alpha', label: 'Alpha Tekstil' },
  { value: 'beta', label: 'Beta Konfeksiyon' },
];

describe('Combobox', () => {
  it('arama metnini bildirir ve klavyeyle müşteri seçer', () => {
    const onChange = vi.fn();
    const onSearchChange = vi.fn();
    render(<Combobox value="" options={options} onChange={onChange} onSearchChange={onSearchChange} ariaLabel="Müşteri" placeholder="Müşteri seçin veya arayın…" />);

    const input = screen.getByRole('combobox', { name: 'Müşteri' });
    fireEvent.change(input, { target: { value: 'Alp' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSearchChange).toHaveBeenCalledWith('Alp');
    expect(onChange).toHaveBeenCalledWith('alpha');
  });

  it('seçimi temizler ve dış tıklamayla sonuç listesini kapatır', () => {
    const onChange = vi.fn();
    render(<div><Combobox value="alpha" selectedLabel="Alpha Tekstil" options={options} onChange={onChange} onSearchChange={vi.fn()} ariaLabel="Müşteri" placeholder="Müşteri seçin veya arayın…" /><button type="button">Dış alan</button></div>);

    const input = screen.getByRole('combobox', { name: 'Müşteri' });
    fireEvent.focus(input);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Dış alan' }));
    expect(input.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Müşteri seçimini temizle' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('yükleniyor ve eşleşme bulunamadı durumlarını açıkça gösterir', () => {
    const props = { value: '', options: [], onChange: vi.fn(), onSearchChange: vi.fn(), ariaLabel: 'Müşteri', placeholder: 'Müşteri seçin veya arayın…' };
    const { rerender } = render(<Combobox {...props} loading loadingText="Müşteriler aranıyor…" />);
    fireEvent.focus(screen.getByRole('combobox', { name: 'Müşteri' }));
    expect(screen.getByText('Müşteriler aranıyor…')).toBeTruthy();

    rerender(<Combobox {...props} emptyText="Bu aramayla eşleşen müşteri bulunamadı." />);
    expect(screen.getByText('Bu aramayla eşleşen müşteri bulunamadı.')).toBeTruthy();
  });
});
