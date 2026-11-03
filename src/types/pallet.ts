export type LocationType = 
  | 'SJA SEPANJANG'
  | 'SJA SEMARANG'
  | 'SJA SUKODONO'
  | 'SJA KARAWANG';

export type UserRole = 'admin' | 'purchasing';

export interface AppUser {
  username: string;
  role: UserRole;
  location: LocationType | 'ALL';
  displayName: string;
}

export type TransactionType = 'PO' | 'IN' | 'OUT';

export interface BaseTransaction {
  id: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  lokasi: LocationType;
  timestamp: number;
}

export interface POTransaction extends BaseTransaction {
  type: 'PO';
  supplier: string;
  poNumber: string;
  poQty: number;
}

export interface InboundTransaction extends BaseTransaction {
  type: 'IN';
  supplier: string;
  po?: string;
  poQty?: number;
  batch: string;
  qty: number;
  notes?: string;
}

export interface OutboundTransaction extends BaseTransaction {
  type: 'OUT';
  batch: string;
  qty: number;
  notes?: string;
}

export type Transaction = POTransaction | InboundTransaction | OutboundTransaction;

export interface BatchBalance {
  batch: string;
  lokasi: LocationType;
  totalIn: number;
  totalOut: number;
  currentBalance: number;
}

export interface POStatusItem {
  po: string;
  supplier: string;
  poQty: number;
  received: number;
  lokasi: LocationType;
  datePO: string;
  lastDateInbound: string | null;
  batch: string[];
  lastTimestamp: number;
  poId?: string;
}

export interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
