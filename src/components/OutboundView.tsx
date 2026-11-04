import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowUpRight,
  Lock,
  Edit2,
  Trash2,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';
import {
  Transaction,
  LocationType,
  AppUser,
  OutboundTransaction,
  BatchBalance,
} from '../types/pallet';
import { PLANT_LOCATIONS } from '../data/initialData';

interface OutboundViewProps {
  transactions: Transaction[];
  currentUser: AppUser | null;
  onAddOutbound: (outb: Omit<OutboundTransaction, 'id' | 'timestamp'>) => void;
  onAddBulkOutbound: (
    items: Omit<OutboundTransaction, 'id' | 'timestamp'>[]
  ) => void;
  onEdit: (trx: Transaction) => void;
  onDelete: (id: string) => void;
  onOpenLogin: () => void;
}

export const OutboundView: React.FC<OutboundViewProps> = ({
  transactions,
  currentUser,
  onAddOutbound,
  onAddBulkOutbound,
  onEdit,
  onDelete,
  onOpenLogin,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [lokasi, setLokasi] = useState<LocationType>('SJA KARAWANG');
  const [selectedBatchKey, setSelectedBatchKey] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Column search filters
  const [filterDate, setFilterDate] = useState('');
  const [filterLokasi, setFilterLokasi] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterNotes, setFilterNotes] = useState('');

  // Lock location for purchasing users
  useEffect(() => {
    if (currentUser?.role === 'purchasing' && currentUser.location !== 'ALL') {
      setLokasi(currentUser.location as LocationType);
    }
  }, [currentUser]);

  // Compute stock balance per Batch and Lokasi
  const allBalances = useMemo(() => {
    const map: Record<string, BatchBalance> = {};
    transactions.forEach((trx) => {
      if (trx.type === 'PO') return;
      const loc = trx.lokasi || ('-' as LocationType);
      const batchCode = trx.batch || '-';
      const key = `${batchCode}|${loc}`;

      if (!map[key]) {
        map[key] = {
          batch: batchCode,
          lokasi: loc as LocationType,
          totalIn: 0,
          totalOut: 0,
          currentBalance: 0,
        };
      }

      if (trx.type === 'IN') map[key].totalIn += trx.qty || 0;
      else if (trx.type === 'OUT') map[key].totalOut += trx.qty || 0;

      map[key].currentBalance = map[key].totalIn - map[key].totalOut;
    });
    return Object.values(map);
  }, [transactions]);

  // Batches available in the selected location
  const availableBatches = useMemo(() => {
    return allBalances.filter(
      (b) => b.lokasi === lokasi && b.currentBalance > 0
    );
  }, [allBalances, lokasi]);

  const totalLocationStock = useMemo(() => {
    return availableBatches.reduce((acc, b) => acc + b.currentBalance, 0);
  }, [availableBatches]);

  // Reset selected batch if location changes and batch is no longer available
  useEffect(() => {
    if (selectedBatchKey) {
      if (selectedBatchKey === 'ALL_BATCHES') return;
      const [bCode] = selectedBatchKey.split('|');
      const exists = availableBatches.some((b) => b.batch === bCode);
      if (!exists) {
        setSelectedBatchKey('');
        setQty('');
      }
    }
  }, [lokasi, availableBatches, selectedBatchKey]);

  // Handle batch selection
  const handleBatchChange = (val: string) => {
    setSelectedBatchKey(val);
    if (val === 'ALL_BATCHES') {
      setQty(totalLocationStock);
    } else {
      const match = availableBatches.find((b) => `${b.batch}|${b.lokasi}` === val);
      if (match) {
        setQty('');
      }
    }
  };

  const isAllBatchesSelected = selectedBatchKey === 'ALL_BATCHES';
  const selectedBatchInfo = useMemo(() => {
    if (!selectedBatchKey || isAllBatchesSelected) return null;
    return (
      availableBatches.find((b) => `${b.batch}|${b.lokasi}` === selectedBatchKey) ||
      null
    );
  }, [availableBatches, selectedBatchKey, isAllBatchesSelected]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    if (!selectedBatchKey) return;

    if (isAllBatchesSelected) {
      if (availableBatches.length === 0) return;
      const itemsToDispatch = availableBatches.map((b) => ({
        type: 'OUT' as const,
        lokasi: b.lokasi,
        date,
        batch: b.batch,
        qty: b.currentBalance,
        notes: notes.trim() || 'Pengeluaran massal otomatis',
      }));
      onAddBulkOutbound(itemsToDispatch);
      setSelectedBatchKey('');
      setQty('');
      setNotes('');
    } else {
      if (!selectedBatchInfo) return;
      const numQty = Number(qty);
      if (!numQty || numQty <= 0) return;
      if (numQty > selectedBatchInfo.currentBalance) return;

      onAddOutbound({
        type: 'OUT',
        lokasi,
        date,
        batch: selectedBatchInfo.batch,
        qty: numQty,
        notes: notes.trim(),
      });

      setSelectedBatchKey('');
      setQty('');
      setNotes('');
    }
  };

  // Filtered outbound table records
  const outbounds = transactions
    .filter((t): t is OutboundTransaction => t.type === 'OUT')
    .filter((t) => {
      if (currentUser?.role === 'purchasing' && currentUser.location !== 'ALL') {
        return t.lokasi === currentUser.location;
      }
      return true;
    })
    .filter((t) => {
      if (filterDate && !t.date.toLowerCase().includes(filterDate.toLowerCase()))
        return false;
      if (filterLokasi && !t.lokasi.toLowerCase().includes(filterLokasi.toLowerCase()))
        return false;
      if (filterBatch && !t.batch.toLowerCase().includes(filterBatch.toLowerCase()))
        return false;
      if (
        filterNotes &&
        !(t.notes || '').toLowerCase().includes(filterNotes.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const isAdmin = currentUser?.role === 'admin';
  const isLocked = !currentUser;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Pengeluaran Palet (Outbound)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan pemakaian palet untuk produksi, pengiriman pelanggan, atau mutasi antar plant
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Outbound */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200 dark:border-slate-800 p-5 h-fit relative overflow-hidden transition-colors">
          {/* Lock Overlay for Guests */}
          {isLocked && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/85 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-1">
                Login Diperlukan
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 max-w-xs">
                Login untuk memproses pengeluaran stok palet.
              </p>
              <button
                onClick={onOpenLogin}
                className="bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer"
              >
                Login Sekarang
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <ArrowUpRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Input Data Pengeluaran
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Tanggal Pengeluaran
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400 outline-none bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Lokasi Asal SJA
              </label>
              <select
                required
                value={lokasi}
                disabled={currentUser?.role === 'purchasing'}
                onChange={(e) => {
                  setLokasi(e.target.value as LocationType);
                  setSelectedBatchKey('');
                }}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400 outline-none bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-medium disabled:bg-slate-100 dark:disabled:bg-slate-800/40 disabled:text-slate-500 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {PLANT_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Pilih Kode Batch (Tersedia)
              </label>
              <select
                required
                value={selectedBatchKey}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400 outline-none bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="" disabled>
                  -- Pilih Batch Tersedia --
                </option>

                {availableBatches.length > 1 && (
                  <option
                    value="ALL_BATCHES"
                    className="font-bold bg-amber-50 dark:bg-slate-800 text-amber-900 dark:text-amber-400"
                  >
                    -- KELUARKAN SEMUA BATCH SEKALIGUS (Total: {totalLocationStock}) --
                  </option>
                )}

                {availableBatches.map((b) => (
                  <option key={`${b.batch}|${b.lokasi}`} value={`${b.batch}|${b.lokasi}`}>
                    {b.batch} (Sisa: {b.currentBalance} Palet)
                  </option>
                ))}
              </select>

              {/* Stock info badge */}
              {isAllBatchesSelected && (
                <div className="mt-2 text-xs font-medium text-amber-900 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <PackageCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span>
                      Sisa stok gabungan: {totalLocationStock} palet
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400">
                    *Sistem akan mengeluarkan seluruh sisa palet dari {availableBatches.length} batch sekaligus.
                  </p>
                </div>
              )}

              {selectedBatchInfo && (
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Sisa stok batch ini:{' '}
                  <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                    {selectedBatchInfo.currentBalance}
                  </span>{' '}
                  palet
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Qty Keluar (Palet)
              </label>
              <input
                type="number"
                min={1}
                max={
                  isAllBatchesSelected
                    ? totalLocationStock
                    : selectedBatchInfo?.currentBalance || undefined
                }
                required
                readOnly={isAllBatchesSelected}
                placeholder="Jumlah palet keluar"
                value={qty}
                onChange={(e) =>
                  setQty(e.target.value === '' ? '' : parseInt(e.target.value))
                }
                className={`w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400 outline-none ${
                  isAllBatchesSelected ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-500' : 'bg-slate-50 dark:bg-slate-800/80'
                }`}
              />
              {selectedBatchInfo && Number(qty) > selectedBatchInfo.currentBalance && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Jumlah keluar melebihi sisa stok ({selectedBatchInfo.currentBalance} palet)!
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Keterangan / Tujuan Pengeluaran
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Pengiriman ke Pabrik B, Line Produksi A, dll..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400 outline-none bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={Boolean(
                !selectedBatchKey ||
                  (!isAllBatchesSelected &&
                    selectedBatchInfo &&
                    (Number(qty) <= 0 || Number(qty) > selectedBatchInfo.currentBalance))
              )}
              className="w-full bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <ArrowUpRight className="w-4 h-4" /> Proses Pengeluaran
            </button>
          </form>
        </div>

        {/* Outbound Table with search filters */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col relative transition-colors">
          {/* Lock Overlay for Guests */}
          {isLocked && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/85 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-3 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">
                Akses Dibatasi
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-xs">
                Login untuk melihat dan memfilter riwayat pengeluaran palet.
              </p>
              <button
                onClick={onOpenLogin}
                className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-2xs cursor-pointer"
              >
                Login Sekarang
              </button>
            </div>
          )}

          <div className="p-4 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Riwayat Pengeluaran Palet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentUser?.role === 'purchasing'
                  ? `Khusus plant ${currentUser.location}`
                  : 'Semua plant SJA'}
              </p>
            </div>
            <span className="text-xs font-mono font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
              {outbounds.length} Record
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Tgl</th>
                  <th className="p-3">Lokasi Asal</th>
                  <th className="p-3">Batch</th>
                  <th className="p-3 text-right">Qty Keluar</th>
                  <th className="p-3">Tujuan / Ket.</th>
                  {isAdmin && (
                    <th className="p-3 text-center w-20">Aksi</th>
                  )}
                </tr>

                {/* Filter Row */}
                <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Cari Tgl..."
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Cari Lokasi..."
                      value={filterLokasi}
                      onChange={(e) => setFilterLokasi(e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Cari Batch..."
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400"
                    />
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Cari Tujuan/Ket..."
                      value={filterNotes}
                      onChange={(e) => setFilterNotes(e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400"
                    />
                  </td>
                  {isAdmin && <td className="p-2"></td>}
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
                {outbounds.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      Belum ada data pengeluaran palet yang cocok.
                    </td>
                  </tr>
                ) : (
                  outbounds.map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">{formatDate(trx.date)}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                          {trx.lokasi}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {trx.batch}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                        -{trx.qty.toLocaleString('id-ID')}
                      </td>
                      <td
                        className="p-3 text-slate-600 dark:text-slate-400 truncate max-w-[200px]"
                        title={trx.notes}
                      >
                        {trx.notes || '-'}
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onEdit(trx)}
                              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDelete(trx.id)}
                              className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded border border-rose-200 dark:border-rose-900/50 transition cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
