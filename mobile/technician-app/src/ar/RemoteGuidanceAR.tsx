/**
 * MechMind OS - Remote Guidance AR
 * 
 * AR Remote Assistance for Technicians
 * - Video call with AR annotations
 * - 3D overlay on vehicle parts
 * - Drawing/markup on live video
 * - Session recording
 * 
 * Compatible with:
 * - iOS: ARKit
 * - Android: ARCore
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { 
  ViroARScene, 
  ViroARSceneNavigator,
  ViroText,
  ViroBox,
  ViroSphere,
  ViroMaterials,
  ViroAnimations,
  ViroNode,
  ViroARPlane,
} from '@viro-community/react-viro';
import { RTCPeerConnection, RTCSessionDescription, RTCView, mediaDevices } from 'react-native-webrtc';
import { io, Socket } from 'socket.io-client';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  PenTool,
  MessageCircle,
  Maximize2,
  RotateCcw
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
interface ArAnnotation {
  id: string;
  type: 'arrow' | 'circle' | 'text' | 'highlight';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
  text?: string;
  createdBy: string;
  createdAt: Date;
}

interface RemoteExpert {
  id: string;
  name: string;
  avatar?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

interface ArSession {
  id: string;
  workOrderId: string;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    vin: string;
  };
  technicianId: string;
  expertId?: string;
  startedAt: Date;
  status: 'CONNECTING' | 'ACTIVE' | 'ENDED';
}

interface RemoteGuidanceARProps {
  sessionId: string;
  workOrderId: string;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    vin: string;
  };
  serverUrl: string;
  authToken: string;
  onSessionEnd: () => void;
}

// AR Scene Component
const ArScene: React.FC<{
  annotations: ArAnnotation[];
  onAnnotationAdd: (annotation: ArAnnotation) => void;
  onPlaneDetected: (position: any) => void;
}> = ({ annotations, onAnnotationAdd, onPlaneDetected }) => {
  const [planePosition, setPlanePosition] = useState<any>(null);

  ViroMaterials.createMaterials({
    highlight: {
      diffuseColor: 'rgba(255, 200, 0, 0.5)',
    },
    arrow: {
      diffuseColor: '#ef4444',
    },
    annotation: {
      diffuseColor: '#3b82f6',
    },
  });

  ViroAnimations.registerAnimations({
    pulse: {
      properties: {
        scaleX: 1.0,
        scaleY: 1.0,
        scaleZ: 1.0,
      },
      duration: 500,
      easing: 'EaseInEaseOut',
    },
  });

  return (
    <ViroARScene>
      <ViroARPlane
        onAnchorFound={(anchor) => {
          setPlanePosition(anchor.position);
          onPlaneDetected(anchor.position);
        }}
        minHeight={0.1}
        minWidth={0.1}
        alignment={'Horizontal'}
      >
        {annotations.map((annotation) => (
          <ViroNode
            key={annotation.id}
            position={[annotation.position.x, annotation.position.y, annotation.position.z]}
            rotation={[annotation.rotation.x, annotation.rotation.y, annotation.rotation.z]}
          >
            {annotation.type === 'arrow' && (
              <ViroBox
                position={[0, 0.1, 0]}
                scale={[0.02, 0.2, 0.02]}
                materials={['arrow']}
                animation={{ name: 'pulse', run: true, loop: true }}
              />
            )}
            {annotation.type === 'circle' && (
              <ViroSphere
                position={[0, 0, 0]}
                scale={[0.1, 0.1, 0.1]}
                materials={['annotation']}
                animation={{ name: 'pulse', run: true, loop: true }}
              />
            )}
            {annotation.type === 'text' && annotation.text && (
              <ViroText
                text={annotation.text}
                scale={[0.1, 0.1, 0.1]}
                position={[0, 0.2, 0]}
                style={{
                  fontFamily: 'Arial',
                  fontSize: 12,
                  color: annotation.color,
                }}
              />
            )}
            {annotation.type === 'highlight' && (
              <ViroBox
                position={[0, 0, 0]}
                scale={[0.3, 0.02, 0.3]}
                materials={['highlight']}
                animation={{ name: 'pulse', run: true, loop: true }}
              />
            )}
          </ViroNode>
        ))}
      </ViroARPlane>
    </ViroARScene>
  );
};

// Main Component
export const RemoteGuidanceAR: React.FC<RemoteGuidanceARProps> = ({
  sessionId,
  workOrderId,
  vehicleInfo,
  serverUrl,
  authToken,
  onSessionEnd,
}) => {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isArEnabled, setIsArEnabled] = useState(true);
  const [expert, setExpert] = useState<RemoteExpert | null>(null);
  const [annotations, setAnnotations] = useState<ArAnnotation[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; timestamp: Date }[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [activeTool, setActiveTool] = useState<'arrow' | 'circle' | 'text' | 'highlight' | null>(null);
  const [sessionStatus, setSessionStatus] = useState<ArSession['status']>('CONNECTING');

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const cameraRef = useRef<Camera>(null);

  // Initialize WebRTC and Socket
  useEffect(() => {
    initializeSession();
    return () => {
      cleanupSession();
    };
  }, []);

  const initializeSession = async () => {
    try {
      // Request camera permissions
      const cameraPermission = await Camera.requestCameraPermission();
      const microphonePermission = await Camera.requestMicrophonePermission();

      if (cameraPermission !== 'authorized' || microphonePermission !== 'authorized') {
        Alert.alert('Permissions Required', 'Camera and microphone access is required for AR guidance.');
        return;
      }

      // Initialize Socket connection
      socketRef.current = io(`${serverUrl}/ar-guidance`, {
        auth: { token: authToken },
      });

      socketRef.current.on('connect', () => {
        console.log('AR Guidance socket connected');
        setIsConnected(true);
        setSessionStatus('ACTIVE');
      });

      socketRef.current.on('expert-joined', (data: RemoteExpert) => {
        setExpert(data);
        initializeWebRTC(data.id);
      });

      socketRef.current.on('annotation-received', (annotation: ArAnnotation) => {
        setAnnotations((prev) => [...prev, annotation]);
      });

      socketRef.current.on('chat-message', (message: { sender: string; text: string }) => {
        setChatMessages((prev) => [...prev, { ...message, timestamp: new Date() }]);
      });

      socketRef.current.on('session-ended', () => {
        endSession();
      });

      // Get local media stream
      const stream = await mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      });
      setLocalStream(stream);

      // Join session
      socketRef.current.emit('join-session', {
        sessionId,
        workOrderId,
        vehicleInfo,
      });

    } catch (error) {
      console.error('Failed to initialize AR session:', error);
      Alert.alert('Error', 'Failed to initialize AR session. Please try again.');
    }
  };

  const initializeWebRTC = async (expertId: string) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    peerConnectionRef.current = new RTCPeerConnection(configuration);

    // Add local stream
    localStream?.getTracks().forEach((track) => {
      peerConnectionRef.current?.addTrack(track, localStream as any);
    });

    // Handle remote stream
    peerConnectionRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0] as any);
    };

    // Handle ICE candidates
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          sessionId,
          candidate: event.candidate,
          to: expertId,
        });
      }
    };

    // Create offer
    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);

    socketRef.current?.emit('offer', {
      sessionId,
      offer,
      to: expertId,
    });
  };

  const cleanupSession = () => {
    localStream?.getTracks().forEach((track) => track.stop());
    peerConnectionRef.current?.close();
    socketRef.current?.disconnect();
  };

  const endSession = () => {
    socketRef.current?.emit('end-session', { sessionId });
    cleanupSession();
    onSessionEnd();
  };

  const toggleAudio = () => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !isAudioEnabled;
    });
    setIsAudioEnabled(!isAudioEnabled);
    socketRef.current?.emit('toggle-audio', { sessionId, enabled: !isAudioEnabled });
  };

  const toggleVideo = () => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !isVideoEnabled;
    });
    setIsVideoEnabled(!isVideoEnabled);
    socketRef.current?.emit('toggle-video', { sessionId, enabled: !isVideoEnabled });
  };

  const addAnnotation = useCallback((type: ArAnnotation['type'], position: any) => {
    const newAnnotation: ArAnnotation = {
      id: `ann-${Date.now()}`,
      type,
      position,
      rotation: { x: 0, y: 0, z: 0 },
      color: type === 'arrow' ? '#ef4444' : '#3b82f6',
      createdBy: 'technician',
      createdAt: new Date(),
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
    socketRef.current?.emit('add-annotation', {
      sessionId,
      annotation: newAnnotation,
    });
  }, [sessionId]);

  const clearAnnotations = () => {
    setAnnotations([]);
    socketRef.current?.emit('clear-annotations', { sessionId });
  };

  const sendChatMessage = (text: string) => {
    const message = { sender: 'technician', text, timestamp: new Date() };
    setChatMessages((prev) => [...prev, message]);
    socketRef.current?.emit('chat-message', { sessionId, message: { sender: 'technician', text } });
  };

  // Render
  return (
    <View style={styles.container}>
      {/* AR View */}
      {isArEnabled && (
        <ViroARSceneNavigator
          style={styles.arView}
          initialScene={{
            scene: () => (
              <ArScene
                annotations={annotations}
                onAnnotationAdd={addAnnotation}
                onPlaneDetected={(pos) => console.log('Plane detected:', pos)}
              />
            ),
          }}
        />
      )}

      {/* Camera Preview (when AR is disabled) */}
      {!isArEnabled && localStream && (
        <RTCView
          streamURL={(localStream as any).toURL()}
          style={styles.cameraView}
          objectFit="cover"
        />
      )}

      {/* Remote Expert Video */}
      {remoteStream && (
        <View style={styles.remoteVideoContainer}>
          <RTCView
            streamURL={(remoteStream as any).toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
          {expert && (
            <View style={styles.expertInfo}>
              <Text style={styles.expertName}>{expert.name}</Text>
              {!expert.isAudioEnabled && <MicOff size={16} color="#fff" />}
              {!expert.isVideoEnabled && <VideoOff size={16} color="#fff" />}
            </View>
          )}
        </View>
      )}

      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]} />
        <Text style={styles.statusText}>
          {sessionStatus === 'CONNECTING' ? 'Connecting...' : 
           sessionStatus === 'ACTIVE' ? 'Connected' : 'Ended'}
        </Text>
        {expert && (
          <Text style={styles.expertLabel}>Expert: {expert.name}</Text>
        )}
      </View>

      {/* Vehicle Info */}
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleText}>
          {vehicleInfo.make} {vehicleInfo.model} ({vehicleInfo.year})
        </Text>
        <Text style={styles.vinText}>VIN: {vehicleInfo.vin}</Text>
      </View>

      {/* Annotation Tools */}
      <View style={styles.toolsContainer}>
        <TouchableOpacity
          style={[styles.toolButton, activeTool === 'arrow' && styles.toolButtonActive]}
          onPress={() => setActiveTool(activeTool === 'arrow' ? null : 'arrow')}
        >
          <Text style={styles.toolIcon}>➡️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, activeTool === 'circle' && styles.toolButtonActive]}
          onPress={() => setActiveTool(activeTool === 'circle' ? null : 'circle')}
        >
          <Text style={styles.toolIcon}>⭕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, activeTool === 'text' && styles.toolButtonActive]}
          onPress={() => setActiveTool(activeTool === 'text' ? null : 'text')}
        >
          <Text style={styles.toolIcon}>T</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, activeTool === 'highlight' && styles.toolButtonActive]}
          onPress={() => setActiveTool(activeTool === 'highlight' ? null : 'highlight')}
        >
          <Text style={styles.toolIcon}>🔦</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton} onPress={clearAnnotations}>
          <RotateCcw size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Control Bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity
          style={[styles.controlButton, !isAudioEnabled && styles.controlButtonDisabled]}
          onPress={toggleAudio}
        >
          {isAudioEnabled ? <Mic size={24} color="#fff" /> : <MicOff size={24} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoEnabled && styles.controlButtonDisabled]}
          onPress={toggleVideo}
        >
          {isVideoEnabled ? <Video size={24} color="#fff" /> : <VideoOff size={24} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.arToggle, isArEnabled && styles.arToggleActive]}
          onPress={() => setIsArEnabled(!isArEnabled)}
        >
          <Maximize2 size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.chatButton]}
          onPress={() => setShowChat(!showChat)}
        >
          <MessageCircle size={24} color="#fff" />
          {chatMessages.length > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>{chatMessages.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={() => {
            Alert.alert(
              'End Session',
              'Are you sure you want to end the AR guidance session?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End', style: 'destructive', onPress: endSession },
              ]
            );
          }}
        >
          <PhoneOff size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  arView: {
    flex: 1,
  },
  cameraView: {
    flex: 1,
  },
  remoteVideoContainer: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  remoteVideo: {
    flex: 1,
  },
  expertInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  expertName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  expertLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginLeft: 12,
  },
  vehicleInfo: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  vehicleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  vinText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  toolsContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -100 }],
    gap: 8,
  },
  toolButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolButtonActive: {
    backgroundColor: '#3b82f6',
  },
  toolIcon: {
    fontSize: 20,
  },
  controlBar: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: '#ef4444',
  },
  arToggle: {
    backgroundColor: '#8b5cf6',
  },
  arToggleActive: {
    backgroundColor: '#10b981',
  },
  chatButton: {
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  endCallButton: {
    backgroundColor: '#ef4444',
  },
});

export default RemoteGuidanceAR;
