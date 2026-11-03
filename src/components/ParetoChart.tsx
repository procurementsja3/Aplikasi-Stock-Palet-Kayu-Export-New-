import React, { useEffect, useRef } from 'react';
import {
  Chart,
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Transaction } from '../types/pallet';

// Register required Chart.js components
Chart.register(
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ParetoChartProps {
  transactions: Transaction[];
  onRefresh?: () => void;
}

export const ParetoChart: React.FC<ParetoChartProps> = ({ transactions, onRefresh }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Agregasi Data per Lokasi (kecuali master PO)
    const plantData: Record<string, { in: number; out: number; totalAktivitas: number }> = {};

    transactions.forEach((trx) => {
      if (trx.type === 'PO') return;

      const loc = trx.lokasi || 'Tanpa Lokasi';
      if (!plantData[loc]) {
        plantData[loc] = { in: 0, out: 0, totalAktivitas: 0 };
      }

      if (trx.type === 'IN') {
        plantData[loc].in += trx.qty || 0;
        plantData[loc].totalAktivitas += trx.qty || 0;
      } else if (trx.type === 'OUT') {
        plantData[loc].out += trx.qty || 0;
        plantData[loc].totalAktivitas += trx.qty || 0;
      }
    });

    // 2. Urutkan berdasarkan total aktivitas terbesar (Aturan Pareto)
    const sortedPlants = Object.keys(plantData)
      .map((loc) => ({
        lokasi: loc,
        in: plantData[loc].in,
        out: plantData[loc].out,
        total: plantData[loc].totalAktivitas,
      }))
      .sort((a, b) => b.total - a.total);

    // 3. Hitung persentase kumulatif
    const grandTotal = sortedPlants.reduce((sum, p) => sum + p.total, 0);
    let cumulative = 0;
    const labels: string[] = [];
    const dataIn: number[] = [];
    const dataOut: number[] = [];
    const dataCumulativePct: number[] = [];

    sortedPlants.forEach((p) => {
      labels.push(p.lokasi.replace('SJA ', ''));
      dataIn.push(p.in);
      dataOut.push(p.out);

      cumulative += p.total;
      const pct = grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0;
      dataCumulativePct.push(parseFloat(pct.toFixed(1)));
    });

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['Belum ada aktivitas'],
        datasets: [
          {
            type: 'line',
            label: 'Persentase Kumulatif (%)',
            data: dataCumulativePct.length > 0 ? dataCumulativePct : [0],
            borderColor: '#f59e0b', // Amber-500
            backgroundColor: '#f59e0b',
            borderWidth: 2.5,
            pointBackgroundColor: '#b45309',
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y-pct',
            tension: 0.25,
            fill: false,
          },
          {
            type: 'bar',
            label: 'Total Kedatangan (Palet)',
            data: dataIn.length > 0 ? dataIn : [0],
            backgroundColor: '#3b82f6', // Blue-500
            hoverBackgroundColor: '#2563eb',
            yAxisID: 'y',
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.6,
          },
          {
            type: 'bar',
            label: 'Total Pengeluaran (Palet)',
            data: dataOut.length > 0 ? dataOut : [0],
            backgroundColor: '#ef4444', // Red-500
            hoverBackgroundColor: '#dc2626',
            yAxisID: 'y',
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 14,
              font: {
                size: 12,
                weight: 'bold',
              },
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toLocaleString('id-ID');
                  if (context.dataset.yAxisID === 'y-pct') {
                    label += '%';
                  } else {
                    label += ' palet';
                  }
                }
                return label;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11, weight: 'bold' },
              color: '#475569',
            },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Jumlah Palet',
              font: { size: 11, weight: 'bold' },
              color: '#64748b',
            },
            beginAtZero: true,
            grid: {
              color: '#f1f5f9',
            },
          },
          'y-pct': {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Kumulatif (%)',
              font: { size: 11, weight: 'bold' },
              color: '#f59e0b',
            },
            beginAtZero: true,
            max: 105,
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: (val) => `${val}%`,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [transactions]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden p-6 mb-8 transition-all">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base sm:text-lg">
              Grafik Pareto Pergerakan Palet (All Plant)
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan volume kedatangan vs pengeluaran serta kurva persentase kumulatif
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        )}
      </div>
      <div className="relative w-full h-80">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
