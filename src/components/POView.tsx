import React, { useState, useEffect } from 'react';
import { Plus, Lock, Edit2, Trash2, FileText, Search } from 'lucide-react';
import { Transaction, LocationType, AppUser, POTransaction } from '../types/pallet';
import { PLANT_LOCATIONS } from '../data/initialData';

interface POViewProps {
  transactions: Transaction[];
  currentUser: AppUser | null;
  onAddPO: (po: Omit<POTransaction, 'id' | 'timestamp'>) => void;
  onEdit: (trx: Transaction) => void;
  onDelete: (id: string) => void;
  onOpenLogin: () => void;
}

export const POView: React.FC<POViewProps> = ({
  transactions,
  currentUser,
  onAddPO,
  onEdit,
  onDelete,
  onOpenLogin,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [lokasi, setLokasi] = useState<LocationType>('SJA KARAWANG');
  const [supplier, setSupplier] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poQty, setPoQty] = useState<number | ''>('');
  const [searchFilter, setSearchFilter] = useState('');

  // Lock location for purchasing users
  useEffect(() => {
    if (currentUser?.role === 'purchasing' && currentUser.location !== 'ALL') {
      setLokasi(currentUser.location as LocationType);
    }
  }, [currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    if (!poQty || Number(poQty) <= 0) return;

    onAddPO({
      type: 'PO',
      date,
      lokasi,
      supplier: supplier.trim(),
      poNumber: poNumber.trim().toUpperCase(),
      poQty: Number(poQty),
    });

    setSupplier('');
    setPoNumber('');
    setPoQty('');
  };

  const masterPOs = transactions
    .filter((t): t is POTransaction => t.type === 'PO')
    .filter((t) => {
      if (currentUser?.role === 'purchasing' && currentUser.location !== 'ALL') {
        return t.lokasi === currentUser.location;
      }
      return true;
    })
    .filter((t) => {
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        t.poNumber.toLowerCase().includes(q) ||
        t.supplier.toLowerCase().includes(q) ||
        t.lokasi.toLowerCase().includes(q)
      );
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
            Master Purchase Order (PO) Procurement
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registrasi Master PO Palet dari Supplier untuk masing-masing Plant SJA
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input PO */}
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
                Login sebagai PIC Purchasing atau Admin untuk membuat Master PO.
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
            <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Buat Master PO Baru
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Tanggal Create PO
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
                Lokasi Plant SJA
              </label>
              <select
                required
                value={lokasi}
                disabled={currentUser?.role === 'purchasing'}
                onChange={(e) => setLokasi(e.target.value as LocationType)}
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
                Nama Supplier
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: PT. Kayu Nusantara Abadi"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400 outline-none bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Nomor PO
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: PO-SJA-2026-088"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono uppercase font-bold text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400 outline-none bg-slate-50 dark:bg-slate-800/80 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Qty PO (Palet)
              </label>
              <input
                type="number"
                min={1}
                required
                placeholder="Jumlah total pesanan"
                value={poQty}
                onChange={(e) =>
                  setPoQty(e.target.value === '' ? '' : parseInt(e.target.value))
                }
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold font-mono text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400 outline-none bg-slate-50 dark:bg-slate-800/80 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white hover:bg-slate-800 text-white font-semibold py-2 rounded-lg transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer text-xs mt-2"
            >
              <Plus className="w-3.5 h-3.5" /> Simpan Master PO
            </button>
          </form>
        </div>

        {/* Master PO Table */}
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
                Login untuk melihat dan mengelola rincian Master PO.
              </p>
              <button
                onClick={onOpenLogin}
                className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-2xs cursor-pointer"
              >
                Login Sekarang
              </button>
            </div>
          )}

          <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Daftar Master PO
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentUser?.role === 'purchasing'
                  ? `Khusus plant ${currentUser.location}`
                  : 'Semua plant SJA'}
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari PO / Supplier..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-slate-800 dark:focus:ring-slate-400 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3 font-semibold">Tgl PO</th>
                  <th className="p-3 font-semibold">Lokasi</th>
                  <th className="p-3 font-semibold">No. PO</th>
                  <th className="p-3 font-semibold">Supplier</th>
                  <th className="p-3 font-semibold text-center">Qty PO</th>
                  {isAdmin && (
                    <th className="p-3 font-semibold text-center w-24">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {masterPOs.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      Belum ada data Master PO yang dibuat.
                    </td>
                  </tr>
                ) : (
                  masterPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {formatDate(po.date)}
                      </td>
                      <td className="p-3 font-medium text-slate-700 dark:text-slate-200">
                        {po.lokasi}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {po.poNumber}
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        {po.supplier}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-100 font-mono tabular-nums">
                        {po.poQty.toLocaleString('id-ID')}
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEdit(po)}
                              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              title="Edit Master PO"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDelete(po.id)}
                              className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 p-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded border border-rose-200 dark:border-rose-900/50 transition cursor-pointer"
                              title="Hapus Master PO"
                            >
                              <Trash2 className="w-3 h-3" />
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
