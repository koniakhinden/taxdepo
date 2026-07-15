import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { createClient } from '../../../lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Собирает zip: receipts.xlsx + папка photos/ со всеми фото чеков.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Не авторизован', { status: 401 });
  }

  const { data: receipts, error } = await supabase
    .from('receipts')
    .select('*')
    .order('purchased_at', { ascending: true });

  if (error) {
    return new Response('Ошибка чтения данных', { status: 500 });
  }

  const zip = new JSZip();
  const photosFolder = zip.folder('photos');

  // ---- Excel ----
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Receipt Tracker';
  const ws = wb.addWorksheet('Чеки');

  ws.columns = [
    { header: '№', key: 'n', width: 6 },
    { header: 'Дата', key: 'date', width: 14 },
    { header: 'Категория', key: 'category', width: 28 },
    { header: 'Магазин', key: 'merchant', width: 24 },
    { header: 'Сумма', key: 'amount', width: 14 },
    { header: 'Валюта', key: 'currency', width: 10 },
    { header: 'Заметка', key: 'note', width: 26 },
    { header: 'Файл фото', key: 'photo', width: 28 },
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
      // Скачиваем фото из Storage и кладём в архив
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

  // Формат суммы
  ws.getColumn('amount').numFmt = '#,##0.00';

  // Итоговая строка
  if (list.length) {
    const totalRow = ws.addRow({ category: 'ИТОГО', amount: { formula: `SUM(E2:E${list.length + 1})` } });
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
