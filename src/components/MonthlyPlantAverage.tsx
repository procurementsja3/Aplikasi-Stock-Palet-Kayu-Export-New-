import React, { useState, useMemo } from 'react';
import {
  Building2,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Transaction, LocationType } from '../types/pallet';
import { PLANT_LOCATIONS } from '../data/initialData';

interface MonthlyPlantAverageProps {
  transactions: Transaction[];
  selectedLocation: string;
  onSelectLocation?: (loc: string) => void;
}

interface PlantMonthlyStats {
  plant: LocationType;
  totalIn: number;
  totalOut: number;
  currentBalance: number;
  activeMonthsCount: number;
  avgInPerMonth: number;
  avgOutPerMonth: number;
  netFlowPerMonth: number;
  utilizationRate: number; // Out / In * 100
  monthsList: string[]; // ['2025-01', '2025-02']
  monthBreakdown: Record<string, { in: number; out: number; net: number }>;
}

export const MonthlyPlantAverage: React.FC<MonthlyPlantAverageProps> = ({
  transactions,
  selectedLocation,
  onSelectLocation,
}) => {
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Format YYYY-MM to readable Indonesian month
  const formatMonthName = (yearMonth: string): string => {
    try {
      const [year, month] = yearMonth.split('-');
      if (!year || !month) return yearMonth;
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    } catch {
      return yearMonth;
    }
  };

  // Helper to normalize location string matching
  const matchPlant = (loc: string | undefined, targetPlant: LocationType): boolean => {
    if (!loc) return false;
    const cleanA = loc.trim().toUpperCase().replace('SJA ', '');
    const cleanB = targetPlant.trim().toUpperCase().replace('SJA ', '');
    return cleanA === cleanB;
  };

  // Compute statistics per plant and aggregate
  const { plantStatsList, consolidatedStats, allDistinctMonths } = useMemo(() => {
    const allMonthsSet = new Set<string>();

    const stats: PlantMonthlyStats[] = PLANT_LOCATIONS.map((plant) => {
      let tIn = 0;
      let tOut = 0;
      const mBreakdown: Record<string, { in: number; out: number; net: number }> = {};

      transactions.forEach((tx) => {
        if (tx.type === 'PO') return;
        if (!matchPlant(tx.lokasi, plant)) return;

        // Determine month key (YYYY-MM)
        let monthKey = '';
        if (tx.date && tx.date.length >= 7) {
          monthKey = tx.date.slice(0, 7);
        } else if (tx.timestamp) {
          monthKey = new Date(tx.timestamp).toISOString().slice(0, 7);
        } else {
          monthKey = new Date().toISOString().slice(0, 7);
        }

        allMonthsSet.add(monthKey);

        if (!mBreakdown[monthKey]) {
          mBreakdown[monthKey] = { in: 0, out: 0, net: 0 };
        }

        const qty = Number(tx.qty) || 0;
        if (tx.type === 'IN') {
          tIn += qty;
          mBreakdown[monthKey].in += qty;
          mBreakdown[monthKey].net += qty;
        } else if (tx.type === 'OUT') {
          tOut += qty;
          mBreakdown[monthKey].out += qty;
          mBreakdown[monthKey].net -= qty;
        }
      });

      const monthsList = Object.keys(mBreakdown).sort();
      const activeMonthsCount = monthsList.length || 1;
      const avgInPerMonth = Math.round(tIn / activeMonthsCount);
      const avgOutPerMonth = Math.round(tOut / activeMonthsCount);
      const netFlowPerMonth = avgInPerMonth - avgOutPerMonth;
      const utilizationRate = tIn > 0 ? Math.round((tOut / tIn) * 100) : 0;

      return {
        plant,
        totalIn: tIn,
        totalOut: tOut,
        currentBalance: tIn - tOut,
        activeMonthsCount: monthsList.length,
        avgInPerMonth,
        avgOutPerMonth,
        netFlowPerMonth,
        utilizationRate,
        monthsList,
        monthBreakdown: mBreakdown,
      };
    });

    // Consolidated across all plants
    const allMonthsSorted = Array.from(allMonthsSet).sort();
    const totalInAll = stats.reduce((acc, s) => acc + s.totalIn, 0);
    const totalOutAll = stats.reduce((acc, s) => acc + s.totalOut, 0);
    const distinctMonthsCount = allMonthsSorted.length || 1;

    const consolidated: PlantMonthlyStats = {
      plant: 'SJA SEPANJANG' as LocationType, // label as total
      totalIn: totalInAll,
      totalOut: totalOutAll,
      currentBalance: totalInAll - totalOutAll,
      activeMonthsCount: distinctMonthsCount,
      avgInPerMonth: Math.round(totalInAll / distinctMonthsCount),
      avgOutPerMonth: Math.round(totalOutAll / distinctMonthsCount),
      netFlowPerMonth: Math.round((totalInAll - totalOutAll) / distinctMonthsCount),
      utilizationRate: totalInAll > 0 ? Math.round((totalOutAll / totalInAll) * 100) : 0,
      monthsList: allMonthsSorted,
      monthBreakdown: {},
    };

    return {
      plantStatsList: stats,
      consolidatedStats: consolidated,
      allDistinctMonths: allMonthsSorted,
    };
  }, [transactions]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
      {/* Header Container */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
              Rata-Rata Palet Masuk & Keluar per Bulan per Plant
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dihitung dari riwayat mutasi bulanan (IN & OUT) di masing-masing plant PT Santos Jaya Abadi
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Switch View (Cards vs Table) */}
          <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kartu Plant
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tabel Komparasi
            </button>
          </div>

          {/* Toggle Breakdown per Month */}
          <button
            onClick={() => setShowMonthlyBreakdown((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title="Tampilkan rincian data transaksi bulan per bulan"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Rincian Bulanan</span>
            {showMonthlyBreakdown ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* CARDS VIEW */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plantStatsList.map((stat) => {
              const isSelected =
                selectedLocation !== 'ALL' &&
                (selectedLocation === stat.plant ||
                  selectedLocation.replace('SJA ', '') === stat.plant.replace('SJA ', ''));

              const hasData = stat.totalIn > 0 || stat.totalOut > 0;

              return (
                <div
                  key={stat.plant}
                  onClick={() => onSelectLocation && onSelectLocation(stat.plant)}
                  className={`rounded-xl p-4 border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-50/40 dark:bg-slate-800 border-blue-400 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  {/* Plant Title & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {stat.plant}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {stat.activeMonthsCount > 0
                            ? `${stat.activeMonthsCount} bln tercatat`
                            : 'Belum ada data'}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white shadow-2xs">
                        Aktif
                      </span>
                    )}
                  </div>

                  {/* 2 Main Monthly Average Stats */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 mb-3">
                    {/* Rata-Rata Masuk (IN) / Bulan */}
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">
                        <ArrowDownLeft className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Rata2 IN</span>
                      </div>
                      <p className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums mt-0.5">
                        +{stat.avgInPerMonth.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">palet / bulan</p>
                    </div>

                    {/* Rata-Rata Keluar (OUT) / Bulan */}
                    <div className="border-l border-slate-200 dark:border-slate-800 pl-2">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-tight">
                        <ArrowUpRight className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>Rata2 OUT</span>
                      </div>
                      <p className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums mt-0.5">
                        -{stat.avgOutPerMonth.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">palet / bulan</p>
                    </div>
                  </div>

                  {/* Net Monthly Flow & Utilization */}
                  <div className="space-y-1.5 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        {stat.netFlowPerMonth >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-rose-500" />
                        )}
                        <span>Net Aliran:</span>
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          stat.netFlowPerMonth >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {stat.netFlowPerMonth > 0 ? '+' : ''}
                        {stat.netFlowPerMonth.toLocaleString('id-ID')} / bln
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Total Masuk / Keluar:</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {stat.totalIn.toLocaleString('id-ID')} / {stat.totalOut.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Rasio Utilisasi:</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {hasData ? `${stat.utilizationRate}%` : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Nama Plant</th>
                  <th className="p-3 text-center">Bulan Aktif</th>
                  <th className="p-3 text-right">Akumulasi Masuk</th>
                  <th className="p-3 text-right">Akumulasi Keluar</th>
                  <th className="p-3 text-right bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                    Rata2 Masuk / Bln
                  </th>
                  <th className="p-3 text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300">
                    Rata2 Keluar / Bln
                  </th>
                  <th className="p-3 text-right">Net Flow / Bln</th>
                  <th className="p-3 text-center">Rasio Keluar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {plantStatsList.map((stat) => {
                  const isSelected =
                    selectedLocation !== 'ALL' &&
                    (selectedLocation === stat.plant ||
                      selectedLocation.replace('SJA ', '') === stat.plant.replace('SJA ', ''));

                  return (
                    <tr
                      key={stat.plant}
                      onClick={() => onSelectLocation && onSelectLocation(stat.plant)}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{stat.plant}</span>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {stat.activeMonthsCount} bulan
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                        {stat.totalIn.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                        {stat.totalOut.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10 tabular-nums">
                        +{stat.avgInPerMonth.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10 tabular-nums">
                        -{stat.avgOutPerMonth.toLocaleString('id-ID')}
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-bold tabular-nums ${
                          stat.netFlowPerMonth >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {stat.netFlowPerMonth > 0 ? '+' : ''}
                        {stat.netFlowPerMonth.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {stat.utilizationRate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Consolidated Total Row */}
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <td className="p-3 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Total Konsolidasi (Semua Plant)</span>
                  </td>
                  <td className="p-3 text-center font-mono">
                    {consolidatedStats.activeMonthsCount} bulan
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {consolidatedStats.totalIn.toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {consolidatedStats.totalOut.toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 tabular-nums">
                    +{consolidatedStats.avgInPerMonth.toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-right font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/30 tabular-nums">
                    -{consolidatedStats.avgOutPerMonth.toLocaleString('id-ID')}
                  </td>
                  <td
                    className={`p-3 text-right font-mono tabular-nums ${
                      consolidatedStats.netFlowPerMonth >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {consolidatedStats.netFlowPerMonth > 0 ? '+' : ''}
                    {consolidatedStats.netFlowPerMonth.toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-center font-mono">
                    {consolidatedStats.utilizationRate}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* MONTHLY BREAKDOWN DRAWER (Accordion) */}
        {showMonthlyBreakdown && (
          <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Rincian Mutasi Riil per Bulan per Plant
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {allDistinctMonths.length} Bulan Terdata
              </span>
            </div>

            {allDistinctMonths.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                Belum ada data transaksi bulanan yang tercatat.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="py-2 px-3">Periode Bulan</th>
                      {PLANT_LOCATIONS.map((p) => (
                        <th key={p} className="py-2 px-3 text-center" colSpan={2}>
                          {p.replace('SJA ', '')}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase text-slate-400 dark:text-slate-500 font-medium">
                      <th className="py-1 px-3"></th>
                      {PLANT_LOCATIONS.map((p) => (
                        <React.Fragment key={`${p}-sub`}>
                          <th className="py-1 px-2 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                            IN
                          </th>
                          <th className="py-1 px-2 text-right text-indigo-600 dark:text-indigo-400 font-mono">
                            OUT
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {allDistinctMonths.map((mKey) => (
                      <tr
                        key={mKey}
                        className="hover:bg-white dark:hover:bg-slate-850 transition-colors font-mono"
                      >
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 font-sans">
                          {formatMonthName(mKey)}
                        </td>
                        {PLANT_LOCATIONS.map((p) => {
                          const plantStat = plantStatsList.find((s) => s.plant === p);
                          const mData = plantStat?.monthBreakdown[mKey] || { in: 0, out: 0 };
                          return (
                            <React.Fragment key={`${mKey}-${p}`}>
                              <td className="py-2 px-2 text-right text-emerald-700 dark:text-emerald-400 tabular-nums">
                                {mData.in > 0 ? `+${mData.in.toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td className="py-2 px-2 text-right text-indigo-700 dark:text-indigo-400 tabular-nums">
                                {mData.out > 0 ? `-${mData.out.toLocaleString('id-ID')}` : '-'}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
