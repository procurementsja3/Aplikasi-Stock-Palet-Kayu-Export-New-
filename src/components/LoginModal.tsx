import React, { useState } from 'react';
import { Lock, X, Shield, KeyRound, UserCheck } from 'lucide-react';
import { APP_USERS, UserCredential } from '../data/initialData';
import { AppUser } from '../types/pallet';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
  onError: (msg: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onError,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    const p = password.trim();

    const matchedUser: UserCredential | undefined = APP_USERS[u];

    if (matchedUser && matchedUser.pass === p) {
      onLoginSuccess({
        username: matchedUser.username,
        role: matchedUser.role,
        location: matchedUser.location,
        displayName: matchedUser.displayName,
      });
      setUsername('');
      setPassword('');
      onClose();
    } else {
      onError('Username atau password tidak cocok!');
    }
  };

  const handleQuickLogin = (key: string) => {
    const user = APP_USERS[key];
    if (user) {
      onLoginSuccess({
        username: user.username,
        role: user.role,
        location: user.location,
        displayName: user.displayName,
      });
      setUsername('');
      setPassword('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1 bg-white rounded-lg shadow-2xs shrink-0 w-9 h-9 flex items-center justify-center">
              <img
                src="./assets/aistudio/kapal_api_b1467dbf.png"
                alt="Logo Kapal Api"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">Login Sistem Monitoring</h3>
              <p className="text-[11px] text-slate-400">PT Santos Jaya Abadi (Kapal Api Group)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 text-slate-900"
                placeholder="cth: admin atau purc_karawang"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-800 outline-none bg-slate-50 text-slate-900"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-lg text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
          >
            <KeyRound className="w-4 h-4" /> Masuk ke Akun
          </button>

          {/* Quick Demo Login Helper */}
          <div className="mt-4 pt-3.5 border-t border-slate-200">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-600">
              <UserCheck className="w-3.5 h-3.5 text-slate-700" />
              <span>Akses Cepat (Klik untuk langsung login):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="p-2 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-left transition font-medium col-span-2 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-700" />
                  <strong>Administrator</strong> (Semua Plant & Full Hak)
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono border border-slate-300">
                  admin
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('purc_karawang')}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg text-left transition"
              >
                <div className="font-semibold text-slate-900 text-xs">Purc. Karawang</div>
                <div className="text-[10px] text-slate-500">Plant Karawang</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('purc_sepanjang')}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg text-left transition"
              >
                <div className="font-semibold text-slate-900 text-xs">Purc. Sepanjang</div>
                <div className="text-[10px] text-slate-500">Plant Sepanjang</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('purc_sukodono')}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg text-left transition"
              >
                <div className="font-semibold text-slate-900 text-xs">Purc. Sukodono</div>
                <div className="text-[10px] text-slate-500">Plant Sukodono</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('purc_semarang')}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg text-left transition"
              >
                <div className="font-semibold text-slate-900 text-xs">Purc. Semarang</div>
                <div className="text-[10px] text-slate-500">Plant Semarang</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
