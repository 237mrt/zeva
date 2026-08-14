import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import type {
  AccountStatementPdfSource,
  CustomerActiveWorkOrdersPdfSource,
  DeliveryPdfSource,
  WorkOrderPdfSource,
} from '../reporting.types.js';

function resolveFontPath(filename: string): string {
  try {
    const primary = fileURLToPath(import.meta.resolve(`../../../assets/fonts/${filename}`));
    if (fs.existsSync(primary)) {
      return primary;
    }
  } catch {
    // Fallback if import.meta.resolve fails in non-standard ESM environments
  }
  const candidates = [
    path.resolve(process.cwd(), 'src/assets/fonts', filename),
    path.resolve(process.cwd(), 'apps/backend/src/assets/fonts', filename),
    path.resolve(process.cwd(), 'dist/assets/fonts', filename),
    path.resolve(process.cwd(), 'apps/backend/dist/assets/fonts', filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return fileURLToPath(import.meta.resolve(`../../../assets/fonts/${filename}`));
}

const regularFont = resolveFontPath('NotoSans-Regular.ttf');
const boldFont = resolveFontPath('NotoSans-Bold.ttf');

const statusLabels: Record<string, string> = {
  WAITING: 'Bekliyor',
  IN_PROGRESS: 'İşlemde',
  READY: 'Hazır',
  DELIVERED: 'Teslim Edildi',
  CLOSED: 'Kapalı',
  CANCELLED: 'İptal Edildi',
};

const typeLabels: Record<string, string> = {
  IRONING: 'Ütü',
  PACKAGING: 'Paketleme',
  IRONING_PACKAGING: 'Ütü + Paketleme',
  PRINTING: 'Baskı',
  OTHER: 'Diğer',
};

const packageLabels: Record<string, string> = {
  SACK: 'Çuval',
  BOX: 'Koli',
};

const statementLabels: Record<string, string> = {
  WORK_ORDER: 'İş Emri',
  PAYMENT: 'Tahsilat',
  ADJUSTMENT_DEBIT: 'Borç Düzeltmesi',
  ADJUSTMENT_CREDIT: 'Alacak / İndirim',
};

// Turkish formatting helpers
export const formatDateTime = (value: Date) =>
  new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(value);

export const formatDate = (value: Date) =>
  new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeZone: 'Europe/Istanbul',
  }).format(value);

export const integer = (value: number) => value.toLocaleString('tr-TR');

