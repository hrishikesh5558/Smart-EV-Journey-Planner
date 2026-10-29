import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car, Navigation, Battery, Gauge, AlertTriangle, CheckCircle,
  ChevronDown, Info, Save, RotateCcw, Zap, MapPin, FileText,
  Clock, TrendingUp, ShieldCheck
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { vehicleService } from '../services/vehicleService';
import { journeyService } from '../services/journeyService';
import type {
  Vehicle,
  JourneyCalculateResponse,
  JourneySaveRequest,
} from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────

const statusColor = {
  feasible: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: CheckCircle },
  low_reserve: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: AlertTriangle },
  charging_recommended: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: AlertTriangle },
};

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 ${highlight ? 'bg-white/3 -mx-4 px-4 rounded' : ''}`}>
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-bold font-mono ${highlight ? 'text-white' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function EVRangePlannerPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Vehicle selector
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: vehicleService.list });
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  // Form state
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [batteryKwh, setBatteryKwh] = useState('');
  const [batteryPct, setBatteryPct] = useState('');
  const [rangeKm, setRangeKm] = useState('');
  const [startingLocation, setStartingLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [journeyKm, setJourneyKm] = useState('');
  const [reservePct, setReservePct] = useState(String(user?.default_safety_reserve ?? 15));
  const [notes, setNotes] = useState('');
  const [drivingConditions, setDrivingConditions] = useState('');

  // UI state
  const [result, setResult] = useState<JourneyCalculateResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  // When a saved vehicle is selected, auto-fill vehicle details
  useEffect(() => {
    if (!selectedVehicleId) return;
    const v = vehicles.find((x: Vehicle) => (x.id || x._id) === selectedVehicleId);
    if (!v) return;
    setManufacturer(v.manufacturer || '');
    setModel(v.model || '');
    setBatteryKwh(v.battery_capacity_kwh ? String(v.battery_capacity_kwh) : '');
  }, [selectedVehicleId, vehicles]);

  // ─── Validation ──────────────────────────────────────────────────────────

  function validate() {
    const errors: Record<string, string> = {};
    const pct = Number(batteryPct);
    const km = Number(rangeKm);
    const jKm = Number(journeyKm);
    const res = Number(reservePct);

    if (batteryPct === '' || isNaN(pct)) errors.batteryPct = 'Battery percentage is required.';
    else if (pct < 0 || pct > 100) errors.batteryPct = 'Battery percentage must be 0–100%.';

    if (rangeKm === '' || isNaN(km)) errors.rangeKm = 'Estimated remaining range is required.';
    else if (km < 0) errors.rangeKm = 'Range cannot be negative.';

    if (journeyKm === '' || isNaN(jKm)) errors.journeyKm = 'Journey distance is required.';
    else if (jKm <= 0) errors.journeyKm = 'Journey distance must be greater than 0.';

    if (reservePct === '' || isNaN(res)) errors.reservePct = 'Safety reserve is required.';
    else if (res < 0 || res > 50) errors.reservePct = 'Safety reserve must be 0–50%.';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─── Calculate ───────────────────────────────────────────────────────────

  const calculateMutation = useMutation({
    mutationFn: () =>
      journeyService.calculate({
        current_battery_percentage: Number(batteryPct),
        estimated_remaining_range_km: Number(rangeKm),
        planned_journey_distance_km: Number(journeyKm),
        reserve_percentage: Number(reservePct),
        driving_conditions: drivingConditions || undefined,
      }),
    onSuccess: (data) => {
      setResult(data);
      setSaved(false);
      toast.success('Range calculation complete!');
      // Smooth scroll to result
      setTimeout(() => {
        document.getElementById('result-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Calculation failed. Please check your inputs.');
    },
  });

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setResult(null);
    calculateMutation.mutate();
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: JourneySaveRequest = {
        vehicle_id: selectedVehicleId || undefined,
        manufacturer: manufacturer || undefined,
        model: model || undefined,
        battery_capacity_kwh: batteryKwh ? Number(batteryKwh) : undefined,
        current_battery_percentage: Number(batteryPct),
        estimated_remaining_range_km: Number(rangeKm),
        starting_location: startingLocation || undefined,
        destination: destination || undefined,
        journey_distance_km: Number(journeyKm),
        reserve_percentage: Number(reservePct),
        notes: notes || undefined,
        driving_conditions: drivingConditions || undefined,
      };
      return journeyService.save(payload);
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['journeys'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Journey saved to your history!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to save. Please try again.');
    },
  });

  // ─── Reset ────────────────────────────────────────────────────────────────

  function handleReset() {
    setSelectedVehicleId('');
    setManufacturer(''); setModel(''); setBatteryKwh('');
    setBatteryPct(''); setRangeKm('');
    setStartingLocation(''); setDestination('');
    setJourneyKm('');
    setReservePct(String(user?.default_safety_reserve ?? 15));
    setNotes(''); setDrivingConditions('');
    setResult(null); setSaved(false);
    setValidationErrors({});
  }

  // ─── Result UI ────────────────────────────────────────────────────────────

  const resultColors = result ? (statusColor[result.result_status as keyof typeof statusColor] || statusColor.feasible) : null;
  const ResultIcon = resultColors?.icon ?? CheckCircle;

  // ─── Render ───────────────────────────────────────────────────────────────

  const fieldClass = (key: string) =>
    `w-full bg-[#0d1929] border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors ${
      validationErrors[key] ? 'border-red-500/60 focus:border-red-400' : 'border-white/10 focus:border-ev-green'
    }`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-ev-green/10 text-ev-green border border-ev-green/20 mb-3">
          <Gauge className="w-3.5 h-3.5" />
          <span>Manual Input – No Image Required</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
          EV Range Planner
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter your vehicle's current battery status and journey details to evaluate whether your charge is sufficient to reach your destination safely.
        </p>
      </div>

      <form onSubmit={handleCalculate} className="space-y-6">
        {/* ── Vehicle Info Card ── */}
        <div className="bg-navy-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Car className="w-5 h-5 text-ev-green" />
            <h2 className="text-base font-bold text-white">Vehicle Information</h2>
          </div>

          {/* Saved vehicle picker */}
          {vehicles.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Select Saved Vehicle (optional)
              </label>
              <div className="relative">
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-[#0d1929] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-ev-green appearance-none"
                >
                  <option value="">— Enter details manually —</option>
                  {vehicles.map((v: Vehicle) => (
                    <option key={v.id || v._id} value={v.id || v._id}>
                      {v.nickname} ({v.manufacturer} {v.model})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Manufacturer</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Tesla"
                className="w-full bg-[#0d1929] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-ev-green"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Model 3"
                className="w-full bg-[#0d1929] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-ev-green"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Battery Capacity (kWh)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={batteryKwh}
                onChange={(e) => setBatteryKwh(e.target.value)}
                placeholder="e.g. 75"
                className="w-full bg-[#0d1929] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-ev-green"
              />
            </div>
          </div>

          {/* Battery % + Remaining Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Current Battery Percentage <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0" max="100" step="1"
                  value={batteryPct}
                  onChange={(e) => { setBatteryPct(e.target.value); setValidationErrors(p => ({ ...p, batteryPct: '' })); }}
                  placeholder="e.g. 80"
                  className={fieldClass('batteryPct') + ' pr-10'}
                />
                <Battery className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              {validationErrors.batteryPct && (
                <p className="mt-1 text-xs text-red-400">{validationErrors.batteryPct}</p>
              )}
              {batteryPct && !validationErrors.batteryPct && (
                <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-ev-green rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, Number(batteryPct)))}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Estimated Remaining Range (km) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0" step="1"
                  value={rangeKm}
                  onChange={(e) => { setRangeKm(e.target.value); setValidationErrors(p => ({ ...p, rangeKm: '' })); }}
                  placeholder="e.g. 250"
                  className={fieldClass('rangeKm') + ' pr-14'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">km</span>
              </div>
              {validationErrors.rangeKm && (
                <p className="mt-1 text-xs text-red-400">{validationErrors.rangeKm}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Journey Details Card ── */}
        <div className="bg-navy-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Navigation className="w-5 h-5 text-ev-cyan" />
            <h2 className="text-base font-bold text-white">Journey Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Starting Location</label>
              <div className="relative">
                <input
                  type="text"
                  value={startingLocation}
                  onChange={(e) => setStartingLocation(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full bg-[#0d1929] border border-white/10 rounded-xl px-4 py-2.5 pl-9 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-ev-green"
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Destination</label>
              <div className="relative">
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Pune"
                  className="w-full bg-[#0d1929] border border-white/10 rounded-xl px-4 py-2.5 pl-9 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-ev-green"
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ev-green" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Total Journey Distance (km) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1" step="1"
                  value={journeyKm}
                  onChange={(e) => { setJourneyKm(e.target.value); setValidationErrors(p => ({ ...p, journeyKm: '' })); }}
                  placeholder="e.g. 180"
                  className={fieldClass('journeyKm') + ' pr-14'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">km</span>
              </div>
              {validationErrors.journeyKm && (
                <p className="mt-1 text-xs text-red-400">{validationErrors.journeyKm}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Safety Reserve <span className="text-red-400">*</span>{' '}
                <span className="text-ev-green font-mono">{reservePct}%</span>
              </label>
              <input
                type="range"
                min="0" max="30" step="1"
                value={reservePct}
                onChange={(e) => { setReservePct(e.target.value); setValidationErrors(p => ({ ...p, reservePct: '' })); }}
                className="w-full accent-ev-green cursor-pointer mt-2"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>0%</span><span>15%</span><span>30%</span>
              </div>
              {validationErrors.reservePct && (
                <p className="mt-1 text-xs text-red-400">{validationErrors.reservePct}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Driving Conditions</label>
              <div className="relative">
                <select
                  value={drivingConditions}
                  onChange={(e) => setDrivingConditions(e.target.value)}
                  className="w-full bg-[#0d1929] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-ev-green appearance-none"
                >
                  <option value="">Normal conditions</option>
                  <option value="highway">Highway / High-speed</option>
                  <option value="city">City / Stop-and-go traffic</option>
                  <option value="hilly">Hilly / Mountainous terrain</option>
                  <option value="cold_weather">Cold weather (&lt;5°C)</option>
                  <option value="hot_weather">Hot weather (&gt;35°C)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Additional Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional trip notes"
                className="w-full bg-[#0d1929] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-ev-green"
              />
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={calculateMutation.isPending}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-ev-green to-ev-cyan text-navy-950 font-bold text-sm shadow-lg shadow-ev-green/20 hover:opacity-95 transition-all disabled:opacity-60"
          >
            {calculateMutation.isPending ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-navy-950 border-t-transparent animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Gauge className="w-4 h-4" />
                Calculate Range
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-slate-300 font-semibold text-sm hover:bg-white/5 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </form>

      {/* ── Result Card ── */}
      <AnimatePresence>
        {result && (
          <motion.div
            id="result-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            {/* Verdict Banner */}
            <div className={`rounded-2xl border p-5 ${resultColors?.bg} ${resultColors?.border} flex items-start gap-4`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${resultColors?.bg} border ${resultColors?.border}`}>
                <ResultIcon className={`w-5 h-5 ${resultColors?.text}`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${resultColors?.text}`}>{result.feasibility_label}</p>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">{result.recommendation}</p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-navy-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-ev-green" />
                Range Calculation Breakdown
              </h3>

              <div className="space-y-0">
                <StatRow label="Current Battery Percentage" value={`${result.current_battery_percentage ?? batteryPct}%`} />
                <StatRow label="Estimated Remaining Range" value={`${result.estimated_remaining_range_km} km`} />
                <StatRow label="Journey Distance" value={`${result.planned_journey_distance_km} km`} />
                <StatRow label="Safety Reserve Percentage" value={`${result.reserve_percentage}%`} />
                <StatRow label="Safety Reserve Distance" value={`${result.reserve_distance_km} km`} highlight />
                <StatRow label="Usable Driving Range" value={`${result.usable_range_km} km`} highlight />
                <StatRow
                  label="Remaining Journey Margin"
                  value={`${result.remaining_margin_km >= 0 ? '+' : ''}${result.remaining_margin_km} km`}
                  highlight
                />
                <div className="py-3 border-t border-white/5 mt-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Final Recommendation
                  </span>
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    {result.recommendation}
                  </p>
                </div>
                {result.shortage_km !== undefined && result.shortage_km !== null && result.shortage_km > 0 && (
                  <div className="flex items-center justify-between py-2.5 bg-red-500/5 -mx-4 px-4 rounded">
                    <span className="text-sm text-red-400">Shortfall</span>
                    <span className="text-sm font-bold font-mono text-red-400">−{result.shortage_km} km</span>
                  </div>
                )}
              </div>

              {/* Formula reminder */}
              <div className="mt-5 p-3 rounded-xl bg-white/3 border border-white/5 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Calculation formula:</p>
                <p>Safety Reserve Distance = {result.estimated_remaining_range_km} × {result.reserve_percentage}% = {result.reserve_distance_km} km</p>
                <p>Usable Range = {result.estimated_remaining_range_km} − {result.reserve_distance_km} = {result.usable_range_km} km</p>
                <p>Remaining Journey Margin = {result.usable_range_km} − {result.planned_journey_distance_km} = {result.remaining_margin_km} km</p>
              </div>

              {/* Disclaimer */}
              <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-white/3 border border-white/5">
                <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Disclaimer: {result.disclaimer || 'Actual driving range depends on traffic, road conditions, weather, speed, battery condition, and driving style.'}
                </p>
              </div>

              {/* Save button */}
              <div className="mt-5 flex flex-wrap gap-3">
                {!saved ? (
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ev-green/10 border border-ev-green/30 text-ev-green font-bold text-sm hover:bg-ev-green/20 transition-all disabled:opacity-60"
                  >
                    {saveMutation.isPending ? (
                      <><div className="w-3.5 h-3.5 rounded-full border-2 border-ev-green border-t-transparent animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Save to Journey History</>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Saved to History
                  </div>
                )}
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 font-semibold text-sm hover:bg-white/5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Plan Another Journey
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick Example ── */}
      {!result && (
        <div className="bg-navy-900/40 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-ev-green" />
            <h3 className="text-sm font-bold text-white">Quick Example</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Battery: <strong className="text-white">80%</strong> · Remaining Range: <strong className="text-white">250 km</strong> ·
            Journey: <strong className="text-white">180 km</strong> · Reserve: <strong className="text-white">15%</strong>
          </p>
          <div className="text-xs text-slate-400 space-y-1">
            <p>→ Reserve distance = 250 × 15% = <strong className="text-white">37.5 km</strong></p>
            <p>→ Usable range = 250 − 37.5 = <strong className="text-white">212.5 km</strong></p>
            <p>→ Remaining margin = 212.5 − 180 = <strong className="text-ev-green">+32.5 km ✓ Sufficient</strong></p>
          </div>
          <button
            type="button"
            onClick={() => {
              setBatteryPct('80');
              setRangeKm('250');
              setJourneyKm('180');
              setReservePct('15');
              setManufacturer('Tesla');
              setModel('Model 3');
            }}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ev-green/10 border border-ev-green/20 text-ev-green text-xs font-semibold hover:bg-ev-green/20 transition-all"
          >
            <ShieldCheck className="w-3 h-3" />
            Load Example Values
          </button>
        </div>
      )}
    </div>
  );
}
