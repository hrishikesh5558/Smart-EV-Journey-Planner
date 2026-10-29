import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Car, Gauge, MapPin, History,
  Zap, Settings, LogOut, Menu, X,
  Battery, User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

const navItems = [
  { to: '/app/overview', icon: LayoutDashboard, label: 'Overview' },
  { to: '/app/garage', icon: Car, label: 'My Garage' },
  { to: '/app/planner', icon: Gauge, label: 'EV Range Planner' },
  { to: '/app/history', icon: History, label: 'Journey History' },
  { to: '/app/charging', icon: Zap, label: 'Charging Stations' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : 'hidden lg:flex'}`}>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00ff87] to-[#00cc6a] flex items-center justify-center">
            <Battery className="w-5 h-5 text-navy-950" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-lg leading-none">Smart EV</h1>
            <p className="text-[10px] text-white/40 leading-none mt-1">Intelligent Planner</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
            onClick={() => mobile && setSidebarOpen(false)}
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-6 border-t border-white/5 pt-4">
        <div className="glass-card-light p-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00ff87]/20 to-[#0ea5e9]/20 flex items-center justify-center border border-white/10">
              <User className="w-4 h-4 text-white/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-white/40 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-400/10"
        >
          <LogOut style={{ width: 18, height: 18 }} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-bg flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-charcoal-900/80 border-r border-white/5 flex-shrink-0 overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-charcoal-900 border-r border-white/5 z-50 lg:hidden overflow-y-auto"
            >
              <div className="flex justify-end p-4">
                <button onClick={() => setSidebarOpen(false)} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Sidebar mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-charcoal-900/60 border-b border-white/5 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
          <button
            className="lg:hidden text-white/50 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <p className="text-white font-semibold text-sm">
              Welcome back, <span className="text-ev-green">{user?.full_name?.split(' ')[0]}</span>
            </p>
            <p className="text-white/40 text-xs">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/app/planner')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-ev-green/10 hover:bg-ev-green/20 border border-ev-green/30 rounded-xl text-ev-green text-sm font-medium transition-all duration-200"
            >
              <Gauge className="w-4 h-4" />
              <span>EV Range Planner</span>
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00ff87]/20 to-[#0ea5e9]/20 border border-white/10 flex items-center justify-center hover:border-ev-green/40 transition-all"
              >
                <User className="w-4 h-4 text-white/70" />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    className="absolute right-0 top-11 w-48 glass-card border border-white/10 shadow-2xl z-50"
                  >
                    <div className="p-3 border-b border-white/5">
                      <p className="text-white text-sm font-medium">{user?.full_name}</p>
                      <p className="text-white/40 text-xs">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => { navigate('/app/settings'); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 text-sm transition-all"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </button>
                      <button
                        onClick={() => { handleLogout(); setProfileOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 text-sm transition-all"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
