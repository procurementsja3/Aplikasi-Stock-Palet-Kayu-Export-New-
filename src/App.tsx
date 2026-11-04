import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  PieChart,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Unlock,
  Shield,
  User,
} from 'lucide-react';
import {
  Transaction,
  LocationType,
  AppUser,
  ToastInfo,
  POTransaction,
  InboundTransaction,
  OutboundTransaction,
} from './types/pallet';
import { INITIAL_TRANSACTIONS } from './data/initialData';
import { DashboardView } from './components/DashboardView';
import { POView } from './components/POView';
import { InboundView } from './components/InboundView';
import { OutboundView } from './components/OutboundView';
import { LoginModal } from './components/LoginModal';
import { EditModal } from './components/EditModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer } from './components/Toast';

import {
  STORAGE_KEY,
  BACKUP_STORAGE_KEY,
  USER_STORAGE_KEY,
  normalizeTransactionItem,
  loadFromLocalStorage,
  saveToLocalStorage,
  saveToIndexedDB,
  persistAllTransactions,
  retrieveAllTransactions,
} from './utils/storage';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'po' | 'inbound' | 'outbound'>('dashboard');

  // Location filter on Dashboard
  const [dashboardLocation, setDashboardLocation] = useState<string>('ALL');

  // Storage initialization flag to prevent premature empty overwrites
  const [isStorageReady, setIsStorageReady] = useState<boolean>(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Transaction Data State: synchronous local fallback on initial render
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const fromLocal = loadFromLocalStorage();
    if (fromLocal && fromLocal.length > 0) {
      return fromLocal;
    }
    return INITIAL_TRANSACTIONS;
  });

  // Deep hydration on mount: loads from IndexedDB (unlimited, permanent) & localStorage
  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      try {
        const persisted = await retrieveAllTransactions();
        if (isMounted) {
          if (persisted && persisted.length > 0) {
            setTransactions(persisted);
          }
          setIsStorageReady(true);
        }
      } catch (err) {
        console.error('Storage hydration error:', err);
        if (isMounted) setIsStorageReady(true);
      }
    }
    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync transactions to persistent storage (both IndexedDB and localStorage)
  // CRITICAL: only runs after isStorageReady is true to prevent wiping data with empty state on boot!
  useEffect(() => {
    if (!isStorageReady) return;
    persistAllTransactions(transactions);
  }, [transactions, isStorageReady]);

  // Sync user session to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to sync user session:', e);
    }
  }, [currentUser]);

  // Adjust dashboard filter when purchasing user logs in
  useEffect(() => {
    if (currentUser?.role === 'purchasing' && currentUser.location !== 'ALL') {
      setDashboardLocation(currentUser.location);
    } else if (!currentUser) {
      setDashboardLocation('ALL');
    }
  }, [currentUser]);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = Date.now().toString() + Math.random().toString().slice(2, 6);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Handlers
  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    showToast(`Berhasil login sebagai ${user.displayName}`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    showToast('Berhasil logout dari sistem.', 'info');
  };

  // Add PO (Otomatis tersimpan ke LocalStorage & IndexedDB)
  const handleAddPO = (newPO: Omit<POTransaction, 'id' | 'timestamp'>) => {
    const existing = transactions.find(
      (t) => t.type === 'PO' && t.poNumber === newPO.poNumber
    );
    if (existing) {
      showToast(`Nomor PO ${newPO.poNumber} sudah ada di sistem.`, 'error');
      return;
    }

    const created: POTransaction = {
      ...newPO,
      id: `tx-po-${Date.now()}`,
      timestamp: Date.now(),
    };

    setTransactions((prev) => {
      const next = [created, ...prev];
      persistAllTransactions(next);
      return next;
    });
    showToast(`Master PO ${created.poNumber} berhasil ditambahkan & tersimpan otomatis!`, 'success');
  };

  // Add Inbound (Otomatis tersimpan ke LocalStorage & IndexedDB)
  const handleAddInbound = (newInb: Omit<InboundTransaction, 'id' | 'timestamp'>) => {
    const created: InboundTransaction = {
      ...newInb,
      id: `tx-in-${Date.now()}`,
      timestamp: Date.now(),
    };

    setTransactions((prev) => {
      const next = [created, ...prev];
      persistAllTransactions(next);
      return next;
    });

    let msg = `Penerimaan ${created.qty} palet (Batch ${created.batch}) berhasil & tersimpan otomatis.`;
    if (created.po) {
      const poObj = transactions.find(
        (t): t is POTransaction => t.type === 'PO' && t.poNumber === created.po
      );
      if (poObj) {
        let pastRec = 0;
        transactions.forEach((tx) => {
          if (tx.type === 'IN' && tx.po === created.po) pastRec += tx.qty;
        });
        const remaining = poObj.poQty - pastRec - created.qty;
        if (remaining > 0) {
          msg += ` Sisa PO: ${remaining} palet lagi.`;
        } else if (remaining === 0) {
          msg += ` PO sudah terpenuhi lengkap!`;
        }
      }
    }
    showToast(msg, 'success');
  };

  // Add Single Outbound (Otomatis tersimpan ke LocalStorage & IndexedDB)
  const handleAddOutbound = (newOutb: Omit<OutboundTransaction, 'id' | 'timestamp'>) => {
    const created: OutboundTransaction = {
      ...newOutb,
      id: `tx-out-${Date.now()}`,
      timestamp: Date.now(),
    };

    setTransactions((prev) => {
      const next = [created, ...prev];
      persistAllTransactions(next);
      return next;
    });
    showToast(
      `Pengeluaran ${created.qty} palet dari Batch ${created.batch} berhasil & tersimpan otomatis.`,
      'success'
    );
  };

  // Add Bulk Outbound (Otomatis tersimpan ke LocalStorage & IndexedDB)
  const handleAddBulkOutbound = (
    items: Omit<OutboundTransaction, 'id' | 'timestamp'>[]
  ) => {
    const createdItems: OutboundTransaction[] = items.map((item, idx) => ({
      ...item,
      id: `tx-out-${Date.now()}-${idx}`,
      timestamp: Date.now() + idx,
    }));

    const totalQty = items.reduce((acc, it) => acc + it.qty, 0);

    setTransactions((prev) => {
      const next = [...createdItems, ...prev];
      persistAllTransactions(next);
      return next;
    });
    showToast(
      `Pengeluaran total ${totalQty} palet dari ${items.length} batch berhasil & tersimpan otomatis!`,
      'success'
    );
  };

  // Save Edit Transaction with cascade PO updates
  const handleSaveEdit = (updated: Transaction) => {
    setTransactions((prev) => {
      let next: Transaction[];
      // Check if PO was edited
      if (updated.type === 'PO') {
        const original = prev.find((t) => t.id === updated.id) as POTransaction | undefined;
        if (original) {
          const oldPo = original.poNumber;
          const newPo = updated.poNumber;

          const poUpdated = updated as POTransaction;
          next = prev.map((t) => {
            if (t.id === updated.id) return updated;

            // Cascade update linked inbounds if PO number, qty, or supplier changed
            if (t.type === 'IN' && t.po === oldPo) {
              return {
                ...t,
                po: newPo,
                poQty: poUpdated.poQty,
                supplier: poUpdated.supplier,
              };
            }
            return t;
          });
        } else {
          next = prev.map((t) => (t.id === updated.id ? updated : t));
        }
      } else {
        next = prev.map((t) => (t.id === updated.id ? updated : t));
      }

      persistAllTransactions(next);
      return next;
    });

    showToast('Data berhasil diperbarui & tersimpan otomatis.', 'success');
  };

  // Delete Transaction
  const handleExecuteDelete = () => {
    if (!deletingId) return;
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== deletingId);
      persistAllTransactions(next);
      return next;
    });
    setDeletingId(null);
    showToast('Data berhasil dihapus & perubahan tersimpan otomatis.', 'success');
  };

  // Reset All
  const handleExecuteResetAll = async () => {
    setTransactions([]);
    try {
      saveToLocalStorage([]);
      await saveToIndexedDB([]);
    } catch (e) {
      console.error('Error clearing storage on reset:', e);
    }
    setIsResetConfirmOpen(false);
    showToast('Seluruh data transaksi berhasil di-reset.', 'success');
  };

  // Backup Data to JSON
  const handleBackup = () => {
    if (transactions.length === 0) {
      showToast('Tidak ada data transaksi untuk dibackup.', 'error');
      return;
    }
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_StokPalet_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('File backup data berhasil diunduh.', 'success');
  };

  // Restore Data from JSON with comprehensive multi-format support & bulletproof dual persistence
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        if (!content || !content.trim()) {
          throw new Error('File JSON kosong.');
        }

        const importedData = JSON.parse(content);
        let rawList: any[] = [];

        if (Array.isArray(importedData)) {
          rawList = importedData;
        } else if (importedData && typeof importedData === 'object') {
          // Check common wrapper keys
          const candidateKeys = ['transactions', 'data', 'items', 'records', 'pallets', 'list', 'rows', 'payload'];
          for (const k of candidateKeys) {
            if (Array.isArray((importedData as any)[k])) {
              rawList = (importedData as any)[k];
              break;
            }
          }

          // If still empty, check if any key has stringified JSON array
          if (rawList.length === 0) {
            for (const val of Object.values(importedData)) {
              if (typeof val === 'string' && val.trim().startsWith('[') && val.trim().endsWith(']')) {
                try {
                  const subParsed = JSON.parse(val);
                  if (Array.isArray(subParsed) && subParsed.length > 0) {
                    rawList = subParsed;
                    break;
                  }
                } catch {
                  // ignore
                }
              }
            }
          }

          // If still empty, check if object keys are document records (e.g. { "tx-1": {...}, "tx-2": {...} })
          if (rawList.length === 0) {
            rawList = Object.entries(importedData)
              .filter(([_, val]) => val && typeof val === 'object' && !Array.isArray(val))
              .map(([key, val]: [string, any]) => ({
                ...val,
                id: val.id || key,
              }));
          }
        }

        if (rawList.length === 0) {
          throw new Error('Tidak ditemukan data transaksi yang valid dalam file JSON.');
        }

        // Normalize all incoming items with robust schema normalizer
        const normalizedItems = rawList.map((item, idx) => normalizeTransactionItem(item, idx));

        // When restoring a backup file, adopt all restored items
        // If current state has items, merge them keeping restored items as primary
        let combined: Transaction[] = [];
        if (transactions.length === 0) {
          combined = normalizedItems;
        } else {
          const restoredIdSet = new Set(normalizedItems.map((item) => item.id));
          const nonOverlappingOld = transactions.filter((oldItem) => !restoredIdSet.has(oldItem.id));
          combined = [...normalizedItems, ...nonOverlappingOld];
        }

        // Mark storage ready to enable subsequent syncs
        setIsStorageReady(true);

        // Update state
        setTransactions(combined);

        // Reset location filter to ALL so restored data is immediately visible
        setDashboardLocation('ALL');

        // Immediately persist to BOTH localStorage and IndexedDB (dual-storage)
        saveToLocalStorage(combined);
        await saveToIndexedDB(combined);

        showToast(
          `Restore sukses! ${normalizedItems.length} transaksi dipulihkan & tersimpan permanen.`,
          'success'
        );
      } catch (err: any) {
        console.error('Failed to restore data:', err);
        showToast(
          `Gagal restore: ${err?.message || 'Pastikan file format JSON valid.'}`,
          'error'
        );
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Live Clock & Operational Shift State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dayName = currentTime.toLocaleDateString('id-ID', { weekday: 'long' });
  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const currentHour = currentTime.getHours();
  const shift =
    currentHour >= 7 && currentHour < 15
      ? 'Shift 1 (Pagi)'
      : currentHour >= 15 && currentHour < 23
      ? 'Shift 2 (Sore)'
      : 'Shift 3 (Malam)';

  const getViewTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Saldo Palet';
      case 'po':
        return 'Master PO Procurement';
      case 'inbound':
        return 'Penerimaan Palet (Inbound)';
      case 'outbound':
        return 'Pengeluaran Palet (Outbound)';
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-800">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} />

      {/* Desktop Sidebar (Light Grey Industrial Corporate ERP) */}
      <aside className="w-64 bg-slate-50 text-slate-700 flex-col hidden md:flex shrink-0 border-r border-slate-200 z-30">
        {/* Brand Header */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-200 bg-white">
          <div className="p-1 bg-white rounded-lg border border-slate-200 shadow-xs shrink-0 flex items-center justify-center w-11 h-11">
            <img
              src="./assets/aistudio/kapal_api_b1467dbf.png"
              alt="Logo Kapal Api PT SJA"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-tight">
              Monitoring Palet Kayu Export
            </h1>
            <p className="text-[11px] font-medium text-slate-500 truncate">
              PT Santos Jaya Abadi
            </p>
          </div>
        </div>

        {/* User Status Card */}
        <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200 text-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Akses Pengguna</span>
            {currentUser && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold uppercase">
                {currentUser.role}
              </span>
            )}
          </div>
          <p className="font-semibold text-slate-800 truncate">
            {currentUser ? currentUser.displayName : 'Tamu (Read-Only)'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-300 font-bold'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-4 h-4 shrink-0 text-slate-500" />
            <span>Dashboard Stok</span>
          </button>

          <button
            onClick={() => setActiveTab('po')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'po'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-300 font-bold'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0 text-slate-500" />
            <span>Input PO Proc.</span>
          </button>

          <button
            onClick={() => setActiveTab('inbound')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'inbound'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-300 font-bold'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 shrink-0 text-slate-500" />
            <span>Kedatangan (IN)</span>
          </button>

          <button
            onClick={() => setActiveTab('outbound')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'outbound'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-300 font-bold'
                : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 shrink-0 text-slate-500" />
            <span>Pengeluaran (OUT)</span>
          </button>
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-200 bg-white mt-auto">
          {!currentUser ? (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login Sistem</span>
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition text-xs font-semibold cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5 text-slate-500" />
              <span>Logout ({currentUser.username})</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Bar with Live Clock & Date */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs shrink-0">
          {/* Left: View title & breadcrumb */}
          <div className="flex items-center gap-2.5">
            <div className="md:hidden p-0.5 bg-white rounded border border-slate-200 shrink-0 w-7 h-7 flex items-center justify-center">
              <img
                src="./assets/aistudio/kapal_api_b1467dbf.png"
                alt="Logo Kapal Api"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 hidden sm:block">
                PT SJA · Monitoring Palet Kayu Export
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {getViewTitle()}
              </h2>
            </div>
          </div>

          {/* Right: Live Real-Time Date & Time Clock */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="hidden sm:inline">{dayName},</span>
                <span>{formattedDate}</span>
              </div>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <div className="font-mono tabular-nums font-bold text-slate-900 tracking-tight flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{formattedTime}</span>
                <span className="text-[10px] font-normal text-slate-500">WIB</span>
              </div>
              <span className="text-slate-300 hidden md:inline" aria-hidden="true">·</span>
              <span className="text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 hidden md:inline">
                {shift}
              </span>
              <span className="text-slate-300 hidden lg:inline" aria-hidden="true">·</span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hidden lg:flex items-center gap-1.5" title="Semua data PO, Kedatangan, dan Pengeluaran tersimpan otomatis secara permanen">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Auto-Save Aktif</span>
              </span>
            </div>

            {/* Mobile login / logout toggle */}
            <div className="md:hidden">
              {!currentUser ? (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="p-1.5 text-xs bg-slate-800 text-white rounded-lg flex items-center gap-1 font-medium"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-xs bg-slate-100 border border-slate-300 text-slate-700 rounded-lg flex items-center gap-1"
                >
                  <Unlock className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-around text-xs shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-md font-medium ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-900 border border-slate-300 font-bold shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('po')}
            className={`px-3 py-1.5 rounded-md font-medium ${
              activeTab === 'po'
                ? 'bg-white text-slate-900 border border-slate-300 font-bold shadow-xs'
                : 'text-slate-600'
            }`}
          >
            PO
          </button>
          <button
            onClick={() => setActiveTab('inbound')}
            className={`px-3 py-1.5 rounded-md font-medium ${
              activeTab === 'inbound'
                ? 'bg-white text-slate-900 border border-slate-300 font-bold shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Inbound
          </button>
          <button
            onClick={() => setActiveTab('outbound')}
            className={`px-3 py-1.5 rounded-md font-medium ${
              activeTab === 'outbound'
                ? 'bg-white text-slate-900 border border-slate-300 font-bold shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Outbound
          </button>
        </div>

        {/* Scrollable View Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                transactions={transactions}
                currentUser={currentUser}
                selectedLocation={dashboardLocation}
                onLocationChange={setDashboardLocation}
                onNavigate={setActiveTab}
                onEdit={setEditingTransaction}
                onDelete={setDeletingId}
                onConfirmReset={() => setIsResetConfirmOpen(true)}
                onBackup={handleBackup}
                onRestore={handleRestore}
              />
            )}

            {activeTab === 'po' && (
              <POView
                transactions={transactions}
                currentUser={currentUser}
                onAddPO={handleAddPO}
                onEdit={setEditingTransaction}
                onDelete={setDeletingId}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'inbound' && (
              <InboundView
                transactions={transactions}
                currentUser={currentUser}
                onAddInbound={handleAddInbound}
                onEdit={setEditingTransaction}
                onDelete={setDeletingId}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'outbound' && (
              <OutboundView
                transactions={transactions}
                currentUser={currentUser}
                onAddOutbound={handleAddOutbound}
                onAddBulkOutbound={handleAddBulkOutbound}
                onEdit={setEditingTransaction}
                onDelete={setDeletingId}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}
          </div>
        </div>
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* Edit Modal */}
      <EditModal
        isOpen={!!editingTransaction}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        type="delete"
        onClose={() => setDeletingId(null)}
        onConfirm={handleExecuteDelete}
      />

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        type="reset"
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleExecuteResetAll}
      />
    </div>
  );
}
