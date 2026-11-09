import * as XLSX from 'xlsx';
import { InboundTransaction, OutboundTransaction, Transaction, POTransaction } from '../types/pallet';

/**
 * Format tanggal YYYY-MM-DD untuk nama file
 */
function getFileDateSuffix(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Membersihkan nama plant untuk nama file
 */
function cleanPlantForFilename(plantName?: string): string {
  if (!plantName || plantName === 'ALL') return '';
  return '_' + plantName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Konversi & Export Riwayat Kedatangan (Inbound) ke Microsoft Excel (.xlsx)
 * Dapat digunakan oleh Superadmin maupun PIC Plant
 */
export function exportInboundsToExcel(
  items: InboundTransaction[],
  filenamePrefix = 'Riwayat_Kedatangan_Palet_SJA',
  plantName?: string
): void {
  if (!items || items.length === 0) {
    alert('Tidak ada data kedatangan untuk diekspor ke Excel.');
    return;
  }

  const rows: Record<string, any>[] = items.map((item, index) => ({
    'No': index + 1,
    'Tanggal': item.date,
    'Lokasi Plant': item.lokasi,
    'Supplier': item.supplier || '-',
    'Nomor PO': item.po || '-',
    'Nomor Batch': item.batch,
    'Qty Datang (Palet)': Number(item.qty) || 0,
    'Keterangan / Catatan': item.notes || '-',
  }));

  // Hitung total Qty
  const totalQty = rows.reduce((sum, r) => sum + (r['Qty Datang (Palet)'] || 0), 0);

  // Tambahkan baris total di bagian bawah
  rows.push({
    'No': '',
    'Tanggal': '',
    'Lokasi Plant': 'TOTAL KEDATANGAN',
    'Supplier': '',
    'Nomor PO': '',
    'Nomor Batch': `${items.length} Transaksi`,
    'Qty Datang (Palet)': totalQty,
    'Keterangan / Catatan': `Dicetak: ${new Date().toLocaleString('id-ID')}`,
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set lebar kolom otomatis agar nyaman dibaca di Excel
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // Tanggal
    { wch: 22 }, // Lokasi Plant
    { wch: 26 }, // Supplier
    { wch: 20 }, // Nomor PO
    { wch: 20 }, // Nomor Batch
    { wch: 20 }, // Qty Datang
    { wch: 35 }, // Keterangan
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = plantName && plantName !== 'ALL' ? `Kedatangan ${plantName.replace('SJA ', '')}` : 'Riwayat Kedatangan';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const plantSuffix = cleanPlantForFilename(plantName);
  const filename = `${filenamePrefix}${plantSuffix}_${getFileDateSuffix()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Konversi & Export Riwayat Pengeluaran (Outbound) ke Microsoft Excel (.xlsx)
 * Dapat digunakan oleh Superadmin maupun PIC Plant
 */
export function exportOutboundsToExcel(
  items: OutboundTransaction[],
  filenamePrefix = 'Riwayat_Pengeluaran_Palet_SJA',
  plantName?: string
): void {
  if (!items || items.length === 0) {
    alert('Tidak ada data pengeluaran untuk diekspor ke Excel.');
    return;
  }

  const rows: Record<string, any>[] = items.map((item, index) => ({
    'No': index + 1,
    'Tanggal': item.date,
    'Lokasi Asal': item.lokasi,
    'Nomor Batch': item.batch,
    'Qty Keluar (Palet)': Number(item.qty) || 0,
    'Tujuan / Keterangan': item.notes || '-',
  }));

  // Hitung total Qty
  const totalQty = rows.reduce((sum, r) => sum + (r['Qty Keluar (Palet)'] || 0), 0);

  // Tambahkan baris total di bagian bawah
  rows.push({
    'No': '',
    'Tanggal': '',
    'Lokasi Asal': 'TOTAL PENGELUARAN',
    'Nomor Batch': `${items.length} Transaksi`,
    'Qty Keluar (Palet)': totalQty,
    'Tujuan / Keterangan': `Dicetak: ${new Date().toLocaleString('id-ID')}`,
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set lebar kolom otomatis
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // Tanggal
    { wch: 22 }, // Lokasi Asal
    { wch: 22 }, // Nomor Batch
    { wch: 20 }, // Qty Keluar
    { wch: 40 }, // Keterangan
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = plantName && plantName !== 'ALL' ? `Pengeluaran ${plantName.replace('SJA ', '')}` : 'Riwayat Pengeluaran';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const plantSuffix = cleanPlantForFilename(plantName);
  const filename = `${filenamePrefix}${plantSuffix}_${getFileDateSuffix()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Konversi & Export Daftar Master PO ke Microsoft Excel (.xlsx)
 */
export function exportPOsToExcel(
  items: POTransaction[],
  filenamePrefix = 'Daftar_Master_PO_SJA',
  plantName?: string
): void {
  if (!items || items.length === 0) {
    alert('Tidak ada data PO untuk diekspor ke Excel.');
    return;
  }

  const rows: Record<string, any>[] = items.map((item, index) => ({
    'No': index + 1,
    'Tanggal PO': item.date,
    'Lokasi Tujuan': item.lokasi,
    'Supplier': item.supplier,
    'Nomor PO': item.poNumber,
    'Qty Order (Palet)': Number(item.poQty) || 0,
    'Keterangan / Catatan': (item as any).notes || '-',
  }));

  const totalQty = rows.reduce((sum, r) => sum + (r['Qty Order (Palet)'] || 0), 0);

  rows.push({
    'No': '',
    'Tanggal PO': '',
    'Lokasi Tujuan': 'TOTAL QTY ORDER PO',
    'Supplier': '',
    'Nomor PO': `${items.length} PO`,
    'Qty Order (Palet)': totalQty,
    'Keterangan / Catatan': `Dicetak: ${new Date().toLocaleString('id-ID')}`,
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // Tanggal PO
    { wch: 22 }, // Lokasi
    { wch: 26 }, // Supplier
    { wch: 20 }, // Nomor PO
    { wch: 20 }, // Qty Order
    { wch: 35 }, // Catatan
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = plantName && plantName !== 'ALL' ? `Master PO ${plantName.replace('SJA ', '')}` : 'Master PO';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const plantSuffix = cleanPlantForFilename(plantName);
  const filename = `${filenamePrefix}${plantSuffix}_${getFileDateSuffix()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Export Seluruh Buku Kerja (Workbook) lengkap: Kedatangan, Pengeluaran & PO
 * Dapat digunakan oleh Superadmin (semua plant) maupun PIC Plant (khusus plant mereka)
 */
export function exportFullPalletWorkbook(
  transactions: Transaction[],
  filenamePrefix = 'Laporan_Lengkap_Palet_SJA',
  plantName?: string
): void {
  // Jika ada spesifikasi plant (misal PIC Karawang), filter hanya transaksi plant tersebut
  const filtered = plantName && plantName !== 'ALL'
    ? transactions.filter((t) => {
        const target = plantName.trim().toUpperCase();
        const loc = String(t.lokasi || '').trim().toUpperCase();
        return loc === target || loc.replace('SJA ', '') === target.replace('SJA ', '');
      })
    : transactions;

  const inbounds = filtered.filter((t): t is InboundTransaction => t.type === 'IN');
  const outbounds = filtered.filter((t): t is OutboundTransaction => t.type === 'OUT');
  const pos = filtered.filter((t): t is POTransaction => t.type === 'PO');

  if (inbounds.length === 0 && outbounds.length === 0 && pos.length === 0) {
    alert('Tidak ada data transaksi untuk diekspor.');
    return;
  }

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Kedatangan
  const inRows: Record<string, any>[] = inbounds.map((item, idx) => ({
    'No': idx + 1,
    'Tanggal': item.date,
    'Lokasi': item.lokasi,
    'Supplier': item.supplier || '-',
    'Nomor PO': item.po || '-',
    'Nomor Batch': item.batch,
    'Qty Datang (Palet)': Number(item.qty) || 0,
    'Catatan': item.notes || '-',
  }));
  const totalIn = inRows.reduce((sum, r) => sum + (r['Qty Datang (Palet)'] || 0), 0);
  if (inRows.length > 0) {
    inRows.push({
      'No': '',
      'Tanggal': '',
      'Lokasi': 'TOTAL KEDATANGAN',
      'Supplier': '',
      'Nomor PO': '',
      'Nomor Batch': `${inbounds.length} Record`,
      'Qty Datang (Palet)': totalIn,
      'Catatan': `Dicetak: ${new Date().toLocaleString('id-ID')}`,
    });
  }
  const wsIn = XLSX.utils.json_to_sheet(inRows.length > 0 ? inRows : [{ 'Info': 'Tidak ada data kedatangan' }]);
  wsIn['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, wsIn, 'Kedatangan (IN)');

  // Sheet 2: Pengeluaran
  const outRows: Record<string, any>[] = outbounds.map((item, idx) => ({
    'No': idx + 1,
    'Tanggal': item.date,
    'Lokasi Asal': item.lokasi,
    'Nomor Batch': item.batch,
    'Qty Keluar (Palet)': Number(item.qty) || 0,
    'Tujuan/Catatan': item.notes || '-',
  }));
  const totalOut = outRows.reduce((sum, r) => sum + (r['Qty Keluar (Palet)'] || 0), 0);
  if (outRows.length > 0) {
    outRows.push({
      'No': '',
      'Tanggal': '',
      'Lokasi Asal': 'TOTAL PENGELUARAN',
      'Nomor Batch': `${outbounds.length} Record`,
      'Qty Keluar (Palet)': totalOut,
      'Tujuan/Catatan': `Dicetak: ${new Date().toLocaleString('id-ID')}`,
    });
  }
  const wsOut = XLSX.utils.json_to_sheet(outRows.length > 0 ? outRows : [{ 'Info': 'Tidak ada data pengeluaran' }]);
  wsOut['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(workbook, wsOut, 'Pengeluaran (OUT)');

  // Sheet 3: PO Procurement
  const poRows: Record<string, any>[] = pos.map((item, idx) => ({
    'No': idx + 1,
    'Tanggal PO': item.date,
    'Lokasi Tujuan': item.lokasi,
    'Supplier': item.supplier,
    'Nomor PO': item.poNumber,
    'Qty Order': Number(item.poQty) || 0,
    'Catatan': (item as any).notes || '-',
  }));
  const totalPO = poRows.reduce((sum, r) => sum + (r['Qty Order'] || 0), 0);
  if (poRows.length > 0) {
    poRows.push({
      'No': '',
      'Tanggal PO': '',
      'Lokasi Tujuan': 'TOTAL QTY PO',
      'Supplier': '',
      'Nomor PO': `${pos.length} PO`,
      'Qty Order': totalPO,
      'Catatan': `Dicetak: ${new Date().toLocaleString('id-ID')}`,
    });
  }
  const wsPO = XLSX.utils.json_to_sheet(poRows.length > 0 ? poRows : [{ 'Info': 'Tidak ada data PO' }]);
  wsPO['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 16 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, wsPO, 'PO Procurement');

  const plantSuffix = cleanPlantForFilename(plantName);
  const filename = `${filenamePrefix}${plantSuffix}_${getFileDateSuffix()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
