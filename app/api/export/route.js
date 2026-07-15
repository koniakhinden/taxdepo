import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { createClient } from '../../../lib/supabase/server';
import { exportStringsFor } from '../../../lib/i18n';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Собирает zip: receipts.xlsx + папка photos/ со всеми фото чеков.
export async function GET(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'uk';
  const S = exportStringsFor(lang);

  const { data: receipts, error } = await supabase
    .from('receipts')
    .select('*')
    .order('purchased_at', { ascending: true });

  if (error) {
    return new Response('Error reading data', { status: 500 });
  }

  const zip = new JSZip();
  const photosFolder = zip.folder('photos');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Receipt Tracker';
  const ws = wb.addWorksheet(S.sheet);

  ws.columns = [
    { header: S.n, key: 'n', width: 6 },
    { header: S.date, key: 'date', width: 14 },
    { header: S.category, key: 'category', width: 28 },
    { header: S.merchant, key: 'merchant', width: 24 },
    { header: S.amount, key: 'amount', width: 14 },
    { header: S.currency, key: 'currency', width: 10 },
    { header: S.note, key: 'note', width: 26 },
    { header: S.photo, key: 'photo', width: 28 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE9EEF6' },
  };

  const list = receipts || [];
  let idx = 0;

  for (const r of list) {
    idx += 1;
    let photoName = '';

    if (r.image_path) {
      const { data: file } = await supabase.storage.from('receipts').download(r.image_path);
      if (file) {
        const buf = Buffer.from(await file.arrayBuffer());
        const datePart = (r.purchased_at || 'nodate').replace(/-/g, '');
        photoName = `${String(idx).padStart(3, '0')}_${datePart}.jpg`;
        photosFolder.file(photoName, buf);
      }
    }

    ws.addRow({
      n: idx,
      date: r.purchased_at,
      category: r.category,
      merchant: r.merchant || '',
      amount: Number(r.amount),
      currency: r.currency,
      note: r.note || '',
      photo: photoName ? `photos/${photoName}` : '',
    });
  }

  ws.getColumn('amount').numFmt = '#,##0.00';

  if (list.length) {
    const totalRow = ws.addRow({ category: S.total, amount: { formula: `SUM(E2:E${list.length + 1})` } });
    totalRow.font = { bold: true };
  }

  const xlsxBuffer = await wb.xlsx.writeBuffer();
  zip.file('receipts.xlsx', xlsxBuffer);

  const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(zipContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="receipts_${stamp}.zip"`,
    },
  });
}
