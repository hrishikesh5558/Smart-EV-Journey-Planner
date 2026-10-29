import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Shield, Sliders,
  Save, Key, LogOut, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { user, logout, updateUser } = useAuth();

  // Profile and Preferences State
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [reserveBuffer, setReserveBuffer] = useState<number>(user?.default_safety_reserve ?? 10);
  const [preferredUnit, setPreferredUnit] = useState<string>(user?.preferred_unit ?? 'km');
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      toast.error('Full name must be at least 2 characters');
      return;
    }

    try {
      setSavingPreferences(true);
      const updatedUser = await authService.updateProfile({
        full_name: fullName.trim(),
        default_safety_reserve: reserveBuffer,
        preferred_unit: preferredUnit,
      });
      updateUser(updatedUser);
      toast.success('System preferences and profile saved successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to save preferences. Please check backend connection.';
      toast.error(msg);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error('Please complete all password fields');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    try {
      setSavingPassword(true);
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to change password. Please verify current password.';
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-2 sm:p-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
          System & Account Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Customize your default safety margins, telemetry units, profile details, and account security
        </p>
      </div>

      <div className="space-y-6">
        {/* User Profile & Range Preferences Form */}
        <form
          onSubmit={handleSavePreferences}
          className="bg-navy-900/70 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6"
        >
          {/* Profile Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-ev-green/10 flex items-center justify-center text-ev-green border border-ev-green/20">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">Account Profile</h2>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-ev-green"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-navy-950/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Section: Calculation Preferences */}
          <div className="pt-4 border-t border-white/5 space-y-6">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-ev-cyan" />
              <h3 className="text-base font-bold text-white font-display">
                Range Calculation Thresholds
              </h3>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Default Safety Reserve Buffer
                </label>
                <span className="text-xs font-bold text-ev-green bg-ev-green/10 px-2 py-0.5 rounded-md border border-ev-green/20">
                  {reserveBuffer}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={reserveBuffer}
                onChange={(e) => setReserveBuffer(Number(e.target.value))}
                className="w-full accent-ev-green cursor-pointer"
              />
              <p className="text-xs text-slate-400 mt-2">
                When evaluating trip feasibility, Smart EV automatically requires this safety margin so you never reach zero battery before arrival.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Preferred Distance Units
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <button
                  type="button"
                  onClick={() => setPreferredUnit('km')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all text-center ${
                    preferredUnit === 'km'
                      ? 'bg-ev-green/20 border-ev-green text-ev-green'
                      : 'bg-navy-950 border-white/10 text-slate-400'
                  }`}
                >
                  Kilometers (km)
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredUnit('mi')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all text-center ${
                    preferredUnit === 'mi'
                      ? 'bg-ev-green/20 border-ev-green text-ev-green'
                      : 'bg-navy-950 border-white/10 text-slate-400'
                  }`}
                >
                  Miles (mi)
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPreferences}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-ev-green to-ev-cyan text-navy-950 font-bold text-xs hover:opacity-95 shadow-md shadow-ev-green/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{savingPreferences ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>

        {/* Change Password Card */}
        <form
          onSubmit={handleChangePassword}
          className="bg-navy-900/70 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-5 h-5 text-ev-cyan" />
            <h3 className="text-base font-bold text-white font-display">Account Security</h3>
          </div>
          <p className="text-xs text-slate-400">Update your account password</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-ev-green"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-ev-green"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-ev-green"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 font-semibold text-xs hover:bg-white/5 transition-all"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{savingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>

        {/* Sign Out Action */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to log out?')) {
                logout();
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs hover:bg-red-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
