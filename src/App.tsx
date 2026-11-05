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
  Sun,
  Moon,
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

  // Theme State: 'light' | 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem('sja_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Sync theme to document.documentElement and localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sja_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Failed to sync theme:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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

  const navTabs = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard Stok',
      shortLabel: 'Dashboard',
      icon: PieChart,
    },
    {
      id: 'po' as const,
      label: 'Input PO Proc.',
      shortLabel: 'PO Proc.',
      icon: FileSpreadsheet,
    },
    {
      id: 'inbound' as const,
      label: 'Kedatangan (IN)',
      shortLabel: 'Inbound (IN)',
      icon: ArrowDownLeft,
    },
    {
      id: 'outbound' as const,
      label: 'Pengeluaran (OUT)',
      shortLabel: 'Outbound (OUT)',
      icon: ArrowUpRight,
    },
  ];

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
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} />

      {/* Desktop Sidebar (Industrial Corporate ERP) */}
      <aside className="w-64 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex-col hidden md:flex shrink-0 border-r border-slate-200 dark:border-slate-800 z-30 transition-colors duration-200">
        {/* Brand Header */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-200">
          <div className="p-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 flex items-center justify-center w-11 h-11">
            <img
              src="./assets/aistudio/kapal_api_b1467dbf.png"
              alt="Logo Kapal Api PT SJA"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Monitoring Palet Kayu Export
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              PT Santos Jaya Abadi
            </p>
          </div>
        </div>

        {/* User Status Card with Crisp Dark Mode Contrast */}
        <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs transition-colors duration-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              Akses Pengguna
            </span>
            {currentUser ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold uppercase">
                {currentUser.role}
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300/70 dark:border-slate-700 font-medium">
                Publik
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                currentUser ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-400 dark:bg-slate-500'
              }`}
            />
            <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">
              {currentUser ? currentUser.displayName : 'Tamu (Read-Only)'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs with Smooth Micro-Interactions */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer select-none transition-all duration-200 ease-out active:scale-[0.98] ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs border border-slate-300 dark:border-slate-700 font-bold translate-x-1 ring-1 ring-slate-900/5 dark:ring-white/5'
                    : 'text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-200/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:translate-x-1'
                }`}
              >
                {/* Active Accent Bar Indicator with smooth scale animation */}
                <span
                  className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full transition-all duration-200 ease-out ${
                    isActive
                      ? 'bg-blue-600 dark:bg-amber-500 opacity-100 scale-y-100'
                      : 'bg-transparent opacity-0 scale-y-0 group-hover:bg-slate-400/40 dark:group-hover:bg-slate-600/40 group-hover:opacity-100 group-hover:scale-y-75'
                  }`}
                />

                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ease-out ${
                    isActive
                      ? 'text-blue-600 dark:text-amber-400 scale-110'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-amber-400 group-hover:scale-110 group-hover:-rotate-3'
                  }`}
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto transition-colors duration-200 space-y-2">
          {/* Quick theme toggle in sidebar as well */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs font-medium cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
            </div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
              {theme === 'dark' ? 'Gelap' : 'Terang'}
            </span>
          </button>

          {!currentUser ? (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-lg transition text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login Sistem</span>
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg transition text-xs font-semibold cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Logout ({currentUser.username})</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Bar with Live Clock, Theme Toggle & Date */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs shrink-0 transition-colors duration-200">
          {/* Left: View title & breadcrumb */}
          <div className="flex items-center gap-2.5">
            <div className="md:hidden p-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shrink-0 w-7 h-7 flex items-center justify-center">
              <img
                src="./assets/aistudio/kapal_api_b1467dbf.png"
                alt="Logo Kapal Api"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
                PT SJA · Monitoring Palet Kayu Export
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                {getViewTitle()}
              </h2>
            </div>
          </div>

          {/* Right: Live Real-Time Date, Theme Toggle & Time Clock */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Clock & Shift Badge */}
            <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                <span className="hidden sm:inline">{dayName},</span>
                <span>{formattedDate}</span>
              </div>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
              <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{formattedTime}</span>
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">WIB</span>
              </div>
              <span className="text-slate-300 dark:text-slate-600 hidden md:inline" aria-hidden="true">·</span>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hidden md:inline">
                {shift}
              </span>
              <span className="text-slate-300 dark:text-slate-600 hidden lg:inline" aria-hidden="true">·</span>
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 hidden lg:flex items-center gap-1.5" title="Semua data PO, Kedatangan, dan Pengeluaran tersimpan otomatis secara permanen">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Auto-Save Aktif</span>
              </span>
            </div>

            {/* Mode Terang / Mode Gelap Toggle Button */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs font-semibold cursor-pointer shadow-xs"
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                  <span className="hidden md:inline">Mode Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  <span className="hidden md:inline">Mode Gelap</span>
                </>
              )}
            </button>

            {/* Mobile login / logout toggle */}
            <div className="md:hidden">
              {!currentUser ? (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="p-1.5 text-xs bg-slate-800 dark:bg-amber-600 text-white rounded-lg flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Bar with Smooth Indicator */}
        <div className="md:hidden bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around text-xs shrink-0 transition-colors duration-200 gap-1 overflow-x-auto">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 ease-out active:scale-95 shrink-0 select-none ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 transition-colors duration-200 ${
                    isActive ? 'text-blue-600 dark:text-amber-400' : 'text-slate-400'
                  }`}
                />
                <span>{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable View Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 dark:bg-slate-950 transition-colors duration-200">
          <div key={activeTab} className="max-w-7xl mx-auto animate-view-fade">
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
                isDarkMode={theme === 'dark'}
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
