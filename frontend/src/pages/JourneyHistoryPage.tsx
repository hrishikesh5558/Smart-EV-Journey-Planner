import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Navigation, Car, Trash2, Eye, CheckCircle,
  AlertTriangle, Battery, MapPin, Calendar, Gauge, Info,
  ChevronRight, Plus, Clock, X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { journeyService } from '../services/journeyService';
import type { Journey } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusBadge: Record<string, { bg: string; border: string; text: string; label: string; icon: typeof CheckCircle }> = {
  feasible: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Sufficient', icon: CheckCircle },
  low_reserve: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Low Reserve', icon: AlertTriangle },
  charging_recommended: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Charge Needed', icon: AlertTriangle },
};

function fmt(d: string | undefined) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

function getDestination(j: Journey): string {
  return j.destination || j.destination_name || 'Planned Destination';
}

function getRangeKm(j: Journey): number {
  return j.estimated_remaining_range_km ?? j.current_remaining_range_km ?? 0;
}

function getDistanceKm(j: Journey): number {
  return j.journey_distance_km ?? j.destination_distance_km ?? 0;
}

function getReservePct(j: Journey): number {
  return j.reserve_percentage ?? j.safety_reserve_percent ?? 0;
}

function getBatteryPct(j: Journey): number | undefined {
  return j.current_battery_percentage ?? j.battery_percentage_used;
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function JourneyModal({ journey, onClose }: { journey: Journey; onClose: () => void }) {
  const status = statusBadge[journey.result_status] || statusBadge.feasible;
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0d1929] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Journey Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-3 p-3 rounded-xl border mb-5 ${status.bg} ${status.border}`}>
          <StatusIcon className={`w-5 h-5 ${status.text}`} />
          <div>
            <p className={`text-sm font-bold ${status.text}`}>{status.label}</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{journey.recommendation}</p>
          </div>
        </div>

        {/* Vehicle */}
        {(journey.manufacturer || journey.model) && (
          <div className="mb-4 p-3 bg-white/3 rounded-xl border border-white/5">
            <p className="text-xs text-slate-400 mb-1">Vehicle</p>
            <p className="text-sm font-semibold text-white">{[journey.manufacturer, journey.model].filter(Boolean).join(' ')}</p>
            {journey.battery_capacity_kwh && (
              <p className="text-xs text-slate-400">{journey.battery_capacity_kwh} kWh battery</p>
            )}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Battery', value: getBatteryPct(journey) != null ? `${getBatteryPct(journey)}%` : '—' },
            { label: 'Remaining Range', value: `${getRangeKm(journey)} km` },
            { label: 'Journey Distance', value: `${getDistanceKm(journey)} km` },
            { label: 'Reserve', value: `${getReservePct(journey)}%` },
            { label: 'Reserve Distance', value: journey.reserve_distance_km != null ? `${journey.reserve_distance_km} km` : '—' },
            { label: 'Usable Range', value: journey.usable_range_km != null ? `${journey.usable_range_km} km` : '—' },
            { label: 'Remaining Margin', value: journey.remaining_margin_km != null ? `${journey.remaining_margin_km >= 0 ? '+' : ''}${journey.remaining_margin_km} km` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-white/3 rounded-xl border border-white/5">
              <p className="text-[11px] text-slate-400">{label}</p>
              <p className="text-sm font-bold text-white font-mono">{value}</p>
            </div>
          ))}
        </div>

        {journey.starting_location && (
          <p className="text-xs text-slate-400 mb-1">From: <span className="text-white">{journey.starting_location}</span></p>
        )}
        {(journey.destination || journey.destination_name) && (
          <p className="text-xs text-slate-400 mb-1">To: <span className="text-white">{getDestination(journey)}</span></p>
        )}
        {journey.driving_conditions && (
          <p className="text-xs text-slate-400 mb-1">Conditions: <span className="text-white capitalize">{journey.driving_conditions.replace('_', ' ')}</span></p>
        )}
        {journey.notes && (
          <p className="text-xs text-slate-400 mt-2">Notes: <span className="text-white">{journey.notes}</span></p>
        )}
        <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(journey.created_at)}</p>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function JourneyHistoryPage() {
  const queryClient = useQueryClient();
  const [viewJourney, setViewJourney] = useState<Journey | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ['journeys'],
    queryFn: journeyService.history,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => journeyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Journey deleted.');
      setConfirmDeleteId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete journey.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight flex items-center gap-3">
            <History className="w-7 h-7 text-ev-cyan" />
            Journey History
          </h1>
          <p className="text-sm text-slate-400 mt-1">All your saved EV range calculations, ordered by most recent.</p>
        </div>
        <Link
          to="/app/planner"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-ev-green/10 border border-ev-green/30 text-ev-green text-sm font-semibold hover:bg-ev-green/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Plan New Journey
        </Link>
      </div>

      {/* Stats row */}
      {journeys.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Journeys', value: journeys.length, color: 'text-white' },
            { label: 'Sufficient', value: journeys.filter(j => j.result_status === 'feasible').length, color: 'text-emerald-400' },
            { label: 'Low Reserve', value: journeys.filter(j => j.result_status === 'low_reserve').length, color: 'text-amber-400' },
            { label: 'Charge Needed', value: journeys.filter(j => j.result_status === 'charging_recommended').length, color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-navy-900/60 border border-white/10 rounded-xl p-4 backdrop-blur-md text-center">
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Journey list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-ev-green border-t-transparent animate-spin" />
        </div>
      ) : journeys.length === 0 ? (
        <div className="text-center py-16 bg-navy-900/40 border border-white/5 rounded-2xl">
          <Navigation className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No journeys yet</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Plan your first trip in the EV Range Planner to see calculations here.
          </p>
          <Link
            to="/app/planner"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ev-green text-navy-950 font-bold text-sm hover:opacity-90 shadow-lg shadow-ev-green/20"
          >
            <Gauge className="w-4 h-4" />
            Open EV Range Planner
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {journeys.map((j) => {
            const badge = statusBadge[j.result_status] || statusBadge.feasible;
            const BadgeIcon = badge.icon;
            const jid = j.id || j._id || '';

            return (
              <motion.div
                key={jid}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-navy-900/60 border border-white/10 hover:border-white/20 rounded-2xl p-5 backdrop-blur-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Status badge + destination */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.border} ${badge.text}`}>
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                      {(j.manufacturer || j.model) && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {[j.manufacturer, j.model].filter(Boolean).join(' ')}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-white truncate">
                      {getDestination(j)}
                    </h3>

                    {j.starting_location && (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {j.starting_location}
                      </p>
                    )}

                    {/* Key metrics */}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-300">
                      {getBatteryPct(j) != null && (
                        <span className="flex items-center gap-1">
                          <Battery className="w-3.5 h-3.5 text-ev-green" />
                          {getBatteryPct(j)}%
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-ev-cyan" />
                        {getRangeKm(j)} km range
                      </span>
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-slate-400" />
                        {getDistanceKm(j)} km trip
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(j.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {j.remaining_margin_km != null && (
                      <p className={`mt-2 text-xs font-mono font-semibold ${j.remaining_margin_km >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        Margin: {j.remaining_margin_km >= 0 ? '+' : ''}{j.remaining_margin_km} km
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setViewJourney(j)}
                      className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === jid ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteMutation.mutate(jid)}
                          disabled={deleteMutation.isPending}
                          className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500/30 transition-all"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-400 text-xs hover:bg-white/5 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(jid)}
                        className="p-2 rounded-lg border border-white/10 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all"
                        title="Delete journey"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {viewJourney && (
          <JourneyModal journey={viewJourney} onClose={() => setViewJourney(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
