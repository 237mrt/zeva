import { renderAccountStatementPdf, renderDeliveryPdf, renderWorkOrderPdf } from '../modules/reporting/pdf/pdf-renderer.js';

async function testRenderer() {
  const now = new Date();
  const customer = { id: 'c1', name: 'Çağrı Şen Tekstil' };
  
  const woPdf = await renderWorkOrderPdf({
    id: 'wo-1', customer, productName: 'Ütü Şişme Çocuk Önlüğü', type: 'IRONING_PACKAGING', status: 'READY',
    totalQuantity: 100, unitPrice: '10.00', totalAmount: '1000.00', receivedAt: now, dueAt: now,
    notes: 'İşlem öğleden önce tamamlanacak.', packages: []
  });
  console.log('WorkOrder PDF header:', woPdf.subarray(0, 4).toString(), 'size:', woPdf.length, 'bytes');

  const delPdf = await renderDeliveryPdf({
    id: 'del-1', customer, deliveredAt: now, receiverName: 'Çağrı Şen', notes: 'İşlem öğleden önce tamamlanacak.',
    cancelledAt: null, packages: []
  });
  console.log('Delivery PDF header:', delPdf.subarray(0, 4).toString(), 'size:', delPdf.length, 'bytes');

  const accPdf = await renderAccountStatementPdf({
    customer, workOrderTotal: '1000.00', paymentsTotal: '500.00', debitAdjustments: '0.00', creditAdjustments: '0.00',
    balance: '500.00 TL', rangeLabel: 'Ağustos 2026', truncated: false, items: []
  });
  console.log('AccountStatement PDF header:', accPdf.subarray(0, 4).toString(), 'size:', accPdf.length, 'bytes');
  console.log('DIST RENDERER VERIFICATION SUCCESSFUL!');
}

testRenderer().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