export function displayMoney(value: string): string {
  const negative = value.startsWith('-');
  const raw = negative ? value.slice(1) : value;
  const [whole = '0', fraction = '00'] = raw.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped},${fraction.padEnd(2, '0')} TL`;
}

export function sanitizePdfFilename(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[ıİ]/g, 'i')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[şŞ]/g, 's')
      .replace(/[çÇ]/g, 'c')
      .replace(/[öÖ]/g, 'o')
      .replace(/[üÜ]/g, 'u')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 80) || 'belge'
  );
}

// Layout constants (A4 is 595.28 x 841.89 pt)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 40;
const MARGIN_RIGHT = 40;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 45;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 515.28 pt
const SAFE_BOTTOM = PAGE_HEIGHT - MARGIN_BOTTOM - 25; // 771.89 pt

// Color palette
const COLORS = {
  brandText: '#1f382b',
  brandTextDark: '#14251d',
  brandAccent: '#284937',
  textPrimary: '#1a241e',
  textSecondary: '#5a6860',
  textMuted: '#7c8a82',
  tableHeaderBg: '#edf3ef',
  tableHeaderBorder: '#c2d0c6',
  tableRowBorder: '#e2e8e4',
  tableRowStripe: '#fbfdfb',
  cardBg: '#f6f9f7',
  cardBorder: '#dce5df',
  divider: '#cad6ce',
  badgeGreenText: '#1b432e',
  badgeGreenBg: '#e6f3eb',
  badgeRedText: '#9b2c2c',
  badgeRedBg: '#fdf2f2',
  badgeRedBorder: '#f5c6c6',
};

function createDocument(title: string) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN_TOP, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT },
    info: { Title: title, Author: 'ZEVA Tekstil' },
    bufferPages: true,
  });

  doc.registerFont('Noto', regularFont);
  doc.registerFont('Noto-Bold', boldFont);
  doc.font('Noto').fillColor(COLORS.textPrimary);
  return doc;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number, onNewPage?: () => void) {
  if (doc.y + height > SAFE_BOTTOM) {
    doc.addPage();
    doc.y = MARGIN_TOP;
    if (onNewPage) {
      onNewPage();
    }
  }
}

function renderHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  options?: {
    subtitle?: string;
    referenceNo?: string;
    isCancelled?: boolean;
    cancelledText?: string;
  },
) {
  const startY = doc.y;

  // Left Brand Block
  doc.font('Noto-Bold').fontSize(20).fillColor(COLORS.brandText).text('ZEVA', MARGIN_LEFT, startY, {
    continued: false,
  });
  doc.font('Noto').fontSize(8).fillColor(COLORS.textSecondary).text('Tekstil Atölye Yönetim Sistemi', MARGIN_LEFT, startY + 23);

  // Right Title Block
  const rightWidth = 260;
  const rightX = MARGIN_LEFT + CONTENT_WIDTH - rightWidth;
  doc
    .font('Noto-Bold')
    .fontSize(14)
    .fillColor(COLORS.brandText)
    .text(title.toUpperCase(), rightX, startY, { width: rightWidth, align: 'right' });

  let rightSubY = startY + 18;
  if (options?.referenceNo) {
    doc
      .font('Noto-Bold')
      .fontSize(8.5)
      .fillColor(COLORS.textPrimary)
      .text(options.referenceNo, rightX, rightSubY, { width: rightWidth, align: 'right' });
    rightSubY += 12;
  }
  if (options?.subtitle) {
    doc
      .font('Noto')
      .fontSize(8)
      .fillColor(COLORS.textSecondary)
      .text(options.subtitle, rightX, rightSubY, { width: rightWidth, align: 'right' });
  }

  const headerBottomY = Math.max(startY + 36, rightSubY + 14);
  doc.y = headerBottomY;

  // Cancelled Banner if applicable
  if (options?.isCancelled) {
    const bannerY = doc.y + 4;
    const bannerHeight = 24;
    doc
      .roundedRect(MARGIN_LEFT, bannerY, CONTENT_WIDTH, bannerHeight, 3)
      .fillAndStroke(COLORS.badgeRedBg, COLORS.badgeRedBorder);
    doc
      .font('Noto-Bold')
      .fontSize(9.5)
      .fillColor(COLORS.badgeRedText)
      .text(options.cancelledText ?? 'İPTAL EDİLMİŞTİR', MARGIN_LEFT, bannerY + 6, {
        width: CONTENT_WIDTH,
        align: 'center',
      });
    doc.y = bannerY + bannerHeight + 6;
  }

  // Divider line
  doc
    .strokeColor(COLORS.divider)
    .lineWidth(1)
    .moveTo(MARGIN_LEFT, doc.y + 4)
    .lineTo(MARGIN_LEFT + CONTENT_WIDTH, doc.y + 4)
    .stroke();

  doc.y += 12;
}

interface InfoField {
  label: string;
  value: string;
  fullWidth?: boolean;
  highlight?: boolean;
}

function renderInfoGrid(doc: PDFKit.PDFDocument, fields: InfoField[]) {
  const colGap = 16;
  const colWidth = (CONTENT_WIDTH - colGap) / 2;

  let index = 0;
  while (index < fields.length) {
    const field1 = fields[index]!;
    if (field1.fullWidth) {
      // Calculate full-width field height
      doc.font('Noto-Bold').fontSize(9);
      const valHeight = doc.heightOfString(field1.value || '—', { width: CONTENT_WIDTH - 12 });
      const rowHeight = Math.max(34, 14 + valHeight + 6);
      ensureSpace(doc, rowHeight);

      const y = doc.y;
      doc.font('Noto').fontSize(7.5).fillColor(COLORS.textSecondary).text(field1.label.toUpperCase(), MARGIN_LEFT, y);
      doc
        .font(field1.highlight ? 'Noto-Bold' : 'Noto')
        .fontSize(9)
        .fillColor(field1.highlight ? COLORS.brandAccent : COLORS.textPrimary)
        .text(field1.value || '—', MARGIN_LEFT, y + 11, { width: CONTENT_WIDTH });

      doc.y = y + rowHeight;
      index += 1;
    } else {
      const field2 = fields[index + 1] && !fields[index + 1]?.fullWidth ? fields[index + 1] : null;

      doc.font('Noto-Bold').fontSize(9);
      const h1 = doc.heightOfString(field1.value || '—', { width: colWidth });
      const h2 = field2 ? doc.heightOfString(field2.value || '—', { width: colWidth }) : 0;
      const maxValHeight = Math.max(h1, h2);
      const rowHeight = Math.max(32, 13 + maxValHeight + 5);
      ensureSpace(doc, rowHeight);

      const y = doc.y;

      // Col 1
      doc.font('Noto').fontSize(7.5).fillColor(COLORS.textSecondary).text(field1.label.toUpperCase(), MARGIN_LEFT, y);
      doc
        .font(field1.highlight ? 'Noto-Bold' : 'Noto')
        .fontSize(9)
        .fillColor(field1.highlight ? COLORS.brandAccent : COLORS.textPrimary)
        .text(field1.value || '—', MARGIN_LEFT, y + 11, { width: colWidth });

      // Col 2
      if (field2) {
        const x2 = MARGIN_LEFT + colWidth + colGap;
        doc.font('Noto').fontSize(7.5).fillColor(COLORS.textSecondary).text(field2.label.toUpperCase(), x2, y);
        doc
          .font(field2.highlight ? 'Noto-Bold' : 'Noto')
          .fontSize(9)
          .fillColor(field2.highlight ? COLORS.brandAccent : COLORS.textPrimary)
          .text(field2.value || '—', x2, y + 11, { width: colWidth });
      }

      doc.y = y + rowHeight;
      index += field2 ? 2 : 1;
    }
  }
}

function renderSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 26);
  doc.y += 6;
  doc.font('Noto-Bold').fontSize(10).fillColor(COLORS.brandText).text(title, MARGIN_LEFT, doc.y);
  doc.y += 4;
}

function renderNotes(doc: PDFKit.PDFDocument, notes: string | null) {
  if (!notes || notes.trim() === '') return;
  renderSectionTitle(doc, 'Notlar');

  doc.font('Noto').fontSize(8.5);
  const textHeight = doc.heightOfString(notes, { width: CONTENT_WIDTH - 16 });
  const boxHeight = textHeight + 14;
  ensureSpace(doc, boxHeight + 4);

  const boxY = doc.y;
  doc.roundedRect(MARGIN_LEFT, boxY, CONTENT_WIDTH, boxHeight, 3).fillAndStroke(COLORS.cardBg, COLORS.cardBorder);
  doc.font('Noto').fontSize(8.5).fillColor(COLORS.textPrimary).text(notes, MARGIN_LEFT + 8, boxY + 7, {
    width: CONTENT_WIDTH - 16,
  });

  doc.y = boxY + boxHeight + 6;
}

interface ColumnDef<T> {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  bold?: boolean;
  color?: string | ((item: T, index: number) => string);
  render: (item: T, index: number) => string;
}

function renderTable<T>(
  doc: PDFKit.PDFDocument,
  options: {
    columns: ColumnDef<T>[];
    items: T[];
    emptyText?: string;
  },
) {
  const { columns, items, emptyText = 'Kayıt bulunamadı.' } = options;

  const renderTableHeader = () => {
    const headerHeight = 20;
    const y = doc.y;
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, headerHeight).fillAndStroke(COLORS.tableHeaderBg, COLORS.tableHeaderBorder);

    let x = MARGIN_LEFT;
    columns.forEach((col) => {
      doc
        .font('Noto-Bold')
        .fontSize(7.5)
        .fillColor(COLORS.brandText)
        .text(col.header.toUpperCase(), x + 5, y + 5, {
          width: col.width - 10,
          align: col.align ?? 'left',
        });
      x += col.width;
    });

    doc.y = y + headerHeight;
  };

  ensureSpace(doc, 35);
  renderTableHeader();

  if (items.length === 0) {
    ensureSpace(doc, 25);
    const y = doc.y;
    doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 24).fillAndStroke('#ffffff', COLORS.tableRowBorder);
    doc.font('Noto').fontSize(8.5).fillColor(COLORS.textMuted).text(emptyText, MARGIN_LEFT + 10, y + 7, {
      width: CONTENT_WIDTH - 20,
      align: 'center',
    });
    doc.y = y + 24;
    return;
  }

  items.forEach((item, rowIndex) => {
    // Determine dynamic row height based on content
    doc.font('Noto').fontSize(8.5);
    let maxCellHeight = 12;
    columns.forEach((col) => {
      const text = col.render(item, rowIndex);
      const cellHeight = doc.heightOfString(text, { width: col.width - 10 });
      if (cellHeight > maxCellHeight) maxCellHeight = cellHeight;
    });

    const rowHeight = Math.max(18, maxCellHeight + 8);

    ensureSpace(doc, rowHeight + 2, () => {
      renderTableHeader();
    });

    const y = doc.y;
    const isEven = rowIndex % 2 === 1;

    // Row Background & border
    doc
      .rect(MARGIN_LEFT, y, CONTENT_WIDTH, rowHeight)
      .fillAndStroke(isEven ? COLORS.tableRowStripe : '#ffffff', COLORS.tableRowBorder);

    let x = MARGIN_LEFT;
    columns.forEach((col) => {
      const text = col.render(item, rowIndex);
      const cellColor = typeof col.color === 'function' ? col.color(item, rowIndex) : (col.color ?? COLORS.textPrimary);
      doc
        .font(col.bold ? 'Noto-Bold' : 'Noto')
        .fontSize(8.5)
        .fillColor(cellColor)
        .text(text, x + 5, y + 4, {
          width: col.width - 10,
          align: col.align ?? 'left',
        });
      x += col.width;
    });

    doc.y = y + rowHeight;
  });
}

interface SummaryCardItem {
  label: string;
  value: string;
  highlight?: boolean;
}

function renderSummaryCards(doc: PDFKit.PDFDocument, title: string, cards: SummaryCardItem[], columns = 3) {
  renderSectionTitle(doc, title);

  const cardGap = 8;
  const cardWidth = (CONTENT_WIDTH - (columns - 1) * cardGap) / columns;
  const rows = Math.ceil(cards.length / columns);
  const cardHeight = 38;
  const totalBlockHeight = rows * cardHeight + (rows - 1) * cardGap;

  ensureSpace(doc, totalBlockHeight + 6);

  const startY = doc.y;

  cards.forEach((card, index) => {
    const colIndex = index % columns;
    const rowIndex = Math.floor(index / columns);

    const x = MARGIN_LEFT + colIndex * (cardWidth + cardGap);
    const y = startY + rowIndex * (cardHeight + cardGap);

    doc
      .roundedRect(x, y, cardWidth, cardHeight, 3)
      .fillAndStroke(card.highlight ? '#edf5f0' : COLORS.cardBg, card.highlight ? '#b5cebd' : COLORS.cardBorder);

    doc.font('Noto').fontSize(7).fillColor(COLORS.textSecondary).text(card.label.toUpperCase(), x + 6, y + 5, {
      width: cardWidth - 12,
    });

    doc
      .font('Noto-Bold')
      .fontSize(9.5)
      .fillColor(card.highlight ? COLORS.brandAccent : COLORS.textPrimary)
      .text(card.value, x + 6, y + 18, {
        width: cardWidth - 12,
      });
  });

  doc.y = startY + totalBlockHeight + 6;
}

function finalizeDocument(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const range = doc.bufferedPageRange();
  const totalPages = range.count;

  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);

    // Subtle Footer line
    const footerY = PAGE_HEIGHT - MARGIN_BOTTOM + 8;
    doc
      .strokeColor(COLORS.divider)
      .lineWidth(0.75)
      .moveTo(MARGIN_LEFT, footerY)
      .lineTo(MARGIN_LEFT + CONTENT_WIDTH, footerY)
      .stroke();

    doc
      .font('Noto')
      .fontSize(7.5)
      .fillColor(COLORS.textMuted)
      .text('ZEVA Tekstil Yönetim Sistemi', MARGIN_LEFT, footerY + 5);

    doc
      .font('Noto')
      .fontSize(7.5)
      .fillColor(COLORS.textMuted)
      .text(`Sayfa ${i + 1} / ${totalPages}`, MARGIN_LEFT + CONTENT_WIDTH - 120, footerY + 5, {
        width: 120,
        align: 'right',
      });
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// -------------------------------------------------------------
// 1. Work Order PDF Renderer
// -------------------------------------------------------------
export async function renderWorkOrderPdf(value: WorkOrderPdfSource): Promise<Buffer> {
  const doc = createDocument(`İş Emri ${value.id}`);

  renderHeader(doc, 'İş Emri', {
    referenceNo: `İş Emri No: ${value.id}`,
    subtitle: `Düzenlenme: ${formatDate(new Date())}`,
  });

  renderInfoGrid(doc, [
    { label: 'Müşteri', value: value.customer.name },
    { label: 'Hizmet Türü', value: typeLabels[value.type] ?? value.type },
    { label: 'Ürün / İş Adı', value: value.productName, fullWidth: true },
    { label: 'Durum', value: statusLabels[value.status] ?? value.status, highlight: true },
    { label: 'Toplam Adet', value: `${integer(value.totalQuantity)} adet` },
    { label: 'Birim Fiyat', value: displayMoney(value.unitPrice) },
    { label: 'Toplam Tutar', value: displayMoney(value.totalAmount), highlight: true },
    { label: 'Alınma Tarihi', value: formatDateTime(value.receivedAt) },
    { label: 'Termin Tarihi', value: value.dueAt ? formatDateTime(value.dueAt) : '—' },
  ]);

  renderNotes(doc, value.notes);

  renderSectionTitle(doc, 'Paketler');
  renderTable<WorkOrderPdfSource['packages'][number]>(doc, {
    columns: [
      {
        header: 'Paket No',
        width: 140,
        bold: true,
        render: (item) => `${packageLabels[item.type] ?? item.type} #${item.sequenceNo}`,
      },
      {
        header: 'Paket Türü',
        width: 120,
        render: (item) => packageLabels[item.type] ?? item.type,
      },
      {
        header: 'Adet',
        width: 120,
        align: 'right',
        bold: true,
        render: (item) => `${integer(item.quantity)} adet`,
      },
      {
        header: 'Teslim Durumu',
        width: 135.28,
        align: 'right',
        color: (item) => (item.delivered ? COLORS.badgeGreenText : COLORS.textSecondary),
        render: (item) => (item.delivered ? 'Teslim Edildi' : 'Atölyede (Bekliyor)'),
      },
    ],
    items: value.packages,
    emptyText: 'Bu iş emrine ait henüz paket kaydı bulunmamaktadır.',
  });

  const packagedQuantity = value.packages.reduce((sum, item) => sum + item.quantity, 0);
  const deliveredQuantity = value.packages
    .filter((item) => item.delivered)
    .reduce((sum, item) => sum + item.quantity, 0);
  const remainingQuantity = Math.max(0, value.totalQuantity - deliveredQuantity);

  renderSummaryCards(
    doc,
    'Özet Bilgiler',
    [
      { label: 'Toplam Sipariş', value: `${integer(value.totalQuantity)} adet` },
      { label: 'Paketlenen Miktar', value: `${integer(packagedQuantity)} adet` },
      { label: 'Teslim Edilen', value: `${integer(deliveredQuantity)} adet` },
      { label: 'Atölyede Kalan', value: `${integer(remainingQuantity)} adet`, highlight: true },
      { label: 'Toplam Paket', value: `${integer(value.packages.length)} paket` },
      { label: 'Toplam Tutar', value: displayMoney(value.totalAmount) },
    ],
    3,
  );

  return finalizeDocument(doc);
}

