import React, { useState } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Server,
  Layers,
} from 'lucide-react';
import { CloudSyncStatus } from '../utils/firebase';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudStatus: CloudSyncStatus;
  cloudError: string | null;
  localCount: number;
  lastSyncedTime: number | null;
  onForceUpload: () => Promise<boolean>;
  onForceDownload: () => Promise<boolean>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  cloudStatus,
  cloudError,
  localCount,
  lastSyncedTime,
  onForceUpload,
  onForceDownload,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  if (!isOpen) return null;

  const handleUpload = async () => {
    setIsUploading(true);
    await onForceUpload();
    setIsUploading(false);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    await onForceDownload();
    setIsDownloading(false);
  };

  const rulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(rulesText);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  const formatLastSync = (t: number | null) => {
    if (!t) return 'Belum pernah sinkron';
    try {
      const d = new Date(t);
      return `${d.toLocaleDateString('id-ID')} pukul ${d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })} WIB`;
    } catch {
      return 'Baru saja';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[120] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 transition-colors overflow-hidden animate-view-fade">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-800">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                Sinkronisasi Cloud (Google Firebase)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Penyimpanan online real-time untuk multi-device (PC 1, PC 2, HP)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Connection Status Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Status Koneksi:</span>
              <div className="flex items-center gap-1.5">
                {cloudStatus === 'connected' ? (
                  <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Terhubung & Online
                  </span>
                ) : cloudStatus === 'syncing' ? (
                  <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Menyinkronkan...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Perlu Perhatian / Izin
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Project Firebase:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                sja-stok-palet (Firestore)
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Data di Komputer Ini:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {localCount} Transaksi
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Waktu Sinkron Terakhir:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {formatLastSync(lastSyncedTime)}
              </span>
            </div>
          </div>

          {/* Error Message if Any */}
          {cloudError && (
            <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold">Pesan dari Firebase:</p>
                  <p>{cloudError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons for Cross-PC Sync */}
          <div className="space-y-2.5 pt-1">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Aksi Sinkronisasi Antar Komputer / Perangkat:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Force Upload */}
              <button
                onClick={handleUpload}
                disabled={isUploading || isDownloading}
                className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
                title="Gunakan di PC 1 jika ingin mengirim data restore lokal ke cloud"
              >
                {isUploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span>Upload Data Ini ke Cloud</span>
              </button>

              {/* Force Download */}
              <button
                onClick={handleDownload}
                disabled={isUploading || isDownloading}
                className="flex items-center justify-center gap-2 p-3 bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white disabled:opacity-60 text-white dark:text-slate-900 rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
                title="Gunakan di PC 2 untuk menarik data dari cloud"
              >
                {isDownloading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudDownload className="w-4 h-4" />
                )}
                <span>Tarik Data dari Cloud</span>
              </button>
            </div>
          </div>

          {/* Help Box for Firebase Rules if user hasn't set test mode */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Penting: Aturan Rules di Firebase Console
              </span>
              <button
                onClick={copyRules}
                className="text-[11px] flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
              >
                {copiedRules ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRules ? 'Tersalin' : 'Salin Kode Rules'}</span>
              </button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Jika PC lain belum bisa membaca data, pastikan di Firebase Console menu{' '}
              <strong>Firestore Database &gt; Rules</strong> sudah diizinkan (allow read, write: if true).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-lg text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
