import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car, Plus, Trash2, Edit3, Battery, Gauge, Calendar,
  AlertCircle, CheckCircle, X, ChevronRight, Zap, Hash
} from 'lucide-react';
import { vehicleService } from '../services/vehicleService';
import type { Vehicle, VehicleCreate } from '../types';
import toast from 'react-hot-toast';

export function GaragePage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [nickname, setNickname] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [modelYear, setModelYear] = useState<number | ''>('');
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState<number | ''>('');
  const [fullChargeRangeKm, setFullChargeRangeKm] = useState<number | ''>('');
  const [registrationIdentifier, setRegistrationIdentifier] = useState('');
  const [notes, setNotes] = useState('');

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehicleService.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: VehicleCreate) => vehicleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['journey-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Vehicle added to garage!');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to save vehicle');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleCreate> }) =>
      vehicleService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle updated successfully!');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update vehicle');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehicleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['journey-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Vehicle removed from garage');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to delete vehicle');
    },
  });

  const openAddModal = () => {
    setEditingVehicle(null);
    setNickname('');
    setManufacturer('');
    setModel('');
    setModelYear('');
    setBatteryCapacityKwh('');
    setFullChargeRangeKm('');
    setRegistrationIdentifier('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setNickname(v.nickname);
    setManufacturer(v.manufacturer);
    setModel(v.model);
    setModelYear(v.model_year || '');
    setBatteryCapacityKwh(v.battery_capacity_kwh || '');
    setFullChargeRangeKm(v.full_charge_range_km || '');
    setRegistrationIdentifier(v.registration_identifier || '');
    setNotes(v.notes || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !manufacturer.trim() || !model.trim()) {
      toast.error('Vehicle nickname, manufacturer, and model are required');
      return;
    }

    const payload: VehicleCreate = {
      nickname: nickname.trim(),
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      model_year: modelYear ? Number(modelYear) : undefined,
      battery_capacity_kwh: batteryCapacityKwh ? Number(batteryCapacityKwh) : undefined,
      full_charge_range_km: fullChargeRangeKm ? Number(fullChargeRangeKm) : 400.0,
      registration_identifier: registrationIdentifier.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}" from your garage?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
            My EV Garage
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your electric fleet and vehicle battery specifications
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-ev-green to-ev-cyan text-navy-950 font-bold text-xs hover:opacity-95 shadow-lg shadow-ev-green/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Electric Vehicle</span>
        </button>
      </div>

      {/* Grid of Vehicles */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-10 h-10 border-2 border-ev-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <motion.div
              key={v.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-navy-900/70 border border-white/10 hover:border-ev-green/30 rounded-3xl p-6 backdrop-blur-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-ev-green/10 flex items-center justify-center text-ev-green border border-ev-green/20">
                    <Car className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(v)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                      title="Edit vehicle"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(v.id, v.nickname)}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Delete vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-white group-hover:text-ev-green transition-colors">
                      {v.nickname}
                    </h3>
                    {v.registration_identifier && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-white/90 border border-white/10">
                        <Hash className="w-3 h-3 text-ev-cyan" />
                        {v.registration_identifier}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {v.manufacturer} {v.model}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="bg-navy-950/60 p-3 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block">Rated Max Range</span>
                    <span className="text-base font-bold text-white">{v.full_charge_range_km || 400} km</span>
                  </div>
                  <div className="bg-navy-950/60 p-3 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block">Battery Pack</span>
                    <span className="text-base font-bold text-white">
                      {v.battery_capacity_kwh ? `${v.battery_capacity_kwh} kWh` : 'N/A'}
                    </span>
                  </div>
                </div>

                {v.model_year && (
                  <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Model Year: {v.model_year}</span>
                  </div>
                )}
              </div>

              {v.notes && (
                <div className="mt-4 pt-3 border-t border-white/5 text-xs text-slate-400 italic">
                  "{v.notes}"
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-navy-900/40 p-8">
          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-slate-500 mx-auto mb-4">
            <Car className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white font-display">No Vehicles in Garage Yet</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Add your electric vehicles to save battery specs, view telemetry logs, and simplify trip planning.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-ev-green to-ev-cyan text-navy-950 font-bold text-xs hover:opacity-95 shadow-lg shadow-ev-green/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First EV</span>
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-navy-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={closeModal}
                className="absolute top-6 right-6 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-white font-display">
                {editingVehicle ? 'Edit Vehicle Details' : 'Add Electric Vehicle'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your vehicle specifications to store in your MongoDB garage
              </p>

              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Vehicle Nickname *
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Daily Commuter / Blue Lightning"
                    required
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-ev-green"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Manufacturer *
                    </label>
                    <input
                      type="text"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      placeholder="e.g. Tesla / Hyundai"
                      required
                      className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-ev-green"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Model *
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. Model Y / Ioniq 5"
                      required
                      className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-ev-green"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Registration / Plate
                    </label>
                    <input
                      type="text"
                      value={registrationIdentifier}
                      onChange={(e) => setRegistrationIdentifier(e.target.value)}
                      placeholder="e.g. EV-9482-DL"
                      className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-ev-green"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Battery Pack (kWh)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={batteryCapacityKwh}
                      onChange={(e) => setBatteryCapacityKwh(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 77.4"
                      className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-ev-green"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Model Year
                    </label>
                    <input
                      type="number"
                      min="2000"
                      max="2030"
                      value={modelYear}
                      onChange={(e) => setModelYear(e.target.value ? Number(e.target.value) : '')}
                      placeholder="2024"
                      className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-ev-green"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Rated Range (km)
                    </label>
                    <input
                      type="number"
                      value={fullChargeRangeKm}
                      onChange={(e) => setFullChargeRangeKm(e.target.value ? Number(e.target.value) : '')}
                      placeholder="400"
                      className="w-full bg-navy-950 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-ev-green"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tire size, battery condition, or notes..."
                    rows={2}
                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-ev-green resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-ev-green to-ev-cyan text-navy-950 font-bold text-xs hover:opacity-95 shadow-md shadow-ev-green/20 transition-all"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