// -------------------------------------------------------------
// 2. Delivery PDF Renderer
// -------------------------------------------------------------
export async function renderDeliveryPdf(value: DeliveryPdfSource): Promise<Buffer> {
  const doc = createDocument(`Teslimat ${value.id}`);

  renderHeader(doc, 'Teslimat Listesi', {
    referenceNo: `Teslimat No: ${value.id}`,
    subtitle: `Teslim Tarihi: ${formatDateTime(value.deliveredAt)}`,
    isCancelled: Boolean(value.cancelledAt),
    cancelledText: `İPTAL EDİLMİŞ TESLİMAT · İptal Tarihi: ${value.cancelledAt ? formatDateTime(value.cancelledAt) : ''}`,
  });

  renderInfoGrid(doc, [
    { label: 'Müşteri', value: value.customer.name },
    { label: 'Teslim Alan', value: value.receiverName ?? '—' },
    { label: 'Teslim Tarihi', value: formatDateTime(value.deliveredAt) },
    {
      label: 'Durum',
      value: value.cancelledAt ? 'İptal Edildi' : 'Tamamlandı',
      highlight: !value.cancelledAt,
    },
  ]);

  renderNotes(doc, value.notes);

  renderSectionTitle(doc, 'Teslim Edilen Paketler');
  renderTable(doc, {
    columns: [
      {
        header: 'İş Emri / Ürün',
        width: 215.28,
        bold: true,
        render: (item) => item.productName,
      },
      {
        header: 'Paket',
        width: 140,
        render: (item) => `${packageLabels[item.type] ?? item.type} #${item.sequenceNo}`,
      },
      {
        header: 'Teslim Miktarı',
        width: 160,
        align: 'right',
        bold: true,
        render: (item) => `${integer(item.quantity)} adet`,
      },
    ],
    items: value.packages,
    emptyText: 'Teslimat içeriğinde paket bulunamadı.',
  });

  const totalDeliveredQuantity = value.packages.reduce((sum, item) => sum + item.quantity, 0);
  const sackCount = value.packages.filter((item) => item.type === 'SACK').length;
  const boxCount = value.packages.filter((item) => item.type === 'BOX').length;

  renderSummaryCards(
    doc,
    'Teslimat Özeti',
    [
      { label: 'Toplam Paket', value: `${integer(value.packages.length)} paket` },
      { label: 'Çuval / Koli', value: `${integer(sackCount)} Çuval / ${integer(boxCount)} Koli` },
      {
        label: 'Toplam Teslim Edilen',
        value: `${integer(totalDeliveredQuantity)} adet`,
        highlight: true,
      },
    ],
    3,
  );

  return finalizeDocument(doc);
}

