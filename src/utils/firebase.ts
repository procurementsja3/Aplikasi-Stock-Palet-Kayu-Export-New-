import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Transaction } from '../types/pallet';
import { normalizeTransactionItem } from './storage';

// Konfigurasi resmi Firebase Google Project: sja-stok-palet
export const firebaseConfig = {
  apiKey: "AIzaSyAZhErLHLNhHI4Z-wzIoc_tdpP8FPNf1Gg",
  authDomain: "sja-stok-palet.firebaseapp.com",
  databaseURL: "https://sja-stok-palet-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sja-stok-palet",
  storageBucket: "sja-stok-palet.firebasestorage.app",
  messagingSenderId: "132320465404",
  appId: "1:132320465404:web:8dc1f88e5ecadf341ea279",
  measurementId: "G-RDGKKJVZBS",
};

// Safe Firebase App Initialization
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection & Document references for Pallet transactions
const SYNC_COLLECTION = 'sja_sync';
const SYNC_DOCUMENT = 'pallet_inventory';

export type CloudSyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

/**
 * Membersihkan objek transaksi agar aman untuk Firestore
 * (Firestore menolak properti bernilai undefined, jadi kita buang properti undefined tersebut)
 */
export function sanitizeForFirestore(items: Transaction[]): any[] {
  return items.map((item) => {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(item)) {
      if (val !== undefined) {
        clean[key] = val;
      }
    }
    return clean;
  });
}

/**
 * Menyimpan seluruh data transaksi ke Google Firebase Firestore Cloud
 */
export async function saveTransactionsToCloud(
  transactions: Transaction[],
  updaterName = 'Sistem'
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, SYNC_COLLECTION, SYNC_DOCUMENT);
    const sanitized = sanitizeForFirestore(transactions);

    await setDoc(
      docRef,
      {
        transactions: sanitized,
        totalItems: sanitized.length,
        lastUpdated: Date.now(),
        updatedBy: updaterName,
      },
      { merge: true }
    );
    console.log(`[Firebase Cloud Sync] Berhasil upload ${sanitized.length} data ke Firestore.`);
    return { success: true };
  } catch (err: any) {
    console.error('[Firebase Cloud Sync] Gagal upload ke cloud:', err);
    return {
      success: false,
      error: err?.code === 'permission-denied'
        ? 'Akses Firestore ditolak. Pastikan Rules di Firebase Console sudah diset ke Test Mode.'
        : err?.message || 'Gagal sinkronisasi ke Firebase',
    };
  }
}

/**
 * Mengambil data transaksi dari Google Firebase Firestore
 */
export async function fetchTransactionsFromCloud(): Promise<Transaction[] | null> {
  try {
    const docRef = doc(db, SYNC_COLLECTION, SYNC_DOCUMENT);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.transactions)) {
        return data.transactions.map((it: any, idx: number) => normalizeTransactionItem(it, idx));
      }
    }
    return null;
  } catch (err: any) {
    console.warn('[Firebase Cloud Sync] Gagal membaca dari cloud:', err?.message || err);
    return null;
  }
}

/**
 * Mendengarkan perubahan data secara Real-Time dari Firebase Firestore.
 * Setiap kali ada perubahan di browser/perangkat lain, callback akan otomatis terpanggil!
 */
export function subscribeToCloudTransactions(
  onData: (transactions: Transaction[], lastUpdated?: number, updatedBy?: string) => void,
  onStatusChange?: (status: CloudSyncStatus, errorMsg?: string) => void
): Unsubscribe {
  try {
    const docRef = doc(db, SYNC_COLLECTION, SYNC_DOCUMENT);

    if (onStatusChange) onStatusChange('syncing');

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data?.transactions)) {
            const normalized = data.transactions.map((it: any, idx: number) =>
              normalizeTransactionItem(it, idx)
            );
            onData(normalized, data.lastUpdated, data.updatedBy);
            if (onStatusChange) onStatusChange('connected');
            return;
          }
        }
        // Document exists but empty or doesn't exist yet
        if (onStatusChange) onStatusChange('connected');
      },
      (error) => {
        console.warn('[Firebase Cloud Sync] Listener error:', error);
        if (onStatusChange) {
          const isPerm = error?.code === 'permission-denied';
          onStatusChange(
            'error',
            isPerm
              ? 'Izin Firestore belum aktif di Firebase Console'
              : 'Gagal tersambung ke Firebase'
          );
        }
      }
    );

    return unsubscribe;
  } catch (e: any) {
    console.warn('[Firebase Cloud Sync] Subscribe exception:', e);
    if (onStatusChange) onStatusChange('error', e?.message);
    return () => {};
  }
}
