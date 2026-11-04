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
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[120] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm p-5 text-center border border-slate-200 dark:border-slate-800 transition-colors">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border ${
            isReset
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400'
          }`}
        >
          {isReset ? (
            <Trash2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>

        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1.5">
          {title || (isReset ? 'Reset Semua Data?' : 'Hapus Data Transaksi?')}
        </h3>

        <p className="text-slate-600 dark:text-slate-300 mb-5 text-xs leading-relaxed">
          {description ||
            (isReset
              ? 'Peringatan: Seluruh data transaksi palet dan PO akan dihapus secara permanen. Pastikan Anda sudah mengunduh Backup Data sebelum melanjutkan.'
              : 'Data yang dihapus tidak dapat dikembalikan dan akan langsung mempengaruhi kalkulasi saldo palet.')}
        </p>

        <div className="flex justify-center gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition font-medium flex-1 cursor-pointer"
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
