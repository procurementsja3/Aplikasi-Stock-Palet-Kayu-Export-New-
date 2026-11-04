import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowDownLeft,
  Lock,
  Edit2,
  Trash2,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  Transaction,
  LocationType,
  AppUser,
  InboundTransaction,
  POTransaction,
} from '../types/pallet';
import { PLANT_LOCATIONS } from '../data/initialData';

interface InboundViewProps {
  transactions: Transaction[];
  currentUser: AppUser | null;
  onAddInbound: (inb: Omit<InboundTransaction, 'id' | 'timestamp'>) => void;
  onEdit: (trx: Transaction) => void;
  onDelete: (id: string) => void;
  onOpenLogin: () => void;
}

export const InboundView: React.FC<InboundViewProps> = ({
  transactions,
  currentUser,
  onAddInbound,
  onEdit,
  onDelete,
  onOpenLogin,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [lokasi, setLokasi] = useState<LocationType>('SJA KARAWANG');
  const [selectedPO, setSelectedPO] = useState('');
  const [supplier, setSupplier] = useState('');
  const [batch, setBatch] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Column search filters
  const [filterDate, setFilterDate] = useState('');
  const [filterLokasi, setFilterLokasi] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterNotes, setFilterNotes] = useState('');

  // Lock location for purchasing users
  useEffect(() => {
    if (currentUser?.role === 'purchasing' && currentUser.location !== 'ALL') {
      setLokasi(currentUser.location as LocationType);
    }
  }, [currentUser]);

  // Available POs for selected location
  const availablePOs = useMemo(() => {
    return transactions
      .filter((t): t is POTransaction => t.type === 'PO' && t.lokasi === lokasi)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [transactions, lokasi]);

  // Selected PO details
  const activePOData = useMemo(() => {
    if (!selectedPO) return null;
    return availablePOs.find((p) => p.poNumber === selectedPO) || null;
  }, [availablePOs, selectedPO]);

  // Calculate past received for this PO
  const pastReceived = useMemo(() => {
    if (!selectedPO) return 0;
    return transactions
      .filter((t): t is InboundTransaction => t.type === 'IN' && t.po === selectedPO)
      .reduce((sum, item) => sum + (item.qty || 0), 0);
  }, [transactions, selectedPO]);

  // Auto fill supplier when PO is chosen
  const handlePOChange = (poNum: string) => {
    setSelectedPO(poNum);
    if (poNum) {
      const match = availablePOs.find((p) => p.poNumber === poNum);
      if (match) {
        setSupplier(match.supplier);
      }
    } else {
      setSupplier('');
    }
  };

  // Dynamic live calculation of outstanding
  const liveOutstanding = useMemo(() => {
    if (!activePOData) return null;
    const incoming = Number(qty) || 0;
    const currentOutstanding = activePOData.poQty - pastReceived - incoming;
    return {
      poQty: activePOData.poQty,
      pastReceived,
      remaining: currentOutstanding,
    };
  }, [activePOData, pastReceived, qty]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    if (!qty || Number(qty) <= 0) return;

    onAddInbound({
      type: 'IN',
      lokasi,
      date,
      supplier: supplier.trim(),
      po: selectedPO ? selectedPO.trim().toUpperCase() : undefined,
      poQty: activePOData ? activePOData.poQty : undefined,
      batch: batch.trim().toUpperCase().replace(/\|/g, '-'),
      qty: Number(qty),
      notes: notes.trim(),
    });

    setSelectedPO('');
    setSupplier('');
    setBatch('');
    setQty('');
    setNotes('');
  };

  // Filtered inbound table records
  const inbounds = transactions
    .filter((t): t is InboundTransaction => t.type === 'IN')
    .filter((t) => {
      if (currentUser?.role === 'purchasing' && currentUser.location !== 'ALL') {
        return t.lokasi === currentUser.location;
      }
      return true;
    })
    .filter((t) => {
      if (filterDate && !t.date.toLowerCase().includes(filterDate.toLowerCase())) return false;
      if (filterLokasi && !t.lokasi.toLowerCase().includes(filterLokasi.toLowerCase())) return false;
      if (
        filterSupplier &&
        !t.supplier.toLowerCase().includes(filterSupplier.toLowerCase()) &&
        !(t.po && t.po.toLowerCase().includes(filterSupplier.toLowerCase()))
      )
        return false;
      if (filterBatch && !t.batch.toLowerCase().includes(filterBatch.toLowerCase())) return false;
      if (filterNotes && !(t.notes || '').toLowerCase().includes(filterNotes.toLowerCase()))
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
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Penerimaan Palet Baru (Inbound)
          </h2>
          <p className="text-xs text-slate-500">
            Pencatatan kedatangan palet kayu masuk dari supplier dengan tracking PO & Batch
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Inbound */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-2xs border border-slate-200 p-5 h-fit relative overflow-hidden">
          {/* Lock Overlay for Guests */}
          {isLocked && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-2.5 bg-slate-100 rounded-lg mb-2 text-slate-600 border border-slate-200">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-xs mb-1">
                Login Diperlukan
              </h4>
              <p className="text-[11px] text-slate-500 mb-3 max-w-xs">
                Login untuk mencatat data penerimaan palet baru.
              </p>
              <button
                onClick={onOpenLogin}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-2xs"
              >
                Login Sekarang
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-200">
            <ArrowDownLeft className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Input Data Kedatangan
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Lokasi Plant SJA
              </label>
              <select
                required
                value={lokasi}
                disabled={currentUser?.role === 'purchasing'}
                onChange={(e) => {
                  setLokasi(e.target.value as LocationType);
                  setSelectedPO('');
                }}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 font-medium disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {PLANT_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Hubungkan dengan PO */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Hubungkan dengan Master PO (Opsional)</span>
              </label>
              <select
                value={selectedPO}
                onChange={(e) => handlePOChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 outline-none bg-white font-medium"
              >
                <option value="">-- Penerimaan Tanpa PO / Manual --</option>
                {availablePOs.map((p) => {
                  let rec = 0;
                  transactions.forEach((tx) => {
                    if (tx.type === 'IN' && tx.po === p.poNumber) rec += tx.qty;
                  });
                  const sisa = p.poQty - rec;
                  return (
                    <option key={p.id} value={p.poNumber}>
                      PO: {p.poNumber} - {p.supplier}{' '}
                      {sisa > 0 ? `(Sisa: ${sisa})` : `(Selesai)`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tanggal Kedatangan
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nama Supplier
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: PT. Kayu Jati"
                value={supplier}
                readOnly={!!selectedPO}
                onChange={(e) => setSupplier(e.target.value)}
                className={`w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 outline-none ${
                  selectedPO ? 'bg-slate-100 text-slate-600 font-medium' : ''
                }`}
              />
            </div>

            {activePOData && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Total Qty di PO (Palet)
                </label>
                <input
                  type="number"
                  readOnly
                  value={activePOData.poQty}
                  className="w-full border border-slate-200 bg-slate-100 text-slate-600 rounded-lg p-2 text-xs font-mono font-bold outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Kode Batch Pengiriman
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: BATCH-BMR-001"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs uppercase font-mono font-bold focus:ring-1 focus:ring-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Qty Kedatangan Palet
              </label>
              <input
                type="number"
                min={1}
                required
                placeholder="Jumlah palet yang datang"
                value={qty}
                onChange={(e) =>
                  setQty(e.target.value === '' ? '' : parseInt(e.target.value))
                }
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono text-slate-900 focus:ring-1 focus:ring-slate-800 outline-none"
              />

              {/* Dynamic live calculation feedback */}
              {liveOutstanding && (
                <div className="mt-2 text-xs font-semibold">
                  {liveOutstanding.remaining > 0 ? (
                    <p className="text-amber-800 bg-amber-50/70 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5 text-[11px]">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Parsial: Sisa {liveOutstanding.remaining} palet lagi di PO ini.
                      </span>
                    </p>
                  ) : liveOutstanding.remaining === 0 ? (
                    <p className="text-slate-800 bg-slate-100 p-2 rounded-lg border border-slate-300 flex items-center gap-1.5 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>Pengiriman Lengkap (Selesai). PO akan berstatus Closed.</span>
                    </p>
                  ) : (
                    <p className="text-rose-800 bg-rose-50/70 p-2 rounded-lg border border-rose-200 flex items-center gap-1.5 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>
                        Kelebihan kirim: {Math.abs(liveOutstanding.remaining)} palet di atas target PO!
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Keterangan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Catatan kondisi palet, supir, dll..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-lg transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer text-xs mt-2"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> Simpan Kedatangan
            </button>
          </form>
        </div>

        {/* Inbound Table with column filters */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden flex flex-col relative">
          {/* Lock Overlay for Guests */}
          {isLocked && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="p-2.5 bg-slate-100 rounded-lg mb-2 text-slate-600 border border-slate-200">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-800 text-xs mb-1">
                Akses Dibatasi
              </h4>
              <p className="text-[11px] text-slate-500 mb-3 max-w-xs">
                Login untuk melihat dan memfilter riwayat kedatangan palet.
              </p>
              <button
                onClick={onOpenLogin}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-2xs"
              >
                Login Sekarang
              </button>
            </div>
          )}

          <div className="p-4 flex justify-between items-center bg-slate-50/80 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Riwayat Kedatangan Palet
              </h3>
              <p className="text-[11px] text-slate-500">
                {currentUser?.role === 'purchasing'
                  ? `Khusus plant ${currentUser.location}`
                  : 'Semua plant SJA'}
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded">
              {inbounds.length} Record
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5 sm:p-4 font-bold">Tgl</th>
                  <th className="p-3.5 sm:p-4 font-bold">Lokasi</th>
                  <th className="p-3.5 sm:p-4 font-bold">Supplier & PO</th>
                  <th className="p-3.5 sm:p-4 font-bold">Batch</th>
                  <th className="p-3.5 sm:p-4 font-bold text-right">Qty Datang</th>
                  <th className="p-3.5 sm:p-4 font-bold">Keterangan</th>
                  {isAdmin && (
                    <th className="p-3.5 sm:p-4 font-bold text-center w-20">Aksi</th>
                  )}
                </tr>

                {/* Filter Row */}
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Cari Tgl..."
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 rounded-lg outline-none bg-white focus:ring-1 focus:ring-slate-800"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Cari Lokasi..."
                      value={filterLokasi}
                      onChange={(e) => setFilterLokasi(e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 rounded-lg outline-none bg-white focus:ring-1 focus:ring-slate-800"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Cari Supplier / PO..."
                      value={filterSupplier}
                      onChange={(e) => setFilterSupplier(e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 rounded-lg outline-none bg-white focus:ring-1 focus:ring-slate-800"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Cari Batch..."
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 rounded-lg outline-none bg-white focus:ring-1 focus:ring-slate-800"
                    />
                  </td>
                  <td className="p-2"></td>
                  <td className="p-2">
                    <input
                      type="text"
                      placeholder="Cari Catatan..."
                      value={filterNotes}
                      onChange={(e) => setFilterNotes(e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-300 rounded-lg outline-none bg-white focus:ring-1 focus:ring-slate-800"
                    />
                  </td>
                  {isAdmin && <td className="p-2"></td>}
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm divide-y divide-slate-100">
                {inbounds.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-slate-400">
                      Belum ada data kedatangan palet yang cocok.
                    </td>
                  </tr>
                ) : (
                  inbounds.map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-slate-600">{formatDate(trx.date)}</td>
                      <td className="p-3 font-medium text-slate-700">
                        {trx.lokasi}
                      </td>
                      <td className="p-3 text-slate-800">
                        <div className="font-medium">{trx.supplier}</div>
                        {trx.po && (
                          <span className="inline-block mt-0.5 text-[11px] font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            PO: {trx.po}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">
                          {trx.batch}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        +{trx.qty.toLocaleString('id-ID')}
                      </td>
                      <td
                        className="p-3 text-slate-500 truncate max-w-[180px]"
                        title={trx.notes}
                      >
                        {trx.notes || '-'}
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEdit(trx)}
                              className="text-slate-600 hover:text-slate-900 p-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDelete(trx.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition"
                              title="Hapus"
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
