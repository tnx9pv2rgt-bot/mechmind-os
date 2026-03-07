# MechMind OS - IoT/OBD Module Implementation

## Overview

The IoT/OBD Module provides comprehensive vehicle diagnostics, shop floor tracking, and license plate recognition capabilities for the MechMind OS automotive workshop management system.

## Features Implemented

### 1. Advanced OBD Data Collection (`/backend/src/iot/obd/`)

#### OBD Streaming Service
- **Real-time WebSocket streaming** for live vehicle data
- **Sensor data collection**: RPM, speed, coolant temperature, throttle position, engine load
- **Freeze frame capture** when DTCs are detected
- **Mode $06 test results** for OBD-II test monitoring
- **Mode $08 EVAP tests** for emissions testing
- **Time-series data storage** with Redis caching and automatic retention policies

#### WebSocket Gateway
- Socket.io-based real-time communication
- Support for multiple concurrent streaming sessions
- Automatic reconnection and error handling
- Device subscription management

#### REST API Endpoints
```
POST   /v1/obd-streaming/streams          - Start streaming session
DELETE /v1/obd-streaming/streams/:id      - Stop streaming session
GET    /v1/obd-streaming/streams          - List active streams
POST   /v1/obd-streaming/freeze-frame     - Capture freeze frame
GET    /v1/obd-streaming/devices/:id/mode06 - Get Mode $06 results
POST   /v1/obd-streaming/evap-test        - Execute EVAP test
GET    /v1/obd-streaming/sensor-history   - Get sensor history
```

### 2. Digital Vehicle Twin (`/backend/src/iot/vehicle-twin/`)

#### Vehicle Twin Service
- **3D visualization** of vehicle components
- **Component health tracking** with real-time scoring
- **Historical repair visualization** with component history
- **Damage tracking** with 3D positioning
- **Predictive maintenance alerts** based on wear patterns

#### Component Categories
- ENGINE
- TRANSMISSION
- BRAKES
- SUSPENSION
- ELECTRICAL
- BODY
- HVAC
- FUEL
- EXHAUST

#### Health Status Levels
- HEALTHY (green)
- WARNING (amber)
- CRITICAL (red)
- REPLACED (blue)
- REPAIRING (purple)

#### REST API Endpoints
```
GET    /v1/vehicle-twin/:vehicleId              - Get twin state
PATCH  /v1/vehicle-twin/:vehicleId/components/:id - Update component
POST   /v1/vehicle-twin/:vehicleId/history      - Record history event
POST   /v1/vehicle-twin/:vehicleId/damage       - Record damage
GET    /v1/vehicle-twin/:vehicleId/alerts       - Get predictive alerts
GET    /v1/vehicle-twin/:vehicleId/health-trend - Get health trends
```

### 3. Real-Time Shop Floor Tracking (`/backend/src/iot/shop-floor/`)

#### Shop Floor Service
- **IoT sensor integration**: RFID, Bluetooth beacons, ultrasonic, PIR, cameras, pressure
- **Real-time bay status** tracking
- **Automatic job status updates** based on sensor input
- **Technician location tracking** via Bluetooth beacons
- **Parking management** for customer vehicles

#### Sensor Types Supported
- RFID - Vehicle identification
- BLUETOOTH_BEACON - Technician tracking
- ULTRASONIC - Bay occupancy detection
- PIR - Motion detection
- CAMERA - License plate recognition
- PRESSURE - Lift weight detection
- MAGNETIC - Bay entry/exit

#### REST API Endpoints
```
POST   /v1/shop-floor                          - Initialize shop floor
GET    /v1/shop-floor/bays                     - List all bays
POST   /v1/shop-floor/bays/:id/sensors         - Add sensor
POST   /v1/shop-floor/sensor-readings          - Process sensor data
POST   /v1/shop-floor/bays/:id/assign          - Assign vehicle
POST   /v1/shop-floor/bays/:id/release         - Release bay
POST   /v1/shop-floor/technicians/:id/location - Update technician location
GET    /v1/shop-floor/technicians/active       - Get active technicians
GET    /v1/shop-floor/analytics                - Get analytics
```

