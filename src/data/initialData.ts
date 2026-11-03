import { AppUser, LocationType, Transaction } from '../types/pallet';

export interface UserCredential extends AppUser {
  pass: string;
}

export const APP_USERS: Record<string, UserCredential> = {
  admin: {
    username: 'admin',
    role: 'admin',
    location: 'ALL',
    pass: 'Admin123',
    displayName: 'Administrator',
  },
  purc_sepanjang: {
    username: 'purc_sepanjang',
    role: 'purchasing',
    location: 'SJA SEPANJANG',
    pass: 'Sepanjang123',
    displayName: 'Purc. Sepanjang',
  },
  purc_karawang: {
    username: 'purc_karawang',
    role: 'purchasing',
    location: 'SJA KARAWANG',
    pass: 'Karawang123',
    displayName: 'Purc. Karawang',
  },
  purc_sukodono: {
    username: 'purc_sukodono',
    role: 'purchasing',
    location: 'SJA SUKODONO',
    pass: 'Sukodono123',
    displayName: 'Purc. Sukodono',
  },
  purc_semarang: {
    username: 'purc_semarang',
    role: 'purchasing',
    location: 'SJA SEMARANG',
    pass: 'Semarang123',
    displayName: 'Purc. Semarang',
  },
};

export const PLANT_LOCATIONS: LocationType[] = [
  'SJA SEPANJANG',
  'SJA SEMARANG',
  'SJA SUKODONO',
  'SJA KARAWANG',
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];
