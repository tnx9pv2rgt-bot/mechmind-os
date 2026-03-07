'use client';

import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Wrench, 
  Clock, 
  MapPin, 
  Activity,
  CheckCircle,
  AlertCircle,
  User,
  MoreHorizontal
} from 'lucide-react';

interface Bay {
  id: string;
  name: string;
  type: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  currentVehicle?: {
    licensePlate: string;
    make: string;
    model: string;
    progress: number;
  };
  technician?: {
    name: string;
    avatar?: string;
  };
  estimatedCompletion?: string;
}

interface TechnicianLocation {
  id: string;
  name: string;
  status: 'AVAILABLE' | 'WORKING' | 'BREAK';
  currentBay?: string;
  lastSeen: string;
}

interface ShopFloorStats {
  totalBays: number;
  occupiedBays: number;
  availableBays: number;
  activeTechnicians: number;
  vehiclesInShop: number;
  avgServiceTime: number;
}

interface RealTimeTrackingProps {
  tenantId: string;
}

const BayCard: React.FC<{ bay: Bay; onClick: () => void }> = ({ bay, onClick }) => {
  const statusColors = {
    AVAILABLE: 'bg-emerald-50 border-emerald-200',
    OCCUPIED: 'bg-blue-50 border-blue-200',
    RESERVED: 'bg-amber-50 border-amber-200',
    MAINTENANCE: 'bg-slate-50 border-slate-200',
  };

  const statusIcons = {
    AVAILABLE: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    OCCUPIED: <Car className="w-5 h-5 text-blue-500" />,
    RESERVED: <Clock className="w-5 h-5 text-amber-500" />,
    MAINTENANCE: <Wrench className="w-5 h-5 text-slate-500" />,
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${statusColors[bay.status]}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          {statusIcons[bay.status]}
          <span className="font-semibold text-slate-800">{bay.name}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          bay.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
          bay.status === 'OCCUPIED' ? 'bg-blue-100 text-blue-700' :
          bay.status === 'RESERVED' ? 'bg-amber-100 text-amber-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {bay.status}
        </span>
      </div>

      {bay.currentVehicle && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Car className="w-4 h-4" />
            <span>{bay.currentVehicle.licensePlate}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {bay.currentVehicle.make} {bay.currentVehicle.model}
          </p>
          
          {/* Progress bar */}
          <div className="mt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Progress</span>
              <span>{bay.currentVehicle.progress}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${bay.currentVehicle.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {bay.technician && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center">
            <User className="w-3 h-3 text-slate-600" />
          </div>
          <span className="text-sm text-slate-600">{bay.technician.name}</span>
        </div>
      )}

      {bay.estimatedCompletion && (
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          <span>Est. completion: {bay.estimatedCompletion}</span>
        </div>
      )}
    </div>
  );
};

const TechnicianBadge: React.FC<{ tech: TechnicianLocation }> = ({ tech }) => {
  const statusColors = {
    AVAILABLE: 'bg-emerald-100 text-emerald-700',
    WORKING: 'bg-blue-100 text-blue-700',
    BREAK: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
        <User className="w-5 h-5 text-slate-600" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-slate-800">{tech.name}</p>
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full ${statusColors[tech.status]}`}>
            {tech.status}
          </span>
          {tech.currentBay && (
            <span className="text-slate-500">
              @ {tech.currentBay}
            </span>
          )}
        </div>
      </div>
      <div className="text-xs text-slate-400">
        {tech.lastSeen}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ 
  label: string; 
  value: string | number; 
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ label, value, icon, trend }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg">
        {icon}
      </div>
    </div>
    {trend && (
      <div className={`mt-2 text-xs ${
        trend === 'up' ? 'text-emerald-600' :
        trend === 'down' ? 'text-red-600' :
        'text-slate-500'
      }`}>
        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} 
        {' '}{trend === 'up' ? 'Increased' : trend === 'down' ? 'Decreased' : 'No change'}
      </div>
    )}
  </div>
);

export const RealTimeTracking: React.FC<RealTimeTrackingProps> = ({ tenantId }) => {
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'floor'>('grid');

  // Mock data - would be fetched from API
  const bays: Bay[] = [
    {
      id: '1',
      name: 'Bay 1',
      type: 'LIFT',
      status: 'OCCUPIED',
      currentVehicle: {
        licensePlate: 'AB123CD',
        make: 'BMW',
        model: '320i',
        progress: 65,
      },
      technician: { name: 'Mario Rossi' },
      estimatedCompletion: '14:30',
    },
    {
      id: '2',
      name: 'Bay 2',
      type: 'LIFT',
      status: 'AVAILABLE',
    },
    {
      id: '3',
      name: 'Bay 3',
      type: 'ALIGNMENT',
      status: 'OCCUPIED',
      currentVehicle: {
        licensePlate: 'EF456GH',
        make: 'Audi',
        model: 'A4',
        progress: 30,
      },
      technician: { name: 'Luigi Bianchi' },
      estimatedCompletion: '16:00',
    },
    {
      id: '4',
      name: 'Bay 4',
      type: 'LIFT',
      status: 'RESERVED',
    },
    {
      id: '5',
      name: 'Bay 5',
      type: 'DYNO',
      status: 'MAINTENANCE',
    },
    {
      id: '6',
      name: 'Bay 6',
      type: 'LIFT',
      status: 'OCCUPIED',
      currentVehicle: {
        licensePlate: 'IJ789KL',
        make: 'Mercedes',
        model: 'C200',
        progress: 90,
      },
      technician: { name: 'Giovanni Verdi' },
      estimatedCompletion: '13:45',
    },
  ];

  const technicians: TechnicianLocation[] = [
    { id: '1', name: 'Mario Rossi', status: 'WORKING', currentBay: 'Bay 1', lastSeen: '2 min ago' },
    { id: '2', name: 'Luigi Bianchi', status: 'WORKING', currentBay: 'Bay 3', lastSeen: '5 min ago' },
    { id: '3', name: 'Giovanni Verdi', status: 'WORKING', currentBay: 'Bay 6', lastSeen: '1 min ago' },
    { id: '4', name: 'Paolo Neri', status: 'AVAILABLE', lastSeen: 'Now' },
    { id: '5', name: 'Andrea Russo', status: 'BREAK', lastSeen: '15 min ago' },
  ];

  const stats: ShopFloorStats = {
    totalBays: 8,
    occupiedBays: 3,
    availableBays: 4,
    activeTechnicians: 5,
    vehiclesInShop: 3,
    avgServiceTime: 2.5,
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Shop Floor Tracking</h1>
          <p className="text-slate-500">Real-time bay status and technician locations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'list' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('floor')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'floor' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'
            }`}
          >
            Floor Plan
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Total Bays"
          value={stats.totalBays}
          icon={<MapPin className="w-5 h-5 text-slate-600" />}
        />
        <StatCard
          label="Occupied"
          value={stats.occupiedBays}
          icon={<Car className="w-5 h-5 text-blue-600" />}
          trend="up"
        />
        <StatCard
          label="Available"
          value={stats.availableBays}
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          label="Technicians"
          value={stats.activeTechnicians}
          icon={<User className="w-5 h-5 text-purple-600" />}
        />
        <StatCard
          label="Vehicles In Shop"
          value={stats.vehiclesInShop}
          icon={<Activity className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          label="Avg Service Time"
          value={`${stats.avgServiceTime}h`}
          icon={<Clock className="w-5 h-5 text-slate-600" />}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bays Grid */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Service Bays</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {bays.map((bay) => (
              <BayCard
                key={bay.id}
                bay={bay}
                onClick={() => setSelectedBay(bay)}
              />
            ))}
          </div>
        </div>

        {/* Technicians Panel */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Technicians</h2>
          <div className="space-y-3">
            {technicians.map((tech) => (
              <TechnicianBadge key={tech.id} tech={tech} />
            ))}
          </div>

          {/* Recent Activity */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h2>
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
              {[
                { time: '10:30', event: 'Vehicle AB123CD checked into Bay 1' },
                { time: '10:15', event: 'Vehicle XY987ZY completed service' },
                { time: '09:45', event: 'Technician Mario Rossi assigned to Bay 1' },
                { time: '09:30', event: 'Bay 4 reserved for 11:00 appointment' },
              ].map((activity, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-slate-400 font-mono">{activity.time}</span>
                  <span className="text-slate-600">{activity.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bay Detail Modal */}
      {selectedBay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedBay.name}</h3>
                <p className="text-slate-500">{selectedBay.type}</p>
              </div>
              <button
                onClick={() => setSelectedBay(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            {selectedBay.currentVehicle ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Current Vehicle</p>
                  <p className="font-semibold text-slate-800">
                    {selectedBay.currentVehicle.make} {selectedBay.currentVehicle.model}
                  </p>
                  <p className="text-lg font-mono text-slate-600">
                    {selectedBay.currentVehicle.licensePlate}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Assigned Technician</p>
                  <p className="font-semibold text-slate-800">
                    {selectedBay.technician?.name}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Service Progress</span>
                    <span className="font-medium">{selectedBay.currentVehicle.progress}%</span>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${selectedBay.currentVehicle.progress}%` }}
                    />
                  </div>
                </div>

                {selectedBay.estimatedCompletion && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>Estimated completion: {selectedBay.estimatedCompletion}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600">
                    View Details
                  </button>
                  <button className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200">
                    Release Bay
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-slate-600">This bay is available</p>
                <button className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600">
                  Assign Vehicle
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeTracking;