### 4. License Plate Recognition (`/backend/src/iot/license-plate/`)

#### LPR Service
- **Multi-provider OCR support**:
  - Google Vision API
  - Azure Computer Vision
  - AWS Rekognition
  - OpenALPR (open source)
  - Custom ML models
- **Entry/exit logging** with automatic vehicle lookup
- **Parking session management**
- **Statistics and analytics**

#### REST API Endpoints
```
POST   /v1/lpr/detect            - Detect plate from image
POST   /v1/lpr/entry-exit        - Record entry/exit
POST   /v1/lpr/cameras           - Register camera
GET    /v1/lpr/cameras           - List cameras
GET    /v1/lpr/lookup/:plate     - Lookup vehicle
GET    /v1/lpr/sessions/active   - Get active parking sessions
GET    /v1/lpr/stats             - Get LPR statistics
```

## Frontend Components

### OBD Live Dashboard (`/app/components/iot/obd/ObdLiveDashboard.tsx`)
- Real-time sensor data visualization
- Circular and linear gauges for key metrics
- Alert notifications for critical values
- Session statistics display
- WebSocket integration for live updates

### Digital Twin 3D Viewer (`/app/components/iot/vehicle-twin/DigitalTwin3D.tsx`)
- Three.js/React Three Fiber 3D visualization
- Interactive component selection
- Color-coded health indicators
- Predictive alert overlays
- Multiple view modes (3D, exploded, X-ray)

### Shop Floor Dashboard (`/app/components/iot/shop-floor/RealTimeTracking.tsx`)
- Real-time bay status grid
- Technician location badges
- Activity timeline
- Statistics cards
- Bay detail modals

## Mobile AR Component

### Remote Guidance AR (`/mobile/technician-app/src/ar/RemoteGuidanceAR.tsx`)
- ARKit/ARCore integration via Viro React
- WebRTC video calling
- Socket.io real-time sync
- AR annotations (arrows, circles, text, highlights)
- Chat messaging
- Session recording capability

## Database Schema

### New Tables Created

1. **ObdFreezeFrame** - DTC freeze frame data
2. **ObdMode06Result** - OBD Mode $06 test results
3. **ObdEvapTest** - EVAP test records
4. **ObdStreamingSession** - Active streaming sessions
5. **VehicleTwinComponent** - Vehicle component states
6. **ComponentHistory** - Component event history
7. **VehicleDamage** - Damage records with 3D positioning
8. **VehicleTwinConfig** - 3D visualization configuration
9. **VehicleHealthHistory** - Health score trends
10. **ShopFloor** - Shop floor definitions
11. **ServiceBay** - Service bay status
12. **BaySensor** - IoT sensor configuration
13. **SensorReading** - Sensor data logs
14. **ShopFloorEvent** - Shop floor events
15. **ParkingSpot** - Parking spot management
16. **LprCamera** - LPR camera configuration
17. **LicensePlateDetection** - OCR detection results
18. **VehicleEntryExit** - Entry/exit logs
19. **ParkingSession** - Parking session tracking

## Hardware Integration

### OBD-II Adapters Supported
- ELM327 (USB, Bluetooth, WiFi)
- STN1110 / STN2120
- OBDLink MX / LX
- Custom adapters

### Shop Floor Sensors
- **RFID Readers**: Vehicle entry/exit detection
- **Bluetooth Beacons**: Technician tracking (iBeacon, Eddystone)
- **Ultrasonic Sensors**: Bay occupancy (HC-SR04, etc.)
- **PIR Sensors**: Motion detection
- **IP Cameras**: License plate capture
- **Pressure Sensors**: Lift load detection

### LPR Cameras
- IP cameras with RTSP streams
- Support for ONVIF protocol
- Minimum 1080p resolution recommended
- Night vision capability

## Environment Variables