// -------------------------------------------------------------
// 3. Account Statement PDF Renderer
// -------------------------------------------------------------
export async function renderAccountStatementPdf(
  value: AccountStatementPdfSource & { balance: string; rangeLabel: string },
): Promise<Buffer> {
  const doc = createDocument(`Cari Hesap Ekstresi ${value.customer.name}`);

  renderHeader(doc, 'Cari Hesap Ekstresi', {
    subtitle: `Dönem: ${value.rangeLabel} · Rapor Tarihi: ${formatDate(new Date())}`,
  });

  renderInfoGrid(doc, [
    { label: 'Müşteri Adı', value: value.customer.name, fullWidth: true },
    { label: 'Tarih Aralığı', value: value.rangeLabel },
    { label: 'Cari Bakiye', value: displayMoney(value.balance), highlight: true },
  ]);

  renderSummaryCards(
    doc,
    'Hesap Özeti',
    [
      { label: 'Toplam İş Tutarı (Borç)', value: displayMoney(value.workOrderTotal) },
      { label: 'Toplam Tahsilat (Alacak)', value: displayMoney(value.paymentsTotal) },
      { label: 'Borç Düzeltmeleri', value: displayMoney(value.debitAdjustments) },
      { label: 'Alacak / İndirim', value: displayMoney(value.creditAdjustments) },
      { label: 'Net Bakiye', value: displayMoney(value.balance), highlight: true },
    ],
    3,
  );

  renderSectionTitle(doc, 'Hesap Hareketleri');
  renderTable(doc, {
    columns: [
      {
        header: 'Tarih',
        width: 85,
        render: (item) => formatDateTime(item.occurredAt),
      },
      {
        header: 'İşlem',
        width: 100,
        render: (item) => statementLabels[item.type] ?? item.type,
      },
      {
        header: 'Açıklama',
        width: 170.28,
        render: (item) => `${item.description}${item.cancelledAt ? ' (İptal)' : ''}`,
      },
      {
        header: 'Borç',
        width: 80,
        align: 'right',
        bold: true,
        render: (item) => {
          const isCredit = item.type === 'PAYMENT' || item.type === 'ADJUSTMENT_CREDIT';
          return isCredit ? '—' : displayMoney(item.amount);
        },
      },
      {
        header: 'Alacak',
        width: 80,
        align: 'right',
        bold: true,
        color: COLORS.brandAccent,
        render: (item) => {
          const isCredit = item.type === 'PAYMENT' || item.type === 'ADJUSTMENT_CREDIT';
          return isCredit ? displayMoney(item.amount) : '—';
        },
      },
    ],
    items: value.items,
    emptyText: 'Seçilen tarih aralığında hesap hareketi bulunamadı.',
  });

  if (value.truncated) {
    ensureSpace(doc, 25);
    doc.y += 4;
    doc
      .font('Noto')
      .fontSize(8)
      .fillColor('#9a651e')
      .text('Güvenlik sınırı nedeniyle yalnızca ilk 5.000 hesap hareketi listelenmiştir.', MARGIN_LEFT, doc.y);
  }

  return finalizeDocument(doc);
}

