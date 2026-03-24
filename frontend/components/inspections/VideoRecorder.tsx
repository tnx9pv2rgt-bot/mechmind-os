'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Video,
  Camera,
  RotateCw,
  Flashlight,
  Mic,
  Play,
  Pause,
  Square,
  Circle,
  X,
  Check,
  AlertCircle,
  MousePointer2,
  RotateCcw,
  Upload,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  uploadVideo,
  formatDuration,
  addHotspot,
  type UploadProgress,
  type Hotspot,
  type VehicleSegmentType,
} from '@/lib/services/videoService';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface VideoRecorderProps {
  inspectionId: string;
  onUploadComplete: (videoUrl: string) => void;
}

type RecorderState =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'preview'
  | 'uploading'
  | 'complete'
  | 'error';

interface VehiclePosition {
  id: VehicleSegmentType;
  label: string;
  labelIt: string;
  startTime: number;
  endTime: number;
  icon: string;
  prompt: string;
}

// =============================================================================
// Constants
// =============================================================================

const VEHICLE_POSITIONS: VehiclePosition[] = [
  {
    id: 'front_bumper',
    label: 'Front Bumper',
    labelIt: 'Paraurti Anteriore',
    startTime: 0,
    endTime: 10,
    icon: '↑',
    prompt: 'Start at the front bumper. Hold steady.',
  },
  {
    id: 'front_left',
    label: 'Front Left',
    labelIt: 'Anteriore Sinistro',
    startTime: 10,
    endTime: 15,
    icon: '↖',
    prompt: 'Move to front left corner.',
  },
  {
    id: 'left_side',
    label: 'Left Side',
    labelIt: 'Lato Sinistro',
    startTime: 15,
    endTime: 25,
    icon: '←',
    prompt: 'Continue along left side.',
  },
  {
    id: 'rear_left',
    label: 'Rear Left',
    labelIt: 'Posteriore Sinistro',
    startTime: 25,
    endTime: 30,
    icon: '↙',
    prompt: 'Move to rear left corner.',
  },
  {
    id: 'rear',
    label: 'Rear',
    labelIt: 'Posteriore',
    startTime: 30,
    endTime: 40,
    icon: '↓',
    prompt: 'Show rear bumper and trunk.',
  },
  {
    id: 'rear_right',
    label: 'Rear Right',
    labelIt: 'Posteriore Destro',
    startTime: 40,
    endTime: 45,
    icon: '↘',
    prompt: 'Move to rear right corner.',
  },
  {
    id: 'right_side',
    label: 'Right Side',
    labelIt: 'Lato Destro',
    startTime: 45,
    endTime: 55,
    icon: '→',
    prompt: 'Continue along right side.',
  },
  {
    id: 'front_right',
    label: 'Front Right',
    labelIt: 'Anteriore Destro',
    startTime: 55,
    endTime: 60,
    icon: '↗',
    prompt: 'Finish at front right corner.',
  },
];

const MAX_RECORDING_DURATION = 60; // seconds
const RECORDING_INTERVAL = 100; // ms

// =============================================================================
// Helper Functions
// =============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getCurrentPosition(elapsedSeconds: number): VehiclePosition | null {
  return (
    VEHICLE_POSITIONS.find(
      pos => elapsedSeconds >= pos.startTime && elapsedSeconds < pos.endTime
    ) || null
  );
}

function getPositionProgress(elapsedSeconds: number, position: VehiclePosition): number {
  const positionDuration = position.endTime - position.startTime;
  const positionElapsed = elapsedSeconds - position.startTime;
  return Math.min(100, Math.max(0, (positionElapsed / positionDuration) * 100));
}

// =============================================================================
// Component
// =============================================================================

