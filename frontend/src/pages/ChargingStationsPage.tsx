import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Zap, MapPin, Gauge, Shield, Search, Filter,
  Navigation, CheckCircle2, BatteryCharging, AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import type { ChargingStation } from '../types';

interface StationsResponse {
  mode: string;
  notice?: string;
  note?: string;
  stations: ChargingStation[];
}

export function ChargingStationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [minPower, setMinPower] = useState<number>(0);
  const [selectedConnector, setSelectedConnector] = useState<string>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['charging-stations-list'],
    queryFn: async (): Promise<StationsResponse> => {
      const { data } = await api.get<StationsResponse>('/charging-stations');
      return data;
    },
  });

  const stations = data?.stations ?? [];
  const demoNotice = data?.notice || data?.note || null;
  const isDemo = data?.mode === 'demo';

  const filteredStations = stations.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.operator && s.operator.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPower = s.max_power_kw >= minPower;

    const matchesConnector =
      selectedConnector === 'all' || s.connector_types.includes(selectedConnector);

    return matchesSearch && matchesPower && matchesConnector;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-ev-green/10 text-ev-green border border-ev-green/20 mb-2">
          <Zap className="w-3.5 h-3.5" />
          <span>EV Charging Network</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
          Charging Stations Directory
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Explore charging stations, filter by connector type or speed, and find the right charger for your journey
        </p>
      </div>

      {/* Demo Notice */}
      {isDemo && demoNotice && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-relaxed">{demoNotice}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-200/90 leading-relaxed">
            Failed to load charging stations. Please check your connection or try again later.
          </p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-navy-900/70 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by station name, network operator, or city..."
            className="w-full bg-navy-950 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-ev-green"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={minPower}
            onChange={(e) => setMinPower(Number(e.target.value))}
            className="bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-ev-green"
          >
            <option value="0">All Speeds (Any kW)</option>
            <option value="50">Fast (≥ 50 kW)</option>
            <option value="150">Ultra-Fast (≥ 150 kW)</option>
            <option value="250">Hyper-Fast (≥ 250 kW)</option>
          </select>

          <select
            value={selectedConnector}
            onChange={(e) => setSelectedConnector(e.target.value)}
            className="bg-navy-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-ev-green"
          >
            <option value="all">All Connectors</option>
            <option value="CCS2">CCS2</option>
            <option value="Type 2">Type 2 AC</option>
            <option value="CHAdeMO">CHAdeMO</option>
            <option value="NACS">NACS / Tesla</option>
          </select>
        </div>
      </div>

      {/* Station Cards */}
      {isLoading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-10 h-10 border-2 border-ev-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredStations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStations.map((st) => (
            <motion.div
              key={st.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-navy-900/70 border border-white/10 hover:border-ev-green/30 rounded-3xl p-6 backdrop-blur-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-ev-green/10 flex items-center justify-center text-ev-green border border-ev-green/20">
                    <BatteryCharging className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    {st.is_demo ? 'Demo Data' : st.availability}
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                    {st.operator || 'Charging Network'}
                  </span>
                  <h3 className="text-lg font-bold text-white group-hover:text-ev-green transition-colors mt-0.5">
                    {st.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>{st.address}</span>
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="bg-navy-950/60 p-3 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block">Max Speed</span>
                    <span className="text-base font-black text-white">{st.max_power_kw} kW</span>
                  </div>
                  <div className="bg-navy-950/60 p-3 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-400 block">Detour</span>
                    <span className="text-base font-black text-white">{st.distance_from_route_km} km</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {st.connector_types.map((c) => (
                    <span
                      key={c}
                      className="text-[10px] font-semibold bg-white/5 text-slate-300 px-2 py-0.5 rounded-md border border-white/5"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span className="text-slate-500">{st.is_demo ? 'Demonstration Data' : st.operator}</span>
                <span className="text-ev-green font-semibold">View Details</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-navy-900/30 border border-dashed border-white/10 rounded-3xl">
          <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Charging Stations Match Filters</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Try adjusting your search query, power minimum, or connector type.
          </p>
        </div>
      )}
    </div>
  );
}
