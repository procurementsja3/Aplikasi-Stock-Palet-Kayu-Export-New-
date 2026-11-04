import React, { useState, useMemo } from 'react';
import {
  Box,
  Truck,
  CheckCircle2,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Package,
} from 'lucide-react';
import {
  Transaction,
  InboundTransaction,
  OutboundTransaction,
  LocationType,
  AppUser,
  POStatusItem,
  BatchBalance,
} from '../types/pallet';
import { PLANT_LOCATIONS } from '../data/initialData';
import { ParetoChart } from './ParetoChart';

interface DashboardViewProps {
  transactions: Transaction[];
  currentUser: AppUser | null;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  onNavigate: (view: 'dashboard' | 'po' | 'inbound' | 'outbound') => void;
  onEdit: (trx: Transaction) => void;
  onDelete: (id: string) => void;
  onConfirmReset: () => void;
  onBackup: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ITEMS_PER_PAGE_PO = 10;
const ITEMS_PER_PAGE_DASH = 5;

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  currentUser,
  selectedLocation,
  onLocationChange,
  onNavigate,
  onEdit,
  onDelete,
  onConfirmReset,
  onBackup,
  onRestore,
}) => {
  // Pagination states
  const [poPage, setPoPage] = useState(1);
  const [inboundPage, setInboundPage] = useState(1);
  const [outboundPage, setOutboundPage] = useState(1);

  // Filter transactions based on selected location (flexible matching)
  const filteredTransactions = useMemo(() => {
    if (!selectedLocation || selectedLocation === 'ALL') return transactions;
    const target = selectedLocation.trim().toUpperCase();
    return transactions.filter((t) => {
      const loc = String(t.lokasi || '').trim().toUpperCase();
      return loc === target || loc.replace('SJA ', '') === target.replace('SJA ', '');
    });
  }, [transactions, selectedLocation]);

  // Calculate stock balance grouped by Batch + Lokasi
  const batchBalances = useMemo(() => {
    const map: Record<string, BatchBalance> = {};

    filteredTransactions.forEach((trx) => {
      const trxType = String(trx.type || '').toUpperCase();
      if (trxType === 'PO') return;

      const item = trx as InboundTransaction | OutboundTransaction;
      const loc = item.lokasi || ('-' as LocationType);
      const batchCode = item.batch || '-';
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

      const qty = Number(item.qty) || 0;
      if (trxType === 'IN') {
        map[key].totalIn += qty;
      } else if (trxType === 'OUT') {
        map[key].totalOut += qty;
      }

      map[key].currentBalance = map[key].totalIn - map[key].totalOut;
    });

    return Object.values(map);
  }, [filteredTransactions]);

  // Overall Totals
  const { totalIn, totalOut, currentBalanceTotal } = useMemo(() => {
    let tIn = 0;
    let tOut = 0;

    batchBalances.forEach((b) => {
      tIn += b.totalIn;
      tOut += b.totalOut;
    });

    return {
      totalIn: tIn,
      totalOut: tOut,
      currentBalanceTotal: tIn - tOut,
    };
  }, [batchBalances]);

  // Prepare Outstanding PO status list
  const allFilteredPOs = useMemo(() => {
    const poStatus: Record<string, POStatusItem> = {};

    // 1. Gather all POs in filtered set
    filteredTransactions.forEach((trx) => {
      if (trx.type === 'PO') {
        poStatus[trx.poNumber] = {
          po: trx.poNumber,
          supplier: trx.supplier,
          poQty: trx.poQty,
          received: 0,
          lokasi: trx.lokasi,
          datePO: trx.date,
          lastDateInbound: null,
          batch: [],
          lastTimestamp: trx.timestamp || 0,
          poId: trx.id,
        };
      }
    });

    // 2. Tally inbound receipts
    filteredTransactions.forEach((trx) => {
      if (trx.type === 'IN' && trx.po) {
        if (!poStatus[trx.po]) {
          poStatus[trx.po] = {
            po: trx.po,
            supplier: trx.supplier,
            poQty: trx.poQty || 0,
            received: 0,
            lokasi: trx.lokasi,
            datePO: trx.date,
            lastDateInbound: trx.date,
            batch: [],
            lastTimestamp: trx.timestamp || 0,
          };
        }
        poStatus[trx.po].received += trx.qty;
        if (trx.batch && !poStatus[trx.po].batch.includes(trx.batch)) {
          poStatus[trx.po].batch.push(trx.batch);
        }
        if (
          !transactions.find((t) => t.type === 'PO' && t.poNumber === trx.po) &&
          (trx.poQty || 0) > poStatus[trx.po].poQty
        ) {
          poStatus[trx.po].poQty = trx.poQty || 0;
        }

        const tStamp = trx.timestamp || 0;
        if (tStamp > poStatus[trx.po].lastTimestamp) {
          poStatus[trx.po].lastDateInbound = trx.date;
          poStatus[trx.po].lastTimestamp = tStamp;
        }
      }
    });

    return Object.values(poStatus).sort((a, b) => {
      const aOut = a.poQty - a.received;
      const bOut = b.poQty - b.received;

      // OPEN first
      if (aOut > 0 && bOut <= 0) return -1;
      if (aOut <= 0 && bOut > 0) return 1;

      return b.lastTimestamp - a.lastTimestamp;
    });
  }, [filteredTransactions, transactions]);

  // Open POs for alert banner
  const openPOs = useMemo(() => {
    return allFilteredPOs.filter((p) => p.poQty - p.received > 0);
  }, [allFilteredPOs]);

  // Filtered Inbounds & Outbounds for dashboard tables
  const allFilteredInbounds = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'IN')
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [filteredTransactions]);

  const allFilteredOutbounds = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'OUT')
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [filteredTransactions]);

  // Paginated slices
  const paginatedPOs = useMemo(() => {
    const start = (poPage - 1) * ITEMS_PER_PAGE_PO;
    return allFilteredPOs.slice(start, start + ITEMS_PER_PAGE_PO);
  }, [allFilteredPOs, poPage]);

  const paginatedInbounds = useMemo(() => {
    const start = (inboundPage - 1) * ITEMS_PER_PAGE_DASH;
    return allFilteredInbounds.slice(start, start + ITEMS_PER_PAGE_DASH);
  }, [allFilteredInbounds, inboundPage]);

  const paginatedOutbounds = useMemo(() => {
    const start = (outboundPage - 1) * ITEMS_PER_PAGE_DASH;
    return allFilteredOutbounds.slice(start, start + ITEMS_PER_PAGE_DASH);
  }, [allFilteredOutbounds, outboundPage]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Filter & Admin Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">
              Unit Monitoring Inventaris
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Ringkasan Saldo Palet Lintas Plant
            </h2>
          </div>
          <div className="sm:ml-4">
            <select
              value={selectedLocation}
              onChange={(e) => {
                onLocationChange(e.target.value);
                setPoPage(1);
                setInboundPage(1);
                setOutboundPage(1);
              }}
              className="border border-slate-300 text-slate-800 font-semibold rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 shadow-2xs cursor-pointer"
            >
              <option value="ALL">Semua Lokasi (All Plant SJA)</option>
              {PLANT_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Admin Tools */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onConfirmReset}
              className="bg-white hover:bg-rose-50 text-rose-700 border border-slate-300 hover:border-rose-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Reset seluruh data sistem"
            >
              <Trash2 className="w-3.5 h-3.5" /> Reset Data
            </button>
            <button
              onClick={onBackup}
              className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Unduh backup data JSON"
            >
              <Download className="w-3.5 h-3.5" /> Backup
            </button>
            <label className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs">
              <Upload className="w-3.5 h-3.5 text-slate-500" /> Restore
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={onRestore}
              />
            </label>
          </div>
        )}
      </div>

      {/* Notice if Location Filter yields 0 records but global data exists */}
      {selectedLocation !== 'ALL' && filteredTransactions.length === 0 && transactions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Tidak ada data transaksi untuk <strong>{selectedLocation}</strong>. Ditemukan {transactions.length} transaksi di plant lain.
            </span>
          </div>
          <button
            onClick={() => onLocationChange('ALL')}
            className="text-amber-900 hover:text-amber-950 font-bold underline cursor-pointer text-xs"
          >
            Tampilkan Semua Lokasi
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
              Total Palet Masuk
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {totalIn.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Akumulasi penerimaan inbound
            </p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            <Box className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
              Total Palet Keluar
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {totalOut.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Palet dipakai / ditransfer
            </p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
              Sisa Saldo Aktual
            </p>
            <p
              className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
                currentBalanceTotal < 20 && currentBalanceTotal > 0
                  ? 'text-amber-700'
                  : currentBalanceTotal === 0
                  ? 'text-rose-700'
                  : 'text-slate-900'
              }`}
            >
              {currentBalanceTotal.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Palet siap digunakan
            </p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Pareto Chart (Tampil bila filter ALL) */}
      {selectedLocation === 'ALL' && (
        <ParetoChart
          transactions={transactions}
          onRefresh={() => {
            // Trigger chart refresh if needed
          }}
        />
      )}

      {/* Rincian Saldo per Kode Batch */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <div className="p-4 flex justify-between items-center bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Rincian Saldo per Kode Batch
            </h3>
          </div>
          <span className="text-xs font-mono font-medium text-slate-600 bg-white px-2.5 py-0.5 rounded border border-slate-200">
            {batchBalances.length} Batch Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100/75 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200/80">
                <th className="p-3.5 sm:p-4 font-bold">Lokasi</th>
                <th className="p-3.5 sm:p-4 font-bold">Kode Batch</th>
                <th className="p-3.5 sm:p-4 font-bold text-right">Total Masuk</th>
                <th className="p-3.5 sm:p-4 font-bold text-right">Total Keluar</th>
                <th className="p-3.5 sm:p-4 font-bold text-center">Sisa Saldo</th>
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm divide-y divide-slate-100">
              {batchBalances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Belum ada data pergerakan palet di lokasi ini.
                  </td>
                </tr>
              ) : (
                batchBalances.map((b) => {
                  const isZero = b.currentBalance === 0;
                  return (
                    <tr
                      key={`${b.batch}-${b.lokasi}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="p-3 sm:p-3.5 font-medium text-slate-700">
                        {b.lokasi}
                      </td>
                      <td className="p-3 sm:p-3.5 font-mono font-bold text-slate-800">
                        {b.batch}
                      </td>
                      <td className="p-3 sm:p-3.5 text-right text-slate-700 font-mono tabular-nums">
                        +{b.totalIn.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 sm:p-3.5 text-right text-slate-700 font-mono tabular-nums">
                        -{b.totalOut.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 sm:p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border inline-block ${
                            isZero
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {b.currentBalance.toLocaleString('id-ID')} Palet
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outstanding PO Status Table */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <div className="p-4 flex justify-between items-center bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm">
              Status Outstanding PO Procurement
            </h3>
          </div>
          <button
            onClick={() => onNavigate('po')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
          >
            Kelola Master PO <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alert Banner for Open POs */}
        {openPOs.length > 0 && (
          <div className="m-4 p-3.5 bg-amber-50/60 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="w-full text-xs">
                <p className="font-bold text-amber-900 mb-1">
                  Perhatian: Terdapat {openPOs.length} Purchase Order berstatus OPEN (Kekurangan palet):
                </p>
                <ul className="list-disc list-inside text-amber-800 space-y-0.5">
                  {openPOs.map((p) => {
                    const sisa = p.poQty - p.received;
                    return (
                      <li key={p.po}>
                        <strong>{p.po}</strong> ({p.supplier}) di <span className="font-semibold">{p.lokasi}</span> — Kurang{' '}
                        <span className="font-mono font-bold">{sisa}</span> palet
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-3 sm:p-3.5 font-bold">Tanggal PO</th>
                <th className="p-3 sm:p-3.5 font-bold">No. PO</th>
                <th className="p-3 sm:p-3.5 font-bold">Supplier</th>
                <th className="p-3 sm:p-3.5 font-bold">Lokasi</th>
                <th className="p-3 sm:p-3.5 font-bold text-center">Qty PO</th>
                <th className="p-3 sm:p-3.5 font-bold text-center">Diterima</th>
                <th className="p-3 sm:p-3.5 font-bold text-center">Outstanding</th>
                <th className="p-3 sm:p-3.5 font-bold text-center">Status</th>
                {isAdmin && (
                  <th className="p-3 sm:p-3.5 font-bold text-center w-24">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm divide-y divide-slate-100">
              {paginatedPOs.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-slate-400">
                    Belum ada data Purchase Order di lokasi ini.
                  </td>
                </tr>
              ) : (
                paginatedPOs.map((p) => {
                  const outstanding = p.poQty - p.received;
                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium border border-slate-200">
                      -
                    </span>
                  );
                  let outstandingText = (
                    <span className="font-mono font-bold text-slate-600">{outstanding}</span>
                  );

                  if (outstanding > 0) {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                        Open
                      </span>
                    );
                    outstandingText = (
                      <span className="font-mono font-bold text-amber-700">
                        {outstanding} Palet
                      </span>
                    );
                  } else if (outstanding === 0) {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        Closed
                      </span>
                    );
                    outstandingText = (
                      <span className="font-mono font-bold text-slate-600">0</span>
                    );
                  } else {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                        Over
                      </span>
                    );
                    outstandingText = (
                      <span className="font-mono font-bold text-rose-700">
                        Lebih {Math.abs(outstanding)}
                      </span>
                    );
                  }

                  const masterTrx = transactions.find(
                    (t) => t.type === 'PO' && t.poNumber === p.po
                  );

                  return (
                    <tr key={p.po} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 sm:p-4 text-slate-600">
                        {formatDate(p.datePO || p.lastDateInbound || undefined)}
                      </td>
                      <td className="p-3.5 sm:p-4 font-mono font-bold text-indigo-700">
                        {p.po}
                      </td>
                      <td className="p-3.5 sm:p-4 text-slate-800 font-medium">
                        {p.supplier}
                      </td>
                      <td className="p-3.5 sm:p-4">
                        <span className="bg-amber-100/70 text-amber-900 px-2 py-0.5 rounded text-[11px] font-bold">
                          {p.lokasi}
                        </span>
                      </td>
                      <td className="p-3.5 sm:p-4 text-center font-bold text-slate-800 font-mono bg-slate-50/50">
                        {p.poQty}
                      </td>
                      <td className="p-3.5 sm:p-4 text-center font-bold text-blue-600 font-mono bg-blue-50/30">
                        {p.received}
                      </td>
                      <td className="p-3.5 sm:p-4 text-center">{outstandingText}</td>
                      <td className="p-3.5 sm:p-4 text-center">{statusBadge}</td>
                      {isAdmin && (
                        <td className="p-3.5 sm:p-4 text-center">
                          {masterTrx ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onEdit(masterTrx)}
                                className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                                title="Edit Master PO"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDelete(masterTrx.id)}
                                className="text-rose-600 hover:text-rose-800 p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                                title="Hapus Master PO"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Via Inbound
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PO Pagination Controls */}
        {allFilteredPOs.length > ITEMS_PER_PAGE_PO && (
          <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs text-slate-500">
              Menampilkan {(poPage - 1) * ITEMS_PER_PAGE_PO + 1} -{' '}
              {Math.min(poPage * ITEMS_PER_PAGE_PO, allFilteredPOs.length)} dari{' '}
              {allFilteredPOs.length} data PO
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPoPage((p) => Math.max(1, p - 1))}
                disabled={poPage <= 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
              </button>
              <button
                onClick={() =>
                  setPoPage((p) =>
                    p * ITEMS_PER_PAGE_PO < allFilteredPOs.length ? p + 1 : p
                  )
                }
                disabled={poPage * ITEMS_PER_PAGE_PO >= allFilteredPOs.length}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Riwayat Kedatangan Terakhir & Riwayat Pengeluaran Terakhir */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Riwayat Kedatangan */}
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
          <div className="p-4 flex justify-between items-center bg-slate-50/80 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Riwayat Kedatangan Terakhir
              </h3>
              <p className="text-[11px] text-slate-500">Log penerimaan inbound supplier</p>
            </div>
            <button
              onClick={() => onNavigate('inbound')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
            >
              Input Masuk <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3 font-semibold">Tgl</th>
                  <th className="p-3 font-semibold">Lokasi</th>
                  <th className="p-3 font-semibold">Supplier & PO</th>
                  <th className="p-3 font-semibold">Batch</th>
                  <th className="p-3 font-semibold text-right">Qty</th>
                  {isAdmin && <th className="p-3 font-semibold text-center w-20">Aksi</th>}
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {paginatedInbounds.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="p-6 text-center text-slate-400">
                      Belum ada data kedatangan palet.
                    </td>
                  </tr>
                ) : (
                  paginatedInbounds.map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-slate-600">{formatDate(trx.date)}</td>
                      <td className="p-3 text-slate-700 font-medium">
                        {trx.lokasi}
                      </td>
                      <td className="p-3 text-slate-800">
                        <div className="font-medium truncate max-w-[130px]" title={trx.supplier}>
                          {trx.supplier}
                        </div>
                        {trx.po && (
                          <span className="inline-block mt-0.5 text-[10px] font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            PO: {trx.po}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {trx.batch}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-bold text-slate-800">
                        +{trx.qty}
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

          {allFilteredInbounds.length > ITEMS_PER_PAGE_DASH && (
            <div className="p-3 border-t border-slate-200 bg-slate-50/60 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono">
                {(inboundPage - 1) * ITEMS_PER_PAGE_DASH + 1} -{' '}
                {Math.min(inboundPage * ITEMS_PER_PAGE_DASH, allFilteredInbounds.length)} dari{' '}
                {allFilteredInbounds.length}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setInboundPage((p) => Math.max(1, p - 1))}
                  disabled={inboundPage <= 1}
                  className="px-2.5 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() =>
                    setInboundPage((p) =>
                      p * ITEMS_PER_PAGE_DASH < allFilteredInbounds.length ? p + 1 : p
                    )
                  }
                  disabled={inboundPage * ITEMS_PER_PAGE_DASH >= allFilteredInbounds.length}
                  className="px-2.5 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Riwayat Pengeluaran */}
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
          <div className="p-4 flex justify-between items-center bg-slate-50/80 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Riwayat Pengeluaran Terakhir
              </h3>
              <p className="text-[11px] text-slate-500">Log pemakaian / transfer palet</p>
            </div>
            <button
              onClick={() => onNavigate('outbound')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
            >
              Input Keluar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3 font-semibold">Tgl</th>
                  <th className="p-3 font-semibold">Lokasi</th>
                  <th className="p-3 font-semibold">Batch</th>
                  <th className="p-3 font-semibold text-right">Qty Keluar</th>
                  <th className="p-3 font-semibold">Tujuan / Ket.</th>
                  {isAdmin && <th className="p-3 font-semibold text-center w-20">Aksi</th>}
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {paginatedOutbounds.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="p-6 text-center text-slate-400">
                      Belum ada data pengeluaran palet.
                    </td>
                  </tr>
                ) : (
                  paginatedOutbounds.map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-slate-600">{formatDate(trx.date)}</td>
                      <td className="p-3 text-slate-700 font-medium">
                        {trx.lokasi}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {trx.batch}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-bold text-slate-800">
                        -{trx.qty}
                      </td>
                      <td
                        className="p-3 text-slate-500 truncate max-w-[140px]"
                        title={trx.notes || '-'}
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

          {allFilteredOutbounds.length > ITEMS_PER_PAGE_DASH && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                {(outboundPage - 1) * ITEMS_PER_PAGE_DASH + 1} -{' '}
                {Math.min(outboundPage * ITEMS_PER_PAGE_DASH, allFilteredOutbounds.length)} dari{' '}
                {allFilteredOutbounds.length}
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setOutboundPage((p) => Math.max(1, p - 1))}
                  disabled={outboundPage <= 1}
                  className="px-2.5 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={() =>
                    setOutboundPage((p) =>
                      p * ITEMS_PER_PAGE_DASH < allFilteredOutbounds.length ? p + 1 : p
                    )
                  }
                  disabled={outboundPage * ITEMS_PER_PAGE_DASH >= allFilteredOutbounds.length}
                  className="px-2.5 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