export function VideoRecorder({ inspectionId, onUploadComplete }: VideoRecorderProps) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [state, setState] = useState<RecorderState>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Video preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [newHotspotNote, setNewHotspotNote] = useState('');
  const [showHotspotDialog, setShowHotspotDialog] = useState(false);
  const [pendingHotspot, setPendingHotspot] = useState<{ x: number; y: number } | null>(null);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Voice Prompts
  // ---------------------------------------------------------------------------
  const speakPrompt = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Camera Functions
  // ---------------------------------------------------------------------------
  const startCamera = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Try to enable flashlight if supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as Record<string, unknown>;
      if (flashlightOn && capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: true }],
        } as unknown as MediaTrackConstraints);
      }

      setError(null);
    } catch (err) {
      setError('Impossibile accedere alla fotocamera. Controlla i permessi.');
      setState('error');
    }
  }, [facingMode, flashlightOn]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const toggleFacingMode = useCallback(() => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  const toggleFlashlight = useCallback(async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as Record<string, unknown>;

      if (capabilities.torch) {
        try {
          const newState = !flashlightOn;
          await track.applyConstraints({
            advanced: [{ torch: newState }],
          } as unknown as MediaTrackConstraints);
          setFlashlightOn(newState);
        } catch {
          // Flashlight not supported on this device
        }
      }
    }
  }, [flashlightOn]);

  // ---------------------------------------------------------------------------
  // Recording Functions
  // ---------------------------------------------------------------------------
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      setState('preview');

      // Load video for preview
      const url = URL.createObjectURL(blob);
      if (previewVideoRef.current) {
        previewVideoRef.current.src = url;
        previewVideoRef.current.onloadedmetadata = () => {
          setDuration(previewVideoRef.current?.duration || 0);
        };
      }
    };

    mediaRecorder.start(100); // Collect data every 100ms
    setState('recording');
    setRecordingTime(0);

    // Start timer
    timerIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 0.1;
        if (newTime >= MAX_RECORDING_DURATION) {
          stopRecording();
        }
        return newTime;
      });
    }, RECORDING_INTERVAL);

    // Initial voice prompt
    speakPrompt('Recording started. ' + VEHICLE_POSITIONS[0].prompt);
  }, [speakPrompt]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [state]);

  // ---------------------------------------------------------------------------
  // Preview Functions
  // ---------------------------------------------------------------------------
  const togglePlayPause = useCallback(() => {
    if (previewVideoRef.current) {
      if (isPlaying) {
        previewVideoRef.current.pause();
      } else {
        previewVideoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (previewVideoRef.current) {
      setCurrentTime(previewVideoRef.current.currentTime);
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (previewVideoRef.current) {
      previewVideoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleVideoClick = useCallback(
    (e: React.MouseEvent<HTMLVideoElement>) => {
      if (!annotationMode) return;

      const video = e.currentTarget;
      const rect = video.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setPendingHotspot({ x, y });
      setShowHotspotDialog(true);
    },
    [annotationMode]
  );

  const saveHotspot = useCallback(async () => {
    if (!pendingHotspot || !newHotspotNote.trim()) return;

    const hotspot = await addHotspot(
      'temp-video-id',
      currentTime,
      pendingHotspot.x,
      pendingHotspot.y,
      newHotspotNote,
      { type: 'general_note' }
    );

    setHotspots(prev => [...prev, hotspot]);
    setNewHotspotNote('');
    setPendingHotspot(null);
    setShowHotspotDialog(false);
  }, [pendingHotspot, newHotspotNote, currentTime]);

  // ---------------------------------------------------------------------------
  // Upload Functions
  // ---------------------------------------------------------------------------
  const handleUpload = useCallback(async () => {
    if (!recordedBlob) return;

    setState('uploading');

    try {
      const file = new File([recordedBlob], `inspection_${inspectionId}.webm`, {
        type: 'video/webm',
      });

      const metadata = await uploadVideo(file, inspectionId, progress => {
        setUploadProgress(progress);
      });

      setState('complete');
      onUploadComplete(metadata.videoUrl);
    } catch (err) {
      setError('Caricamento fallito. Riprova.');
      setState('error');
    }
  }, [recordedBlob, inspectionId, onUploadComplete]);

  const handleRetake = useCallback(() => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setCurrentTime(0);
    setDuration(0);
    setHotspots([]);
    setState('idle');
    startCamera();
  }, [startCamera]);

  const handleCancel = useCallback(() => {
    stopRecording();
    stopCamera();
    setRecordedBlob(null);
    setRecordingTime(0);
    setState('idle');
  }, [stopCamera]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (state === 'idle') {
      startCamera();
    }
    return () => {
      stopCamera();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [startCamera, stopCamera, state]);

  // Update camera when facing mode changes
  useEffect(() => {
    if (state === 'idle' || state === 'recording') {
      stopCamera();
      startCamera();
    }
  }, [facingMode, startCamera, stopCamera, state]);

  // Voice prompts during recording
  useEffect(() => {
    if (state !== 'recording') return;

    const position = getCurrentPosition(recordingTime);
    if (position) {
      const progress = getPositionProgress(recordingTime, position);

      // Announce position change or progress
      if (
        progress < 10 &&
        recordingTime >= position.startTime &&
        recordingTime < position.startTime + 1
      ) {
        speakPrompt(position.prompt);
      }
    }
  }, [recordingTime, state, speakPrompt]);

  // Update time during preview playback
  useEffect(() => {
    if (state === 'preview' && isPlaying) {
      const updateTime = () => {
        if (previewVideoRef.current) {
          setCurrentTime(previewVideoRef.current.currentTime);
        }
        animationFrameRef.current = requestAnimationFrame(updateTime);
      };
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state, isPlaying]);

  // ---------------------------------------------------------------------------
  // Computed Values
  // ---------------------------------------------------------------------------
  const currentPosition = useMemo(() => getCurrentPosition(recordingTime), [recordingTime]);

  const positionProgress = useMemo(() => {
    if (!currentPosition) return 0;
    return getPositionProgress(recordingTime, currentPosition);
  }, [recordingTime, currentPosition]);

  const totalProgress = useMemo(
    () => (recordingTime / MAX_RECORDING_DURATION) * 100,
    [recordingTime]
  );

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------
  const renderWalkaroundGuide = () => (
    <div className='absolute top-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-xl p-4'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <RotateCw className='h-4 w-4 text-blue-400' />
          <span className='text-white text-sm font-medium'>Guida 360° Walkaround</span>
        </div>
        <span className='text-white/80 text-xs'>{currentPosition?.labelIt || 'Completato'}</span>
      </div>

      {/* Position indicators */}
      <div className='flex gap-1 mb-3'>
        {VEHICLE_POSITIONS.map((pos, index) => {
          const isActive = currentPosition?.id === pos.id;
          const isCompleted = recordingTime >= pos.endTime;

          return (
            <div key={pos.id} className='flex-1 h-1.5 rounded-full overflow-hidden'>
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  isActive && 'bg-blue-500',
                  isCompleted && 'bg-green-500',
                  !isActive && !isCompleted && 'bg-white/20'
                )}
                style={{
                  width: isActive ? `${positionProgress}%` : '100%',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Current position info */}
      {currentPosition && (
        <div className='flex items-center gap-3 text-white'>
          <div className='w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center text-lg'>
            {currentPosition.icon}
          </div>
          <div className='flex-1'>
            <p className='text-sm font-medium'>{currentPosition.labelIt}</p>
            <p className='text-xs text-white/60'>{currentPosition.prompt}</p>
          </div>
          <div className='text-right'>
            <p className='text-lg font-mono font-bold'>
              {formatTime(MAX_RECORDING_DURATION - recordingTime)}
            </p>
            <p className='text-xs text-white/60'>rimanente</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderCameraControls = () => (
    <div className='absolute bottom-8 left-0 right-0 flex items-center justify-center gap-8'>
      {/* Flashlight */}
      <button
        onClick={toggleFlashlight}
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
          flashlightOn ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white hover:bg-white/30'
        )}
        disabled={state === 'recording'}
        aria-label={flashlightOn ? 'Disattiva torcia' : 'Attiva torcia'}
      >
        <Flashlight className='h-5 w-5' />
      </button>

      {/* Record/Stop Button */}
      <button
        onClick={state === 'recording' ? stopRecording : startRecording}
        className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95',
          state === 'recording'
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-red-500 hover:bg-red-600 border-4 border-white'
        )}
        aria-label={state === 'recording' ? 'Ferma registrazione' : 'Avvia registrazione'}
      >
        {state === 'recording' ? (
          <Square className='h-8 w-8 text-white fill-white' />
        ) : (
          <Circle className='h-10 w-10 text-white fill-white' />
        )}
      </button>

      {/* Camera Toggle */}
      <button
        onClick={toggleFacingMode}
        className='w-12 h-12 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors'
        disabled={state === 'recording'}
        aria-label='Cambia fotocamera'
      >
        <Camera className='h-5 w-5' />
      </button>
    </div>
  );

  const renderPreviewControls = () => (
    <div className='bg-gray-900 p-4 space-y-4'>
      {/* Playback controls */}
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          onClick={togglePlayPause}
          className='text-white hover:bg-white/10'
          aria-label={isPlaying ? 'Pausa' : 'Riproduci'}
        >
          {isPlaying ? <Pause className='h-6 w-6' /> : <Play className='h-6 w-6' />}
        </Button>

        <div className='flex-1'>
          <div className='flex items-center gap-2 text-white text-sm mb-1'>
            <span>{formatTime(currentTime)}</span>
            <span className='text-white/50'>/</span>
            <span className='text-white/50'>{formatTime(duration)}</span>
          </div>
          <input
            type='range'
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={e => handleSeek(parseFloat(e.target.value))}
            className='w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500'
          />
        </div>
      </div>

      {/* Annotation mode toggle */}
      <div className='flex items-center gap-2'>
        <Button
          variant={annotationMode ? 'default' : 'outline'}
          size='sm'
          onClick={() => setAnnotationMode(!annotationMode)}
          className={cn(
            'gap-2',
            annotationMode
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'border-white/20 text-white hover:bg-white/10'
          )}
        >
          <MousePointer2 className='h-4 w-4' />
          {annotationMode ? 'Esci Annotazione' : 'Aggiungi Hotspot'}
        </Button>

        {annotationMode && (
          <span className='text-xs text-white/60'>Clicca sul video per aggiungere note</span>
        )}
      </div>

      {/* Action buttons */}
      <div className='flex gap-3 pt-2'>
        <Button
          variant='outline'
          onClick={() => setShowCancelDialog(true)}
          className='flex-1 border-white/20 text-white hover:bg-white/10'
        >
          <X className='h-4 w-4 mr-2' />
          Annulla
        </Button>
        <Button
          variant='outline'
          onClick={handleRetake}
          className='flex-1 border-white/20 text-white hover:bg-white/10'
        >
          <RotateCcw className='h-4 w-4 mr-2' />
          Riprendi
        </Button>
        <Button onClick={handleUpload} className='flex-1 bg-blue-600 hover:bg-blue-700 text-white'>
          <Upload className='h-4 w-4 mr-2' />
          Salva Video
        </Button>
      </div>
    </div>
  );

  const renderUploadProgress = () => (
    <div className='absolute inset-0 bg-black/90 flex items-center justify-center z-50'>
      <div className='w-full max-w-md p-8'>
        <div className='text-center mb-8'>
          <div className='w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4'>
            <Upload className='h-8 w-8 text-blue-500 animate-bounce' />
          </div>
          <h3 className='text-xl font-semibold text-white mb-2'>Caricamento Video</h3>
          <p className='text-white/60'>{uploadProgress?.phase.replace(/_/g, ' ')}</p>
        </div>

        <Progress value={uploadProgress?.percentage || 0} className='h-3 mb-4' />

        <div className='flex justify-between text-sm text-white/60'>
          <span>{uploadProgress?.percentage || 0}%</span>
          <span>
            {uploadProgress ? formatDuration(uploadProgress.bytesProcessed) : '0 MB'}
            {' / '}
            {uploadProgress ? formatDuration(uploadProgress.totalBytes) : '0 MB'}
          </span>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------
  return (
    <div className='relative w-full h-full min-h-[600px] bg-black rounded-xl overflow-hidden'>
      {/* Error Display */}
      {error && (
        <div className='absolute top-4 left-4 right-4 bg-red-500/90 text-white p-4 rounded-lg flex items-center gap-3 z-50'>
          <AlertCircle className='h-5 w-5' />
          <p className='text-sm'>{error}</p>
          <button onClick={() => setError(null)} className='ml-auto'>
            <X className='h-4 w-4' />
          </button>
        </div>
      )}

      {/* Camera View / Recording */}
      {(state === 'idle' || state === 'recording') && (
        <>
          <video ref={videoRef} autoPlay playsInline muted className='w-full h-full object-cover' />

          {/* Recording indicator */}
          {state === 'recording' && (
            <div className='absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full'>
              <div className='w-3 h-3 rounded-full bg-red-500 animate-pulse' />
              <span className='text-white text-sm font-mono'>{formatTime(recordingTime)}</span>
            </div>
          )}

          {/* Walkaround Guide */}
          {renderWalkaroundGuide()}

          {/* Total progress bar */}
          <div className='absolute bottom-0 left-0 right-0 h-1 bg-white/10'>
            <div
              className='h-full bg-blue-500 transition-all duration-100'
              style={{ width: `${totalProgress}%` }}
            />
          </div>

          {/* Camera controls */}
          {renderCameraControls()}
        </>
      )}

      {/* Preview Mode */}
      {state === 'preview' && recordedBlob && (
        <div className='flex flex-col h-full'>
          {/* Video container with hotspots */}
          <div className='relative flex-1 bg-black'>
            <video
              ref={previewVideoRef}
              className={cn('w-full h-full object-contain', annotationMode && 'cursor-crosshair')}
              onClick={handleVideoClick}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Hotspot overlays */}
            {hotspots.map(hotspot => (
              <div
                key={hotspot.id}
                className='absolute transform -translate-x-1/2 -translate-y-1/2'
                style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              >
                <div className='w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-lg flex items-center justify-center'>
                  <span className='text-white text-xs font-bold'>
                    {hotspots.indexOf(hotspot) + 1}
                  </span>
                </div>
                <div className='absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap'>
                  <span className='px-2 py-1 bg-black/80 text-white text-xs rounded'>
                    {formatTime(hotspot.timestamp)} - {hotspot.note}
                  </span>
                </div>
              </div>
            ))}

            {/* Annotation instruction overlay */}
            {annotationMode && (
              <div className='absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500/90 text-white px-4 py-2 rounded-full text-sm'>
                Clicca sul video per aggiungere un hotspot
              </div>
            )}
          </div>

          {/* Preview controls */}
          {renderPreviewControls()}
        </div>
      )}

      {/* Upload Progress */}
      {state === 'uploading' && renderUploadProgress()}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className='bg-gray-900 border-gray-700 text-white'>
          <DialogHeader>
            <DialogTitle>Eliminare il Video?</DialogTitle>
            <DialogDescription className='text-gray-400'>
              Sei sicuro di voler annullare? Il video registrato andrà perso.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-3'>
            <Button
              variant='outline'
              onClick={() => setShowCancelDialog(false)}
              className='border-gray-600 text-white hover:bg-gray-800'
            >
              Mantieni Video
            </Button>
            <Button
              variant='destructive'
              onClick={() => {
                setShowCancelDialog(false);
                handleCancel();
              }}
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hotspot Annotation Dialog */}
      <Dialog open={showHotspotDialog} onOpenChange={setShowHotspotDialog}>
        <DialogContent className='bg-gray-900 border-gray-700 text-white'>
          <DialogHeader>
            <DialogTitle>Aggiungi Hotspot</DialogTitle>
            <DialogDescription className='text-gray-400'>
              Aggiungi una nota a {formatTime(currentTime)}
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={newHotspotNote}
            onChange={e => setNewHotspotNote(e.target.value)}
            placeholder='Inserisci la tua nota...'
            className='w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none'
            autoFocus
          />
          <DialogFooter className='gap-3'>
            <Button
              variant='outline'
              onClick={() => {
                setShowHotspotDialog(false);
                setNewHotspotNote('');
                setPendingHotspot(null);
              }}
              className='border-gray-600 text-white hover:bg-gray-800'
            >
              Annulla
            </Button>
            <Button
              onClick={saveHotspot}
              disabled={!newHotspotNote.trim()}
              className='bg-blue-600 hover:bg-blue-700'
            >
              <Check className='h-4 w-4 mr-2' />
              Aggiungi Hotspot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VideoRecorder;
