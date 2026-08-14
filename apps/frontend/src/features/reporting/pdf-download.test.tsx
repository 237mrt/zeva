import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastContext, type ToastContextValue } from '../../contexts/toast-context';
import { saveBlob } from '../../lib/file-download';
import { reportingApi } from './reporting.api';
import { usePdfDownload } from './use-pdf-download';

vi.mock('../../lib/file-download', () => ({ saveBlob: vi.fn() }));
vi.mock('./reporting.api', () => ({ reportingApi: { workOrderPdf: vi.fn(), deliveryPdf: vi.fn(), accountPdf: vi.fn(), activeWorkOrdersPdf: vi.fn() } }));
const toast: ToastContextValue = { show: vi.fn(() => 'id'), success: vi.fn(() => 'id'), error: vi.fn(() => 'id'), warning: vi.fn(() => 'id'), info: vi.fn(() => 'id'), dismiss: vi.fn() };
const result = (filename: string) => Promise.resolve({ blob: new Blob(['%PDF']), filename });
function Providers({ children }: PropsWithChildren) { return <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>; }
function Harness() {
  const pdf = usePdfDownload();
  return <div><button disabled={pdf.pendingKey === 'work'} onClick={() => void pdf.download('work', () => reportingApi.workOrderPdf('work'))}>İş Emri PDF İndir</button><button disabled={pdf.pendingKey === 'delivery'} onClick={() => void pdf.download('delivery', () => reportingApi.deliveryPdf('delivery'))}>Teslimat Listesini İndir</button><button disabled={pdf.pendingKey === 'account'} onClick={() => void pdf.download('account', () => reportingApi.accountPdf('account'))}>Cari Ekstre İndir</button><button disabled={pdf.pendingKey === 'active-wo'} onClick={() => void pdf.download('active-wo', () => reportingApi.activeWorkOrdersPdf('customer-1'))}>Eldeki İşleri İndir</button></div>;
}

describe('PDF download UX', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(reportingApi.workOrderPdf).mockImplementation(() => result('is-emri.pdf')); vi.mocked(reportingApi.deliveryPdf).mockImplementation(() => result('teslimat.pdf')); vi.mocked(reportingApi.accountPdf).mockImplementation(() => result('ekstre.pdf')); vi.mocked(reportingApi.activeWorkOrdersPdf).mockImplementation(() => result('eldeki-isler.pdf')); });

  it('iş emri, teslimat, cari ekstre ve eldeki işler Blob dosyalarını cookie uyumlu API üzerinden indirir', async () => {
    render(<Harness />, { wrapper: Providers }); fireEvent.click(screen.getByRole('button', { name: 'İş Emri PDF İndir' })); fireEvent.click(screen.getByRole('button', { name: 'Teslimat Listesini İndir' })); fireEvent.click(screen.getByRole('button', { name: 'Cari Ekstre İndir' })); fireEvent.click(screen.getByRole('button', { name: 'Eldeki İşleri İndir' }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(4)); expect(reportingApi.workOrderPdf).toHaveBeenCalledWith('work'); expect(reportingApi.deliveryPdf).toHaveBeenCalledWith('delivery'); expect(reportingApi.accountPdf).toHaveBeenCalledWith('account'); expect(reportingApi.activeWorkOrdersPdf).toHaveBeenCalledWith('customer-1'); expect(toast.success).toHaveBeenCalledWith('PDF hazırlandı', 'Dosya indirildi.');
  });

  it('PDF hazırlanırken ilgili aksiyonu loading/disabled durumuna alır', async () => {
    let resolve!: (value: { blob: Blob; filename: string }) => void; vi.mocked(reportingApi.workOrderPdf).mockReturnValue(new Promise((done) => { resolve = done; })); render(<Harness />, { wrapper: Providers }); const button = screen.getByRole('button', { name: 'İş Emri PDF İndir' }); fireEvent.click(button); await waitFor(() => expect(button.hasAttribute('disabled')).toBe(true)); resolve({ blob: new Blob(['%PDF']), filename: 'is-emri.pdf' }); await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
  });

  it('PDF hatasında kullanıcıya profesyonel Türkçe hata bildirimi gösterir', async () => {
    vi.mocked(reportingApi.deliveryPdf).mockRejectedValueOnce(new Error('network')); render(<Harness />, { wrapper: Providers }); fireEvent.click(screen.getByRole('button', { name: 'Teslimat Listesini İndir' })); await waitFor(() => expect(toast.error).toHaveBeenCalledWith('PDF oluşturulamadı', 'Lütfen tekrar deneyin.')); expect(saveBlob).not.toHaveBeenCalled();
  });
});
