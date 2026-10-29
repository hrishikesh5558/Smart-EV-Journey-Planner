import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Car, Navigation, History, Zap,
  CheckCircle, ArrowRight, BatteryCharging,
  Gauge, Plus, Clock, TrendingUp, ShieldCheck, MapPin
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { vehicleService } from '../services/vehicleService';
import { journeyService } from '../services/journeyService';
import type { Journey } from '../types';

function getDestination(j: Journey) {
  return j.destination || j.destination_name || 'Planned Destination';
}
function getDistanceKm(j: Journey) {
  return j.journey_distance_km ?? j.destination_distance_km ?? 0;
}
function getRangeKm(j: Journey) {
  return j.estimated_remaining_range_km ?? j.current_remaining_range_km ?? 0;
}

export function DashboardOverview() {
  const { user } = useAuth();

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehicleService.list,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: journeyService.getStats,
  });

  const activeVehicle = vehicles[0];
  const recentJourneys: Journey[] = stats?.recent_journeys || [];

  return (
    <div className="space-y-8">

      {/* ── Welcome Banner ── */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 border border-white/10 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-ev-green/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-ev-green/10 text-ev-green border border-ev-green/20 mb-3">
              <Zap className="w-3.5 h-3.5" />
              <span>Manual Input · No Image Required</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Driver'}! 👋
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300">
              Enter your battery status and journey distance to instantly calculate whether your charge is sufficient for your trip.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <Link
              to="/app/planner"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-ev-green to-ev-cyan hover:opacity-95 text-navy-950 font-bold text-sm transition-all shadow-lg shadow-ev-green/20"
            >
              <Navigation className="w-4 h-4" />
              <span>Plan a Journey</span>
            </Link>
            <Link
              to="/app/planner"
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-semibold text-sm border border-white/10 transition-all shadow-md"
            >
              <Gauge className="w-4 h-4 text-ev-green" />
              <span>Enter EV Details</span>
            </Link>
            <Link
              to="/app/garage"
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-semibold text-sm border border-white/10 transition-all shadow-md"
            >
              <Car className="w-4 h-4 text-ev-cyan" />
              <span>My Vehicles</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-navy-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saved Vehicles</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-display text-white mt-3">
            {stats?.total_vehicles ?? vehicles.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">In your garage</p>
        </div>

        <div className="bg-navy-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Journeys Planned</span>
            <div className="w-9 h-9 rounded-xl bg-ev-green/10 flex items-center justify-center text-ev-green border border-ev-green/20">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-display text-white mt-3">
            {stats?.total_journeys ?? 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">Range calculations</p>
        </div>

        <div className="bg-navy-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sufficient Trips</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-display text-emerald-400 mt-3">
            {stats?.feasible_journeys ?? 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">Range confirmed safe</p>
        </div>

        <div className="bg-navy-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Charge Needed</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <BatteryCharging className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-display text-amber-400 mt-3">
            {stats?.charging_recommended_journeys ?? 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">Range shortfall detected</p>
        </div>
      </div>

      {/* ── Active Vehicle + Quick Access ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Active Vehicle */}
        <div className="lg:col-span-2 bg-navy-900/70 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-ev-green" />
                <h2 className="text-lg font-bold text-white font-display">Active Vehicle</h2>
              </div>
              <Link to="/app/garage" className="text-xs text-ev-green hover:underline font-semibold flex items-center gap-1">
                Manage Garage <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loadingVehicles ? (
              <div className="py-10 flex justify-center">
                <div className="w-7 h-7 rounded-full border-2 border-ev-green border-t-transparent animate-spin" />
              </div>
            ) : activeVehicle ? (
              <div className="bg-navy-950/60 border border-white/5 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-ev-green/10 border border-ev-green/20 flex items-center justify-center flex-shrink-0">
                    <Car className="w-6 h-6 text-ev-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold bg-white/10 text-white/70 px-2 py-0.5 rounded-full">Primary EV</span>
                    <h3 className="text-xl font-black text-white mt-1">{activeVehicle.nickname}</h3>
                    <p className="text-sm text-slate-400">{activeVehicle.manufacturer} {activeVehicle.model}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-300">
                      {activeVehicle.battery_capacity_kwh && (
                        <span>{activeVehicle.battery_capacity_kwh} kWh</span>
                      )}
                      {activeVehicle.full_charge_range_km && (
                        <span>~{activeVehicle.full_charge_range_km} km rated range</span>
                      )}
                      {activeVehicle.registration_identifier && (
                        <span className="font-mono bg-navy-800 px-2 py-0.5 rounded border border-white/10">
                          {activeVehicle.registration_identifier}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 px-4 border border-dashed border-white/10 rounded-2xl">
                <Car className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white">No vehicles saved yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Add your EV to save battery specs and link trips to your vehicle.
                </p>
                <Link
                  to="/app/garage"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ev-green text-navy-950 font-bold text-xs hover:opacity-90 transition-all shadow-md shadow-ev-green/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Your First Vehicle
                </Link>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>Default Reserve: <strong className="text-white">{user?.default_safety_reserve ?? 15}%</strong></span>
            <span>Unit: <strong className="text-white uppercase">{user?.preferred_unit ?? 'KM'}</strong></span>
            <Link to="/app/settings" className="text-ev-cyan hover:underline">Adjust Preferences</Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-b from-navy-900/90 to-navy-950 border border-ev-green/20 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-ev-cyan/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-ev-green/10 text-ev-green border border-ev-green/20 mb-3">
              <ShieldCheck className="w-3 h-3" />
              Quick Actions
            </div>
            <h3 className="text-lg font-bold text-white font-display">Plan a Journey</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Enter your current battery and trip distance to get an instant range sufficiency result.
            </p>

            <div className="mt-4 space-y-2">
              {[
                { to: '/app/planner', icon: Navigation, label: 'Plan a Journey', sub: 'Calculate trip sufficiency', color: 'text-ev-green', bg: 'bg-ev-green/10' },
                { to: '/app/planner', icon: Gauge, label: 'Enter EV Details', sub: 'Manual battery & range input', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { to: '/app/garage', icon: Car, label: 'My Vehicles', sub: 'Manage saved EVs', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { to: '/app/history', icon: History, label: 'Journey History', sub: 'View past calculations', color: 'text-ev-cyan', bg: 'bg-ev-cyan/10' },
              ].map(({ to, icon: Icon, label, sub, color, bg }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between p-3 rounded-xl bg-navy-950/80 hover:bg-navy-800/80 border border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold text-white block group-hover:${color} transition-colors`}>{label}</span>
                      <span className="text-[11px] text-slate-400">{sub}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-white/5">
            <Link
              to="/app/planner"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-ev-green to-ev-cyan text-navy-950 font-bold text-sm hover:opacity-95 shadow-md shadow-ev-green/20 transition-all"
            >
              <Gauge className="w-4 h-4" />
              Open EV Range Planner
            </Link>
          </div>
        </div>
      </div>

      {/* ── Recent Journeys ── */}
      <div className="bg-navy-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-ev-cyan" />
            <h2 className="text-lg font-bold text-white font-display">Recent Journey Results</h2>
          </div>
          <Link to="/app/history" className="text-xs text-ev-cyan hover:underline font-semibold flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingStats ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-ev-cyan border-t-transparent animate-spin" />
          </div>
        ) : recentJourneys.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentJourneys.map((j) => {
              const isSufficient = j.result_status === 'feasible';
              const isLow = j.result_status === 'low_reserve';
              const jid = j.id || (j as any)._id || '';
              return (
                <div
                  key={jid}
                  className="bg-navy-950/60 border border-white/10 hover:border-white/20 p-4 rounded-2xl transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{getDestination(j)}</h4>
                      {(j.manufacturer || j.model) && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{[j.manufacturer, j.model].filter(Boolean).join(' ')}</p>
                      )}
                    </div>
                    <span className={`ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      isSufficient
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : isLow
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {isSufficient ? 'Sufficient' : isLow ? 'Low Reserve' : 'Charge Needed'}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {getDistanceKm(j)} km trip
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      {getRangeKm(j)} km range
                    </span>
                  </div>
                  {j.remaining_margin_km != null && (
                    <p className={`mt-1.5 text-[11px] font-mono font-semibold ${j.remaining_margin_km >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      Margin: {j.remaining_margin_km >= 0 ? '+' : ''}{j.remaining_margin_km} km
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{new Date(j.created_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400 text-xs">
            <Navigation className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-slate-300 text-sm">No journey calculations yet</p>
            <p className="mt-1 max-w-sm mx-auto">Use the EV Range Planner to check your battery and plan safe trips.</p>
            <Link
              to="/app/planner"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ev-green text-navy-950 font-bold text-xs hover:opacity-90 shadow-md shadow-ev-green/20"
            >
              <Gauge className="w-3.5 h-3.5" />
              Open EV Range Planner
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
