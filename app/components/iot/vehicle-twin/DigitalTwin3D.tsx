'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  useGLTF, 
  Html, 
  PerspectiveCamera,
  Environment,
  ContactShadows,
  Box,
  Sphere
} from '@react-three/drei';
import * as THREE from 'three';

// Component Health Color Mapping
const getHealthColor = (healthScore: number, status: string): string => {
  if (status === 'CRITICAL' || healthScore < 30) return '#ef4444';
  if (status === 'WARNING' || healthScore < 70) return '#f59e0b';
  if (status === 'REPLACED') return '#3b82f6';
  if (status === 'REPAIRING') return '#8b5cf6';
  return '#10b981';
};

interface ComponentData {
  id: string;
  name: string;
  category: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'REPLACED' | 'REPAIRING';
  healthScore: number;
  position: { x: number; y: number; z: number };
  lastServiceDate?: string;
  nextServiceDue?: string;
}

interface PredictiveAlert {
  id: string;
  componentId: string;
  componentName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  predictedFailureDate: string;
  recommendedAction: string;
}

interface DigitalTwin3DProps {
  vehicleId: string;
  modelUrl?: string;
  components: ComponentData[];
  alerts: PredictiveAlert[];
  onComponentSelect?: (component: ComponentData) => void;
}

// Component Hotspot Marker
const ComponentMarker: React.FC<{
  component: ComponentData;
  onClick: () => void;
  isSelected: boolean;
}> = ({ component, onClick, isSelected }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = getHealthColor(component.healthScore, component.status);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(
        1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
      );
    }
  });

  return (
    <group position={[component.position.x, component.position.y, component.position.z]}>
      <Sphere
        ref={meshRef}
        args={[0.15, 16, 16]}
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </Sphere>
      
      {isSelected && (
        <Html distanceFactor={10}>
          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 min-w-[200px]">
            <h4 className="font-semibold text-slate-800">{component.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-slate-600">{component.status}</span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Health</span>
                <span>{component.healthScore}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full mt-1">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${component.healthScore}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Vehicle Model (simplified wireframe representation)
const VehicleModel: React.FC<{
  components: ComponentData[];
  selectedComponent: ComponentData | null;
  onComponentSelect: (component: ComponentData) => void;
}> = ({ components, selectedComponent, onComponentSelect }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Simplified vehicle chassis */}
      <Box args={[2, 0.5, 4]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#334155" wireframe />
      </Box>
      
      {/* Cabin */}
      <Box args={[1.8, 0.6, 2]} position={[0, 1, -0.5]}>
        <meshStandardMaterial color="#475569" wireframe />
      </Box>

      {/* Wheels */}
      {[[-1, 0.3, 1.5], [1, 0.3, 1.5], [-1, 0.3, -1.5], [1, 0.3, -1.5]].map((pos, i) => (
        <Box key={i} args={[0.3, 0.6, 0.6]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#1e293b" />
        </Box>
      ))}

      {/* Component Markers */}
      {components.map((component) => (
        <ComponentMarker
          key={component.id}
          component={component}
          onClick={() => onComponentSelect(component)}
          isSelected={selectedComponent?.id === component.id}
        />
      ))}
    </group>
  );
};

// Loading Component
const Loader: React.FC = () => (
  <Html center>
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
      <p className="mt-2 text-sm text-slate-500">Loading 3D Model...</p>
    </div>
  </Html>
);

// Main Component
export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({
  vehicleId,
  modelUrl,
  components,
  alerts,
  onComponentSelect,
}) => {
  const [selectedComponent, setSelectedComponent] = useState<ComponentData | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'exploded' | 'xray'>('3d');
  const [showAlerts, setShowAlerts] = useState(true);

  const handleComponentSelect = (component: ComponentData) => {
    setSelectedComponent(component);
    onComponentSelect?.(component);
  };

  // Filter critical components for alert display
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden">
      {/* Header Controls */}
      <div className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-white">Digital Vehicle Twin</h2>
          <p className="text-sm text-slate-400">Interactive 3D visualization</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === '3d' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            3D View
          </button>
          <button
            onClick={() => setViewMode('exploded')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'exploded' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            Exploded
          </button>
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              showAlerts ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            Alerts ({criticalAlerts.length})
          </button>
        </div>
      </div>

      {/* Main 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [5, 3, 5], fov: 50 }}>
          <PerspectiveCamera makeDefault position={[5, 3, 5]} />
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            minDistance={3}
            maxDistance={15}
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <Environment preset="city" />
          
          <Suspense fallback={<Loader />}>
            <VehicleModel
              components={components}
              selectedComponent={selectedComponent}
              onComponentSelect={handleComponentSelect}
            />
          </Suspense>
          
          <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={10} blur={2} far={10} />
          <gridHelper args={[20, 20, '#334155', '#1e293b']} position={[0, 0, 0]} />
        </Canvas>

        {/* Overlay: Component Legend */}
        <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-white mb-2">Component Status</h3>
          <div className="space-y-1.5">
            {[
              { label: 'Healthy', color: '#10b981' },
              { label: 'Warning', color: '#f59e0b' },
              { label: 'Critical', color: '#ef4444' },
              { label: 'Replaced', color: '#3b82f6' },
              { label: 'Repairing', color: '#8b5cf6' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Overlay: Critical Alerts */}
        {showAlerts && criticalAlerts.length > 0 && (
          <div className="absolute top-4 right-4 w-72 space-y-2">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-red-500/90 backdrop-blur rounded-lg p-3 border border-red-400"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span className="font-medium text-white">{alert.componentName}</span>
                </div>
                <p className="text-xs text-red-100 mt-1">{alert.recommendedAction}</p>
                <p className="text-xs text-red-200 mt-1">
                  Predicted: {new Date(alert.predictedFailureDate).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Component Details Panel */}
      {selectedComponent && (
        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-white">{selectedComponent.name}</h3>
              <p className="text-sm text-slate-400">{selectedComponent.category}</p>
            </div>
            <button
              onClick={() => setSelectedComponent(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <span className="text-xs text-slate-500">Health Score</span>
              <p className="text-lg font-semibold text-white">{selectedComponent.healthScore}%</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Status</span>
              <p className="text-lg font-semibold" style={{
                color: getHealthColor(selectedComponent.healthScore, selectedComponent.status)
              }}>
                {selectedComponent.status}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Last Service</span>
              <p className="text-lg font-semibold text-white">
                {selectedComponent.lastServiceDate 
                  ? new Date(selectedComponent.lastServiceDate).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalTwin3D;
