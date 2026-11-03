import React, { useState, useEffect } from 'react';
import { X, Save, Edit3 } from 'lucide-react';
import { Transaction, LocationType } from '../types/pallet';
import { PLANT_LOCATIONS } from '../data/initialData';

interface EditModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState('');
  const [lokasi, setLokasi] = useState<LocationType>('SJA KARAWANG');
  const [batch, setBatch] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [supplier, setSupplier] = useState('');
  const [po, setPo] = useState('');
  const [poQty, setPoQty] = useState<number>(1);

  useEffect(() => {
    if (transaction) {
      setDate(transaction.date || '');
      setLokasi(transaction.lokasi || 'SJA KARAWANG');

      if (transaction.type === 'PO') {
        setSupplier(transaction.supplier || '');
        setPo(transaction.poNumber || '');
        setPoQty(transaction.poQty || 1);
        setBatch('');
        setQty(1);
        setNotes('');
      } else if (transaction.type === 'IN') {
        setSupplier(transaction.supplier || '');
        setPo(transaction.po || '');
        setPoQty(transaction.poQty || 0);
        setBatch(transaction.batch || '');
        setQty(transaction.qty || 1);
        setNotes(transaction.notes || '');
      } else if (transaction.type === 'OUT') {
        setBatch(transaction.batch || '');
        setQty(transaction.qty || 1);
        setNotes(transaction.notes || '');
        setSupplier('');
        setPo('');
        setPoQty(0);
      }
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (transaction.type === 'PO') {
      onSave({
        ...transaction,
        date,
        lokasi,
        supplier: supplier.trim(),
        poNumber: po.trim().toUpperCase(),
        poQty: Number(poQty) || 1,
      });
    } else if (transaction.type === 'IN') {
      onSave({
        ...transaction,
        date,
        lokasi,
        supplier: supplier.trim(),
        po: po.trim().toUpperCase(),
        poQty: Number(poQty) || 0,
        batch: batch.trim().toUpperCase(),
        qty: Number(qty) || 1,
        notes: notes.trim(),
      });
    } else {
      onSave({
        ...transaction,
        date,
        lokasi,
        batch: batch.trim().toUpperCase(),
        qty: Number(qty) || 1,
        notes: notes.trim(),
      });
    }
    onClose();
  };

  const getTitle = () => {
    switch (transaction.type) {
      case 'PO':
        return 'Edit Master PO Procurement';
      case 'IN':
        return 'Edit Data Kedatangan Palet';
      case 'OUT':
        return 'Edit Data Pengeluaran Palet';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[110] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-slate-300" />
            <h3 className="font-bold text-sm sm:text-base">{getTitle()}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tanggal
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Lokasi Plant SJA
              </label>
              <select
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value as LocationType)}
                required
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 text-slate-900 font-medium"
              >
                {PLANT_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PO Specific / IN Specific */}
          {(transaction.type === 'PO' || transaction.type === 'IN') && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Supplier
                </label>
                <input
                  type="text"
                  required
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    No. PO
                  </label>
                  <input
                    type="text"
                    required={transaction.type === 'PO'}
                    value={po}
                    onChange={(e) => setPo(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs uppercase font-mono font-bold text-slate-900 focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Qty PO (Palet)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required={transaction.type === 'PO'}
                    value={poQty}
                    onChange={(e) => setPoQty(parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-semibold focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Batch Code for IN and OUT */}
          {transaction.type !== 'PO' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Kode Batch
              </label>
              <input
                type="text"
                required
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs uppercase font-mono focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 text-slate-900"
              />
            </div>
          )}

          {/* Transaction Qty for IN and OUT */}
          {transaction.type !== 'PO' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Qty Transaksi (Palet)
              </label>
              <input
                type="number"
                min={1}
                required
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50"
              />
            </div>
          )}

          {/* Notes for IN and OUT */}
          {transaction.type !== 'PO' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Keterangan / Catatan
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 text-slate-900"
              />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition font-semibold shadow-2xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