```bash
# OBD Configuration
OBD_STREAMING_MAX_SESSIONS=100
OBD_SENSOR_BUFFER_SIZE=100

# Redis Configuration
REDIS_URL=redis://localhost:6379

# LPR Provider API Keys
GOOGLE_VISION_API_KEY=
AZURE_COMPUTER_VISION_KEY=
AZURE_COMPUTER_VISION_ENDPOINT=
AWS_REKOGNITION_ACCESS_KEY=
AWS_REKOGNITION_SECRET_KEY=
OPENALPR_API_KEY=

# WebRTC Configuration
WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302
WEBRTC_TURN_SERVER=
WEBRTC_TURN_USERNAME=
WEBRTC_TURN_PASSWORD=
```

## Installation

### Backend Dependencies
```bash
cd mechmind-os/backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install ioredis @nestjs-modules/ioredis
npm install @react-three/fiber @react-three/drei three
npm install @google-cloud/vision
npm install aws-sdk
```

### Frontend Dependencies
```bash
cd mechmind-os/app
npm install @react-three/fiber @react-three/drei three
npm install socket.io-client
npm install lucide-react
```

### Mobile Dependencies
```bash
cd mechmind-os/mobile/technician-app
npm install @viro-community/react-viro
npm install react-native-vision-camera
npm install react-native-webrtc
npm install socket.io-client
```

## Usage Examples

### Start OBD Streaming
```typescript
import { ObdWebSocketClient } from '@/lib/iot/obd-websocket';

const client = new ObdWebSocketClient('wss://api.mechmind.io');
client.connect(authToken);

await client.startStreaming({
  deviceId: 'device-123',
  adapterType: 'ELM327_BLUETOOTH',
  sensors: ['rpm', 'speed', 'coolantTemp'],
  interval: 500,
});

client.onSensorData((data) => {
  console.log('RPM:', data.rpm);
});
```

### Access Vehicle Twin
```typescript
const twin = await fetch(`/v1/vehicle-twin/${vehicleId}`).then(r => r.json());
console.log('Overall Health:', twin.overallHealth);
console.log('Active Alerts:', twin.activeAlerts);
```

### Process Sensor Reading
```typescript
await fetch('/v1/shop-floor/sensor-readings', {
  method: 'POST',
  body: JSON.stringify({
    sensorId: 'sensor-001',
    bayId: 'bay-001',
    type: 'ULTRASONIC',
    data: { presence: true, distance: 45 },
    timestamp: new Date(),
  }),
});
```

### Detect License Plate
```typescript
const formData = new FormData();
formData.append('image', imageFile);

const result = await fetch('/v1/lpr/detect', {
  method: 'POST',
  body: formData,
}).then(r => r.json());

console.log('Detected Plate:', result.detectedText);
```

## Troubleshooting

### OBD Connection Issues
1. Verify adapter compatibility
2. Check Bluetooth/WiFi connection
3. Ensure vehicle ignition is on
4. Try different OBD protocols

### Sensor Data Not Received
1. Check sensor battery level
2. Verify sensor calibration
3. Check network connectivity
4. Review sensor configuration

### LPR Low Accuracy
1. Adjust camera positioning
2. Improve lighting conditions
3. Increase image resolution
4. Try different OCR provider

## Performance Considerations

- **OBD Streaming**: Maximum 100 concurrent sessions per server
- **Sensor Data**: Batch insert every 100 readings or 5 seconds
- **AR Sessions**: Maximum 4 concurrent video streams
- **LPR Processing**: Images resized to 1920x1080 before OCR
- **3D Models**: Use compressed GLB format, max 10MB per model

## Security

- All WebSocket connections require JWT authentication
- Sensor data is validated before processing
- LPR images are stored encrypted in S3
- AR sessions are end-to-end encrypted via WebRTC
- Rate limiting on all sensor endpoints

## Future Enhancements

1. AI-powered predictive maintenance using machine learning
2. Integration with OEM diagnostic tools
3. Voice-controlled AR annotations
4. Automated parts ordering based on diagnostics
5. Digital twin synchronization with real vehicle telemetry

## Support

For issues and feature requests, please contact:
- Email: support@mechmind.io
- Documentation: https://docs.mechmind.io
- API Reference: https://api.mechmind.io/docs
