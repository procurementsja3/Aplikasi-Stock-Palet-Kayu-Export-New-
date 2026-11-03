import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  type: 'delete' | 'reset';
  title?: string;
  description?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  type,
  title,
  description,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const isReset = type === 'reset';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[120] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 text-center border border-slate-200">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border ${
            isReset
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}
        >
          {isReset ? (
            <Trash2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>

        <h3 className="font-bold text-base text-slate-900 mb-1.5">
          {title || (isReset ? 'Reset Semua Data?' : 'Hapus Data Transaksi?')}
        </h3>

        <p className="text-slate-600 mb-5 text-xs leading-relaxed">
          {description ||
            (isReset
              ? 'Peringatan: Seluruh data transaksi palet dan PO akan dihapus secara permanen. Pastikan Anda sudah mengunduh Backup Data sebelum melanjutkan.'
              : 'Data yang dihapus tidak dapat dikembalikan dan akan langsung mempengaruhi kalkulasi saldo palet.')}
        </p>

        <div className="flex justify-center gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-medium flex-1 cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-3.5 py-2 text-xs text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition font-semibold flex-1 shadow-2xs cursor-pointer"
          >
            {isReset ? 'Ya, Reset Semua' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
};
