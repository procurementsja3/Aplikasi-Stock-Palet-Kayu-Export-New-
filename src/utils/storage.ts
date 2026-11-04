import { Transaction, LocationType } from '../types/pallet';

const DB_NAME = 'SJA_PALLET_DATABASE_V1';
const STORE_NAME = 'pallet_store';
const DB_VERSION = 1;

export const STORAGE_KEY = 'sja_pallet_transactions_v3_clean';
export const BACKUP_STORAGE_KEY = 'sja_pallet_backup_store';
export const LEGACY_KEY_V2 = 'sja_pallet_transactions_v2';
export const LEGACY_KEY_V1 = 'sja_pallet_transactions_v1';
export const USER_STORAGE_KEY = 'sja_pallet_current_user_v2';

// Robust numeric parser supporting strings, commas, dots
export const parseCleanNumber = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  // Handle string numbers like "1,000" or "1.500" or "500"
  const cleaned = String(val).replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Robust transaction normalizer supporting standard and Indonesian keys
export const normalizeTransactionItem = (item: any, fallbackIndex = 0): Transaction => {
  if (!item || typeof item !== 'object') {
    return {
      id: `tx-${Date.now()}-${fallbackIndex}`,
      type: 'IN',
      date: new Date().toISOString().split('T')[0],
      lokasi: 'SJA SEPANJANG',
      timestamp: Date.now() + fallbackIndex,
      supplier: '-',
      batch: '-',
      qty: 0,
    };
  }

  // Detect Type
  const rawType = String(item.type || item.tipe || item.jenis || '').toUpperCase().trim();
  let type: 'PO' | 'IN' | 'OUT' = 'IN';

  if (rawType === 'PO' || rawType.includes('PURCHASE') || rawType === 'ORDER' || item.poNumber) {
    type = 'PO';
  } else if (rawType === 'OUT' || rawType.includes('OUTBOUND') || rawType.includes('KELUAR') || rawType.includes('PAKAI')) {
    type = 'OUT';
  } else if (rawType === 'IN' || rawType.includes('INBOUND') || rawType.includes('MASUK') || rawType.includes('TERIMA')) {
    type = 'IN';
  } else if (item.batch && (item.qty || item.jumlah)) {
    // If not specified, default to IN
    type = 'IN';
  }

  // Detect Location
  let rawLokasi = String(item.lokasi || item.location || item.plant || item.cabang || item.gudang || '')
    .trim()
    .toUpperCase();
  if (rawLokasi && !rawLokasi.startsWith('SJA ') && ['SEPANJANG', 'SEMARANG', 'SUKODONO', 'KARAWANG'].includes(rawLokasi)) {
    rawLokasi = 'SJA ' + rawLokasi;
  }
  const validLocations: LocationType[] = ['SJA SEPANJANG', 'SJA SEMARANG', 'SJA SUKODONO', 'SJA KARAWANG'];
  const lokasi: LocationType = validLocations.includes(rawLokasi as LocationType)
    ? (rawLokasi as LocationType)
    : 'SJA SEPANJANG';

  // Date & Timestamp
  const date = String(item.date || item.tanggal || item.tgl || new Date().toISOString().split('T')[0]).trim();
  const timestamp = Number(item.timestamp) || (item.date ? new Date(item.date).getTime() : Date.now()) + fallbackIndex;

  // Base ID
  const id = String(
    item.id ||
      item._id ||
      `tx-${type.toLowerCase()}-${timestamp}-${fallbackIndex}-${Math.random().toString(36).slice(2, 6)}`
  );

  if (type === 'PO') {
    const poNumber = String(
      item.poNumber || item.po || item.no_po || item.nomor_po || item.noPo || `PO-${timestamp}`
    ).trim();
    const poQty = parseCleanNumber(item.poQty ?? item.po_qty ?? item.qtyPo ?? item.qty ?? item.jumlah);
    const supplier = String(item.supplier || item.suplier || item.vendor || item.pemasok || '-').trim();

    return {
      id,
      type: 'PO',
      date,
      lokasi,
      timestamp,
      poNumber,
      poQty,
      supplier,
    };
  }

  if (type === 'OUT') {
    const batch = String(item.batch || item.no_batch || item.lot || item.batchCode || '-').toUpperCase().trim();
    const qty = parseCleanNumber(item.qty ?? item.quantity ?? item.jumlah ?? item.kuantitas);
    const notes = item.notes || item.catatan || item.keterangan ? String(item.notes || item.catatan || item.keterangan) : undefined;

    return {
      id,
      type: 'OUT',
      date,
      lokasi,
      timestamp,
      batch,
      qty,
      notes,
    };
  }

  // Type IN
  const supplier = String(item.supplier || item.suplier || item.vendor || item.pemasok || '-').trim();
  const po = item.po || item.poNumber || item.no_po || item.nomor_po ? String(item.po || item.poNumber || item.no_po || item.nomor_po).trim() : undefined;
  const poQty = item.poQty || item.po_qty ? parseCleanNumber(item.poQty || item.po_qty) : undefined;
  const batch = String(item.batch || item.no_batch || item.lot || item.batchCode || '-').toUpperCase().trim();
  const qty = parseCleanNumber(item.qty ?? item.quantity ?? item.jumlah ?? item.kuantitas);
  const notes = item.notes || item.catatan || item.keterangan ? String(item.notes || item.catatan || item.keterangan) : undefined;

  return {
    id,
    type: 'IN',
    date,
    lokasi,
    timestamp,
    supplier,
    po,
    poQty,
    batch,
    qty,
    notes,
  };
};

