import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import type { AccountStatementPdfSource, DeliveryPdfSource, WorkOrderPdfSource } from '../reporting.types.js';

const regularFont = fileURLToPath(import.meta.resolve('@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff'));
const boldFont = fileURLToPath(import.meta.resolve('@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff'));
const statusLabels = { WAITING: 'Bekliyor', IN_PROGRESS: 'İşlemde', READY: 'Hazır', DELIVERED: 'Teslim Edildi', CLOSED: 'Kapalı', CANCELLED: 'İptal Edildi' } as const;
const typeLabels = { IRONING: 'Ütü', PACKAGING: 'Paketleme', IRONING_PACKAGING: 'Ütü + Paketleme', PRINTING: 'Baskı', OTHER: 'Diğer' } as const;
const packageLabels = { SACK: 'Çuval', BOX: 'Koli' } as const;
const statementLabels = { WORK_ORDER: 'İş Emri', PAYMENT: 'Tahsilat', ADJUSTMENT_DEBIT: 'Borç Düzeltmesi', ADJUSTMENT_CREDIT: 'Alacak / İndirim' } as const;

const date = (value: Date) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' }).format(value);
const integer = (value: number) => value.toLocaleString('tr-TR');
function displayMoney(value: string): string {
  const negative = value.startsWith('-'); const raw = negative ? value.slice(1) : value;
  const [whole = '0', fraction = '00'] = raw.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped},${fraction.padEnd(2, '0')} TL`;
}

export function sanitizePdfFilename(value: string): string {
  return value.normalize('NFKD').replace(/[ıİ]/g, 'i').replace(/[ğĞ]/g, 'g').replace(/[şŞ]/g, 's').replace(/[çÇ]/g, 'c').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 80) || 'belge';
}

function document(title: string) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 48, right: 48, bottom: 48, left: 48 }, info: { Title: title, Author: 'ZEVA' }, bufferPages: true });
  doc.registerFont('Noto', regularFont); doc.registerFont('Noto-Bold', boldFont); doc.font('Noto').fillColor('#202722');
  return doc;
}
function buffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => { const chunks: Buffer[] = []; doc.on('data', (chunk: Buffer) => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); doc.end(); });
}
function heading(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  doc.font('Noto-Bold').fontSize(22).fillColor('#17211a').text('ZEVA');
  doc.font('Noto-Bold').fontSize(16).fillColor('#33443a').text(title, { continued: false });
  if (subtitle) doc.font('Noto').fontSize(9).fillColor('#68736b').text(subtitle);
  doc.moveDown(0.8).strokeColor('#bdc8c0').lineWidth(1).moveTo(48, doc.y).lineTo(547, doc.y).stroke().moveDown(0.8);
}
function ensure(doc: PDFKit.PDFDocument, height: number) { if (doc.y + height > 790) doc.addPage(); }
function section(doc: PDFKit.PDFDocument, title: string) { ensure(doc, 40); doc.moveDown(0.5).font('Noto-Bold').fontSize(11).fillColor('#33443a').text(title); doc.moveDown(0.4); }
function pair(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width = 240) {
  doc.font('Noto').fontSize(8).fillColor('#77827a').text(label, x, y, { width });
  doc.font('Noto-Bold').fontSize(10).fillColor('#202722').text(value || '—', x, y + 12, { width });
}
function infoGrid(doc: PDFKit.PDFDocument, values: Array<[string, string]>) {
  const start = doc.y; values.forEach(([label, value], index) => pair(doc, label, value, 48 + (index % 2) * 258, start + Math.floor(index / 2) * 40));
  doc.y = start + Math.ceil(values.length / 2) * 40 + 5;
}
function row(doc: PDFKit.PDFDocument, columns: Array<{ text: string; width: number; align?: 'left' | 'right' }>, header = false) {
  ensure(doc, 28); const y = doc.y; let x = 48;
  if (header) doc.rect(48, y - 3, 499, 22).fill('#e8eee9');
  columns.forEach((column) => { doc.font(header ? 'Noto-Bold' : 'Noto').fontSize(header ? 8 : 8.5).fillColor('#273129').text(column.text, x + 4, y + 3, { width: column.width - 8, align: column.align ?? 'left', ellipsis: true, lineBreak: false }); x += column.width; });
  doc.y = y + 24; doc.strokeColor('#d8dfda').moveTo(48, doc.y - 3).lineTo(547, doc.y - 3).stroke();
}

export async function renderWorkOrderPdf(value: WorkOrderPdfSource): Promise<Buffer> {
  const doc = document(`İş Emri ${value.id}`); heading(doc, 'İş Emri', `Belge No: ${value.id}`);
  infoGrid(doc, [['Müşteri', value.customer.name], ['İş Emri No', value.id], ['Ürün / İş', value.productName], ['Hizmet Türü', typeLabels[value.type]], ['Durum', statusLabels[value.status]], ['Toplam Adet', `${integer(value.totalQuantity)} adet`], ['Birim Fiyat', displayMoney(value.unitPrice)], ['Toplam Tutar', displayMoney(value.totalAmount)], ['Alınma Tarihi', date(value.receivedAt)], ['Termin', value.dueAt ? date(value.dueAt) : '—']]);
  section(doc, 'Not'); doc.font('Noto').fontSize(9).fillColor('#343c36').text(value.notes ?? '—', { width: 499 });
  section(doc, 'Paketler');
  row(doc, [{ text: 'Paket', width: 250 }, { text: 'Adet', width: 130, align: 'right' }, { text: 'Durum', width: 119, align: 'right' }], true);
  value.packages.forEach((item) => row(doc, [{ text: `${packageLabels[item.type]} #${item.sequenceNo}`, width: 250 }, { text: `${integer(item.quantity)} adet`, width: 130, align: 'right' }, { text: item.delivered ? 'Teslim edildi' : 'Bekliyor', width: 119, align: 'right' }]));
  if (!value.packages.length) doc.font('Noto').fontSize(9).fillColor('#68736b').text('Henüz paket kaydı yok.');
  const packaged = value.packages.reduce((sum, item) => sum + item.quantity, 0); const delivered = value.packages.filter((item) => item.delivered).reduce((sum, item) => sum + item.quantity, 0);
  section(doc, 'Özet'); infoGrid(doc, [['Paketlenen', `${integer(packaged)} adet`], ['Teslim Edilen', `${integer(delivered)} adet`], ['Kalan', `${integer(Math.max(0, value.totalQuantity - delivered))} adet`]]);
  return buffer(doc);
}