// -------------------------------------------------------------
// 4. Customer Active Work Orders (In-Shop) PDF Renderer
// -------------------------------------------------------------
export async function renderCustomerActiveWorkOrdersPdf(
  value: CustomerActiveWorkOrdersPdfSource,
): Promise<Buffer> {
  const doc = createDocument(`Eldeki İşler Listesi - ${value.customer.name}`);

  renderHeader(doc, 'Eldeki İşler Listesi', {
    subtitle: `Rapor Tarihi: ${formatDate(value.generatedAt)} · Atölye Durumu`,
  });

  renderInfoGrid(doc, [
    { label: 'Müşteri Adı', value: value.customer.name, fullWidth: true },
    { label: 'Rapor Tarihi', value: formatDateTime(value.generatedAt) },
    { label: 'Kapsam', value: 'Atölyede Kalan Aktif İşler' },
  ]);

  renderSectionTitle(doc, 'Atölyedeki İşler');
  renderTable(doc, {
    columns: [
      {
        header: 'İş Emri Ref',
        width: 75,
        bold: true,
        render: (item) => `#${item.id.slice(-8)}`,
      },
      {
        header: 'Ürün / İş Adı',
        width: 140.28,
        render: (item) => item.productName,
      },
      {
        header: 'Hizmet',
        width: 75,
        render: (item) => typeLabels[item.type] ?? item.type,
      },
      {
        header: 'Durum',
        width: 55,
        render: (item) => statusLabels[item.status] ?? item.status,
      },
      {
        header: 'Toplam',
        width: 50,
        align: 'right',
        render: (item) => `${integer(item.totalQuantity)}`,
      },
      {
        header: 'Teslim',
        width: 50,
        align: 'right',
        render: (item) => `${integer(item.deliveredQuantity)}`,
      },
      {
        header: 'Kalan',
        width: 70,
        align: 'right',
        bold: true,
        color: COLORS.brandAccent,
        render: (item) => `${integer(item.remainingQuantity)}`,
      },
    ],
    items: value.items,
    emptyText: 'Müşteriye ait atölyede bekleyen aktif iş emri bulunmamaktadır.',
  });

  renderSummaryCards(
    doc,
    'Genel Atölye Özeti',
    [
      { label: 'Toplam İş Emri', value: `${integer(value.summary.totalWorkOrders)} adet` },
      { label: 'Toplam Sipariş', value: `${integer(value.summary.totalQuantity)} adet` },
      { label: 'Teslim Edilen', value: `${integer(value.summary.totalDeliveredQuantity)} adet` },
      {
        label: 'Atölyede Kalan',
        value: `${integer(value.summary.totalRemainingQuantity)} adet`,
        highlight: true,
      },
      {
        label: 'Paket Detayı (Çuval / Koli)',
        value: `${integer(value.summary.totalSacks)} Çuval · ${integer(value.summary.totalBoxes)} Koli`,
      },
      {
        label: 'Toplam Paketlenmiş',
        value: `${integer(value.summary.totalPackagedQuantity)} adet`,
      },
    ],
    3,
  );

  return finalizeDocument(doc);
}