// Open IndexedDB instance
function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target?.result as IDBDatabase;
        if (db && !db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('IndexedDB failed to open, falling back to localStorage');
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB exception:', err);
      resolve(null);
    }
  });
}

// Save transactions to IndexedDB
export async function saveToIndexedDB(transactions: Transaction[]): Promise<boolean> {
  try {
    const db = await openDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(transactions, 'transactions');
      store.put(Date.now(), 'last_saved_timestamp');

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };

      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch (e) {
    console.error('Error saving to IndexedDB:', e);
    return false;
  }
}

// Load transactions from IndexedDB
export async function loadFromIndexedDB(): Promise<Transaction[] | null> {
  try {
    const db = await openDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get('transactions');

      getReq.onsuccess = () => {
        db.close();
        const res = getReq.result;
        if (Array.isArray(res) && res.length > 0) {
          const normalized = res.map((it, idx) => normalizeTransactionItem(it, idx));
          resolve(normalized);
        } else {
          resolve(null);
        }
      };

      getReq.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (e) {
    console.error('Error reading from IndexedDB:', e);
    return null;
  }
}

// Save transactions to localStorage across keys
export function saveToLocalStorage(transactions: Transaction[]): void {
  try {
    const serialized = JSON.stringify(transactions);
    localStorage.setItem(STORAGE_KEY, serialized);
    if (transactions.length > 0) {
      localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
    }
  } catch (e) {
    console.warn('localStorage save warning (might be full or private browsing):', e);
  }
}

// Load transactions from any available localStorage key
export function loadFromLocalStorage(): Transaction[] | null {
  try {
    const keysToCheck = [
      STORAGE_KEY,
      BACKUP_STORAGE_KEY,
      LEGACY_KEY_V2,
      LEGACY_KEY_V1,
    ];

    for (const key of keysToCheck) {
      const saved = localStorage.getItem(key);
      if (saved && saved.trim() && saved !== '[]') {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item, idx) => normalizeTransactionItem(item, idx));
          }
        } catch {
          // continue checking next key
        }
      }
    }
  } catch (e) {
    console.warn('localStorage load exception:', e);
  }
  return null;
}

// Unified dual-storage save (synchronous localStorage + async IndexedDB)
export async function persistAllTransactions(transactions: Transaction[]): Promise<void> {
  saveToLocalStorage(transactions);
  await saveToIndexedDB(transactions);
}

// Unified dual-storage load (checks IndexedDB and localStorage)
export async function retrieveAllTransactions(): Promise<Transaction[]> {
  // Check IndexedDB first (most reliable, no quota issues)
  const idbData = await loadFromIndexedDB();
  if (idbData && idbData.length > 0) {
    // Keep localStorage synced
    saveToLocalStorage(idbData);
    return idbData;
  }

  // Fallback to localStorage
  const lsData = loadFromLocalStorage();
  if (lsData && lsData.length > 0) {
    // Keep IndexedDB synced
    await saveToIndexedDB(lsData);
    return lsData;
  }

  return [];
}