export async function renderDeliveryPdf(value: DeliveryPdfSource): Promise<Buffer> {
  const doc = document(`Teslimat ${value.id}`); heading(doc, 'Teslimat Listesi', `Belge No: ${value.id}`);
  if (value.cancelledAt) { doc.font('Noto-Bold').fontSize(17).fillColor('#9f2f2f').text('İPTAL EDİLMİŞ TESLİMAT', { align: 'center' }).moveDown(0.6); }
  infoGrid(doc, [['Müşteri', value.customer.name], ['Teslim Tarihi', date(value.deliveredAt)], ['Teslim Alan', value.receiverName ?? '—'], ['Durum', value.cancelledAt ? `İptal · ${date(value.cancelledAt)}` : 'Tamamlandı']]);
  section(doc, 'Not'); doc.font('Noto').fontSize(9).fillColor('#343c36').text(value.notes ?? '—', { width: 499 });
  const groups = new Map<string, typeof value.packages>(); value.packages.forEach((item) => groups.set(item.workOrderId, [...(groups.get(item.workOrderId) ?? []), item]));
  for (const packages of groups.values()) { const first = packages[0]!; section(doc, first.productName); packages.forEach((item) => row(doc, [{ text: `${packageLabels[item.type]} #${item.sequenceNo}`, width: 300 }, { text: `${integer(item.quantity)} adet`, width: 199, align: 'right' }])); doc.font('Noto-Bold').fontSize(9).fillColor('#33443a').text(`Toplam: ${integer(packages.reduce((sum, item) => sum + item.quantity, 0))} adet`, { align: 'right' }); }
  section(doc, 'Genel Toplam'); doc.font('Noto-Bold').fontSize(12).fillColor('#202722').text(`${integer(value.packages.length)} paket · ${integer(value.packages.reduce((sum, item) => sum + item.quantity, 0))} adet`);
  return buffer(doc);
}

export async function renderAccountStatementPdf(value: AccountStatementPdfSource & { balance: string; rangeLabel: string }): Promise<Buffer> {
  const doc = document(`Cari Hesap Ekstresi ${value.customer.name}`); heading(doc, 'Cari Hesap Ekstresi', `Oluşturulma: ${date(new Date())}`);
  infoGrid(doc, [['Müşteri', value.customer.name], ['Tarih Aralığı', value.rangeLabel], ['İş Tutarı', displayMoney(value.workOrderTotal)], ['Borç Düzeltmeleri', displayMoney(value.debitAdjustments)], ['Tahsilatlar', displayMoney(value.paymentsTotal)], ['Alacak / İndirim', displayMoney(value.creditAdjustments)], ['Cari Bakiye', displayMoney(value.balance)]]);
  section(doc, 'Hareketler'); row(doc, [{ text: 'Tarih', width: 90 }, { text: 'İşlem', width: 105 }, { text: 'Açıklama', width: 154 }, { text: 'Borç', width: 75, align: 'right' }, { text: 'Alacak', width: 75, align: 'right' }], true);
  value.items.forEach((item) => { const credit = item.type === 'PAYMENT' || item.type === 'ADJUSTMENT_CREDIT'; const inactive = item.cancelledAt ? ' (İptal)' : ''; row(doc, [{ text: date(item.occurredAt), width: 90 }, { text: statementLabels[item.type], width: 105 }, { text: `${item.description}${inactive}`, width: 154 }, { text: credit ? '—' : displayMoney(item.amount), width: 75, align: 'right' }, { text: credit ? displayMoney(item.amount) : '—', width: 75, align: 'right' }]); });
  if (!value.items.length) doc.font('Noto').fontSize(9).fillColor('#68736b').text('Seçilen dönemde hareket yok.');
  if (value.truncated) { ensure(doc, 35); doc.moveDown().font('Noto').fontSize(8).fillColor('#9a651e').text('Güvenlik sınırı nedeniyle yalnızca ilk 5.000 hareket gösterildi.'); }
  return buffer(doc);
}
