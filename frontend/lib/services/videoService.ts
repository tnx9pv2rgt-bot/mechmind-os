/**
 * Video Service - MechMind OS Frontend
 * 
 * Video inspection service for 360° vehicle walkaround.
 * Handles video compression, thumbnail generation, HLS streaming,
 * hotspot annotations, and frame extraction using ffmpeg.wasm.
 * 
 * @module lib/services/videoService
 * @version 1.0.0
 * @requires ffmpeg.wasm
 */

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Video metadata returned after upload/processing
 */
export interface VideoMetadata {
  /** Unique video identifier */
  id: string
  /** Original file name */
  originalName: string
  /** Video URL after upload */
  videoUrl: string
  /** Thumbnail image URL */
  thumbnailUrl: string
  /** Video duration in seconds */
  duration: number
  /** Video width in pixels */
  width: number
  /** Video height in pixels */
  height: number
  /** File size in bytes */
  size: number
  /** MIME type */
  mimeType: string
  /** Associated inspection ID */
  inspectionId: string
  /** Upload timestamp */
  uploadedAt: string
  /** Processing status */
  status: 'processing' | 'ready' | 'error'
}

/**
 * Vehicle video segment for 360° walkaround
 */
export interface VideoSegment {
  /** Segment identifier */
  id: string
  /** Segment name/key (e.g., 'front_bumper') */
  name: VehicleSegmentType
  /** Start time in seconds */
  startTime: number
  /** End time in seconds */
  endTime: number
  /** Segment duration */
  duration: number
  /** Thumbnail URL for this segment */
  thumbnailUrl?: string
  /** Description of the vehicle area */
  description: string
  /** Associated hotspots in this segment */
  hotspots: Hotspot[]
}

/**
 * Types of vehicle segments for 360° walkaround
 */
export type VehicleSegmentType =
  | 'front_bumper'
  | 'front_left'
  | 'left_side'
  | 'rear_left'
  | 'rear'
  | 'rear_right'
  | 'right_side'
  | 'front_right'
  | 'roof'
  | 'interior'

/**
 * Hotspot annotation on a video
 */
export interface Hotspot {
  /** Unique hotspot identifier */
  id: string
  /** Associated video ID */
  videoId: string
  /** Timestamp in seconds where hotspot appears */
  timestamp: number
  /** X coordinate (0-100 percentage) */
  x: number
  /** Y coordinate (0-100 percentage) */
  y: number
  /** Annotation note/text */
  note: string
  /** Hotspot type/category */
  type: HotspotType
  /** Severity level for damage/issues */
  severity?: 'low' | 'medium' | 'high' | 'critical'
  /** Created timestamp */
  createdAt: string
  /** Last updated timestamp */
  updatedAt: string
}

/**
 * Hotspot type classification
 */
export type HotspotType =
  | 'damage'
  | 'scratch'
  | 'dent'
  | 'rust'
  | 'general_note'
  | 'mechanical_issue'
  | 'tire_wear'
  | 'glass_damage'
  | 'interior_issue'

/**
 * HLS Playlist information
 */
export interface HLSPlaylist {
  /** Playlist URL */
  playlistUrl: string
  /** Video segments for adaptive streaming */
  segments: HLSSegment[]
  /** Available quality levels */
  qualities: HLSQuality[]
}

/**
 * HLS segment information
 */
export interface HLSSegment {
  /** Segment URL */
  url: string
  /** Segment duration in seconds */
  duration: number
  /** Segment sequence number */
  sequence: number
  /** Byte range for partial content */
  byteRange?: string
}

/**
 * HLS quality level
 */
export interface HLSQuality {
  /** Quality label (e.g., '1080p') */
  label: string
  /** Resolution width */
  width: number
  /** Resolution height */
  height: number
  /** Bandwidth in bits per second */
  bandwidth: number
  /** Playlist URL for this quality */
  playlistUrl: string
}

/**
 * Video compression options
 */
export interface CompressionOptions {
  /** Target resolution (default: preserve original) */
  resolution?: '480p' | '720p' | '1080p' | '1440p' | 'original'
  /** Target bitrate in kbps */
  bitrate?: number
  /** CRF quality (0-51, lower is better, default: 23) */
  crf?: number
  /** Preset for encoding speed (default: 'medium') */
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow'
  /** Target format */
  format?: 'mp4' | 'webm' | 'mov'
  /** Maximum file size in MB */
  maxFileSize?: number
}

/**
 * Upload progress callback
 */
export type UploadProgressCallback = (progress: UploadProgress) => void

/**
 * Upload progress information
 */
export interface UploadProgress {
  /** Current phase */
  phase: 'compressing' | 'generating_thumbnail' | 'uploading' | 'processing' | 'complete'
  /** Progress percentage (0-100) */
  percentage: number
  /** Bytes processed */
  bytesProcessed: number
  /** Total bytes */
  totalBytes: number
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number
}

// =============================================================================
// Configuration
// =============================================================================

/** Default compression settings for vehicle inspection videos */
const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  resolution: '1080p',
  bitrate: 5000,
  crf: 23,
  preset: 'medium',
  format: 'mp4',
}

/** Vehicle segment definitions for 360° walkaround (60 second standard) */
const VEHICLE_SEGMENTS: Omit<VideoSegment, 'id' | 'hotspots' | 'thumbnailUrl'>[] = [
  { name: 'front_bumper', startTime: 0, endTime: 10, duration: 10, description: 'Front bumper and grille area' },
  { name: 'front_left', startTime: 10, endTime: 15, duration: 5, description: 'Front left corner and headlight' },
  { name: 'left_side', startTime: 15, endTime: 25, duration: 10, description: 'Left side doors and panels' },
  { name: 'rear_left', startTime: 25, endTime: 30, duration: 5, description: 'Rear left corner and taillight' },
  { name: 'rear', startTime: 30, endTime: 40, duration: 10, description: 'Rear bumper and trunk area' },
  { name: 'rear_right', startTime: 40, endTime: 45, duration: 5, description: 'Rear right corner and taillight' },
  { name: 'right_side', startTime: 45, endTime: 55, duration: 10, description: 'Right side doors and panels' },
  { name: 'front_right', startTime: 55, endTime: 60, duration: 5, description: 'Front right corner and headlight' },
]

/** S3/Storage configuration */
const STORAGE_CONFIG = {
  bucketName: process.env.NEXT_PUBLIC_S3_BUCKET || 'mechmind-videos',
  region: process.env.NEXT_PUBLIC_S3_REGION || 'eu-west-1',
  baseUrl: process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.mechmind.io',
}

// =============================================================================
// FFmpeg Instance Management
// =============================================================================

/** Singleton FFmpeg instance */
let ffmpegInstance: FFmpeg | null = null
let ffmpegLoading: Promise<FFmpeg> | null = null

/**
 * Initialize and get FFmpeg instance
 * Uses singleton pattern to avoid loading multiple times
 */
export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance
  }

  if (ffmpegLoading) {
    return ffmpegLoading
  }

  ffmpegLoading = initFFmpeg()
  return ffmpegLoading
}

/**
 * Initialize FFmpeg.wasm
 */
async function initFFmpeg(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg()
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  
  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
  })

  ffmpegInstance = ffmpeg
  return ffmpeg
}

/**
 * Terminate FFmpeg instance to free memory
 */
export function terminateFFmpeg(): void {
  if (ffmpegInstance) {
    ffmpegInstance.terminate()
    ffmpegInstance = null
    ffmpegLoading = null
  }
}

// =============================================================================
// Video Compression
// =============================================================================

/**
 * Compress video using ffmpeg.wasm
 * 
 * @param file - Video file to compress
 * @param options - Compression options
 * @param onProgress - Progress callback
 * @returns Compressed video as File
 * 
 * @example
 * ```typescript
 * const compressed = await compressVideo(file, {
 *   resolution: '1080p',
 *   bitrate: 5000,
 *   crf: 23,
 * })
 * ```
 */
export async function compressVideo(
  file: File,
  options: CompressionOptions = {},
  onProgress?: UploadProgressCallback
): Promise<File> {
  const ffmpeg = await getFFmpeg()
  const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options }
  
  const inputName = 'input' + getFileExtension(file.name)
  const outputName = 'output.' + opts.format

  // Write input file to FFmpeg FS
  await ffmpeg.writeFile(inputName, await fetchFile(file))

  // Build FFmpeg command
  const args = buildCompressionArgs(inputName, outputName, opts)

  // Set up progress tracking
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress({
        phase: 'compressing',
        percentage: Math.round(progress * 100),
        bytesProcessed: Math.round(progress * file.size),
        totalBytes: file.size,
      })
    })
  }

  // Execute compression
  await ffmpeg.exec(args)

  // Read compressed file
  const data = await ffmpeg.readFile(outputName)
  const compressedBlob = new Blob([data as BlobPart], { type: `video/${opts.format}` })
  
  // Clean up
  await ffmpeg.deleteFile(inputName)
  await ffmpeg.deleteFile(outputName)

  return new File([compressedBlob], `compressed_${file.name}`, {
    type: `video/${opts.format}`,
  })
}

/**
 * Build FFmpeg compression arguments
 */
function buildCompressionArgs(
  inputName: string,
  outputName: string,
  options: CompressionOptions
): string[] {
  const args: string[] = ['-i', inputName]

  // Video codec (H.264 for compatibility)
  args.push('-c:v', 'libx264')

  // Resolution
  if (options.resolution && options.resolution !== 'original') {
    const scaleMap: Record<string, string> = {
      '480p': '854:480',
      '720p': '1280:720',
      '1080p': '1920:1080',
      '1440p': '2560:1440',
    }
    args.push('-vf', `scale=${scaleMap[options.resolution]}`)
  }

  // Bitrate
  if (options.bitrate) {
    args.push('-b:v', `${options.bitrate}k`)
  }

  // CRF (Constant Rate Factor)
  if (options.crf !== undefined) {
    args.push('-crf', String(options.crf))
  }

  // Preset
  if (options.preset) {
    args.push('-preset', options.preset)
  }

  // Audio codec (copy or compress)
  args.push('-c:a', 'aac', '-b:a', '128k')

  // Fast start for web streaming
  args.push('-movflags', '+faststart')

  // Maximum file size (2-pass encoding if needed)
  if (options.maxFileSize) {
    args.push('-fs', String(options.maxFileSize * 1024 * 1024))
  }

  // Output
  args.push('-y', outputName)

  return args
}

// =============================================================================
// Video Upload
// =============================================================================

/**
 * Upload video with compression, thumbnail generation, and S3 storage
 * 
 * @param file - Video file to upload
 * @param inspectionId - Associated inspection ID
 * @param onProgress - Progress callback
 * @returns Video metadata including URLs and duration
 * 
 * @example
 * ```typescript
 * const metadata = await uploadVideo(videoFile, 'inspection-123', (progress) => {
 *   console.log(`${progress.phase}: ${progress.percentage}%`)
 * })
 * ```
 */
export async function uploadVideo(
  file: File,
  inspectionId: string,
  onProgress?: UploadProgressCallback
): Promise<VideoMetadata> {
  // Phase 1: Compress video
  onProgress?.({
    phase: 'compressing',
    percentage: 0,
    bytesProcessed: 0,
    totalBytes: file.size,
  })

  const compressedFile = await compressVideo(file, DEFAULT_COMPRESSION_OPTIONS, onProgress)

  // Phase 2: Generate thumbnail
  onProgress?.({
    phase: 'generating_thumbnail',
    percentage: 0,
    bytesProcessed: 0,
    totalBytes: compressedFile.size,
  })

  const thumbnailBlob = await generateThumbnailFromFile(compressedFile, 0)
  const duration = await getVideoDuration(compressedFile)
  const dimensions = await getVideoDimensions(compressedFile)

  // Phase 3: Upload to storage
  onProgress?.({
    phase: 'uploading',
    percentage: 0,
    bytesProcessed: 0,
    totalBytes: compressedFile.size + thumbnailBlob.size,
  })

  const videoId = generateVideoId()
  const timestamp = Date.now()

  // Upload video
  const videoKey = `inspections/${inspectionId}/videos/${videoId}_${timestamp}.mp4`
  const videoUrl = await uploadToStorage(compressedFile, videoKey, (progress) => {
    onProgress?.({
      phase: 'uploading',
      percentage: Math.round(progress * 50),
      bytesProcessed: Math.round(progress * compressedFile.size),
      totalBytes: compressedFile.size + thumbnailBlob.size,
    })
  })

  // Upload thumbnail
  const thumbnailKey = `inspections/${inspectionId}/thumbnails/${videoId}_${timestamp}.jpg`
  const thumbnailUrl = await uploadToStorage(thumbnailBlob, thumbnailKey, (progress) => {
    onProgress?.({
      phase: 'uploading',
      percentage: 50 + Math.round(progress * 50),
      bytesProcessed: Math.round(progress * thumbnailBlob.size),
      totalBytes: compressedFile.size + thumbnailBlob.size,
    })
  })

  // Phase 4: Processing complete
  onProgress?.({
    phase: 'complete',
    percentage: 100,
    bytesProcessed: compressedFile.size + thumbnailBlob.size,
    totalBytes: compressedFile.size + thumbnailBlob.size,
  })

  return {
    id: videoId,
    originalName: file.name,
    videoUrl,
    thumbnailUrl,
    duration,
    width: dimensions.width,
    height: dimensions.height,
    size: compressedFile.size,
    mimeType: compressedFile.type,
    inspectionId,
    uploadedAt: new Date().toISOString(),
    status: 'ready',
  }
}

/**
 * Upload file to S3/storage
 */
async function uploadToStorage(
  file: File | Blob,
  key: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Get presigned URL from backend
  const presignedUrl = await getPresignedUploadUrl(key, file.type)

  // Upload with progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(`${STORAGE_CONFIG.baseUrl}/${key}`)
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'))
    })

    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

/**
 * Get presigned upload URL from backend
 */
async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const response = await fetch('/api/videos/presigned-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType }),
  })

  if (!response.ok) {
    throw new Error('Failed to get presigned URL')
  }

  const data = await response.json()
  return data.url
}

// =============================================================================
// Thumbnail Generation
// =============================================================================

/**
 * Generate thumbnail from video file at specified time
 * 
 * @param file - Video file
 * @param timestamp - Timestamp in seconds (default: 0)
 * @returns Thumbnail as JPEG Blob
 */
export async function generateThumbnailFromFile(
  file: File,
  timestamp: number = 0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'
    video.src = URL.createObjectURL(file)

    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(timestamp, video.duration)
    })

    video.addEventListener('seeked', () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src)
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create thumbnail blob'))
          }
        },
        'image/jpeg',
        0.9
      )
    })

    video.addEventListener('error', () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video for thumbnail'))
    })
  })
}

/**
 * Extract frame at timestamp using ffmpeg.wasm (higher quality)
 * 
 * @param videoUrl - Video URL or File
 * @param timestamp - Timestamp in seconds
 * @returns Frame as Blob
 * 
 * @example
 * ```typescript
 * const frame = await extractFrame('https://cdn.mechmind.io/video.mp4', 5.5)
 * ```
 */
export async function extractFrame(
  videoUrl: string | File,
  timestamp: number
): Promise<Blob> {
  const ffmpeg = await getFFmpeg()
  
  const inputName = 'input.mp4'
  const outputName = `frame_${timestamp}.jpg`

  // Load video
  if (videoUrl instanceof File) {
    await ffmpeg.writeFile(inputName, await fetchFile(videoUrl))
  } else {
    const response = await fetch(videoUrl)
    const buffer = await response.arrayBuffer()
    await ffmpeg.writeFile(inputName, new Uint8Array(buffer))
  }

  // Extract frame at specific timestamp
  await ffmpeg.exec([
    '-ss', String(timestamp),
    '-i', inputName,
    '-vframes', '1',
    '-q:v', '2',
    '-f', 'image2',
    outputName,
  ])

  // Read output
  const data = await ffmpeg.readFile(outputName)
  const blob = new Blob([data as BlobPart], { type: 'image/jpeg' })

  // Clean up
  await ffmpeg.deleteFile(inputName)
  await ffmpeg.deleteFile(outputName)

  return blob
}

// =============================================================================
// HLS Playlist Generation
// =============================================================================

/**
 * Generate HLS streaming playlist for adaptive video playback
 * 
 * @param videoUrl - Source video URL
 * @returns HLS playlist information
 * 
 * @example
 * ```typescript
 * const hls = await generateHLSPlaylist('https://cdn.mechmind.io/video.mp4')
 * // Use hls.playlistUrl with video player
 * ```
 */
export async function generateHLSPlaylist(videoUrl: string): Promise<HLSPlaylist> {
  const ffmpeg = await getFFmpeg()
  
  const videoId = extractVideoIdFromUrl(videoUrl)
  const inputName = 'input.mp4'
  const playlistName = 'playlist.m3u8'

  // Download video
  const response = await fetch(videoUrl)
  const buffer = await response.arrayBuffer()
  await ffmpeg.writeFile(inputName, new Uint8Array(buffer))

  // Generate multiple quality variants
  const qualities: HLSQuality[] = [
    { label: '480p', width: 854, height: 480, bandwidth: 1000000, playlistUrl: '' },
    { label: '720p', width: 1280, height: 720, bandwidth: 2500000, playlistUrl: '' },
    { label: '1080p', width: 1920, height: 1080, bandwidth: 5000000, playlistUrl: '' },
  ]

  // Create HLS segments for each quality
  for (const quality of qualities) {
    const variantName = `variant_${quality.label}`
    
    await ffmpeg.exec([
      '-i', inputName,
      '-vf', `scale=w=${quality.width}:h=${quality.height}:force_original_aspect_ratio=decrease`,
      '-c:v', 'libx264',
      '-b:v', `${Math.round(quality.bandwidth / 1000)}k`,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-f', 'hls',
      '-hls_time', '4',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', `${variantName}_%03d.ts`,
      `${variantName}.m3u8`,
    ])

    quality.playlistUrl = `${STORAGE_CONFIG.baseUrl}/hls/${videoId}/${variantName}.m3u8`
  }

  // Create master playlist
  const masterPlaylist = generateMasterPlaylist(qualities)
  await ffmpeg.writeFile(playlistName, new TextEncoder().encode(masterPlaylist))

  // In production, upload all files to CDN
  const playlistUrl = `${STORAGE_CONFIG.baseUrl}/hls/${videoId}/${playlistName}`

  // Clean up
  await ffmpeg.deleteFile(inputName)
  await ffmpeg.deleteFile(playlistName)
  for (const quality of qualities) {
    await ffmpeg.deleteFile(`${quality.label}.m3u8`)
  }

  return {
    playlistUrl,
    segments: [], // Would be populated after segment upload
    qualities,
  }
}

/**
 * Generate master HLS playlist content
 */
function generateMasterPlaylist(qualities: HLSQuality[]): string {
  let playlist = '#EXTM3U\n'
  
  for (const quality of qualities) {
    playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bandwidth},RESOLUTION=${quality.width}x${quality.height}\n`
    playlist += `variant_${quality.label}.m3u8\n`
  }
  
  return playlist
}

// =============================================================================
// Hotspot Management
// =============================================================================

/**
 * In-memory store for hotspots (in production, use backend database)
 */
const hotspotsStore = new Map<string, Hotspot[]>()

/**
 * Add annotation hotspot to video
 * 
 * @param videoId - Video identifier
 * @param timestamp - Timestamp in seconds
 * @param x - X coordinate (0-100 percentage)
 * @param y - Y coordinate (0-100 percentage)
 * @param note - Annotation text
 * @param options - Additional hotspot options
 * @returns Created hotspot
 * 
 * @example
 * ```typescript
 * const hotspot = await addHotspot(
 *   'video-123',
 *   15.5,
 *   45.2,
 *   32.8,
 *   'Scratch on left door',
 *   { type: 'scratch', severity: 'medium' }
 * )
 * ```
 */
export async function addHotspot(
  videoId: string,
  timestamp: number,
  x: number,
  y: number,
  note: string,
  options?: {
    type?: HotspotType
    severity?: Hotspot['severity']
  }
): Promise<Hotspot> {
  const hotspot: Hotspot = {
    id: generateHotspotId(),
    videoId,
    timestamp: Math.max(0, timestamp),
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    note,
    type: options?.type || 'general_note',
    severity: options?.severity,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Store in memory (in production, persist to backend)
  const existing = hotspotsStore.get(videoId) || []
  existing.push(hotspot)
  hotspotsStore.set(videoId, existing)

  // Sync with backend
  await syncHotspotToBackend(hotspot)

  return hotspot
}

/**
 * Update existing hotspot
 */
export async function updateHotspot(
  hotspotId: string,
  updates: Partial<Pick<Hotspot, 'x' | 'y' | 'note' | 'type' | 'severity'>>
): Promise<Hotspot> {
  for (const [videoId, hotspots] of hotspotsStore.entries()) {
    const index = hotspots.findIndex(h => h.id === hotspotId)
    if (index !== -1) {
      const hotspot = hotspots[index]
      const updated = {
        ...hotspot,
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      hotspots[index] = updated
      await syncHotspotToBackend(updated)
      return updated
    }
  }
  throw new Error(`Hotspot ${hotspotId} not found`)
}

/**
 * Delete hotspot
 */
export async function deleteHotspot(hotspotId: string): Promise<void> {
  for (const [videoId, hotspots] of hotspotsStore.entries()) {
    const index = hotspots.findIndex(h => h.id === hotspotId)
    if (index !== -1) {
      hotspots.splice(index, 1)
      await deleteHotspotFromBackend(hotspotId)
      return
    }
  }
}

/**
 * Get hotspots for a video
 */
export async function getHotspots(videoId: string): Promise<Hotspot[]> {
  // Try to fetch from backend first
  try {
    const response = await fetch(`/api/videos/${videoId}/hotspots`)
    if (response.ok) {
      const hotspots = await response.json()
      hotspotsStore.set(videoId, hotspots)
      return hotspots
    }
  } catch {
    // Fallback to local store
  }
  
  return hotspotsStore.get(videoId) || []
}

/**
 * Get video by inspection ID
 * 
 * @param inspectionId - The inspection ID
 * @returns Video metadata with URL and hotspots, or null if not found
 * 
 * @example
 * ```typescript
 * const video = await getInspectionVideo('insp-123')
 * if (video) {
 *   console.log(video.url)
 *   console.log(video.hotspots)
 * }
 * ```
 */
export async function getInspectionVideo(
  inspectionId: string
): Promise<{ url: string; hotspots: Hotspot[] } | null> {
  try {
    const response = await fetch(`/api/inspections/${inspectionId}/video`)
    
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch video: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return {
      url: data.url,
      hotspots: data.hotspots || [],
    }
  } catch {
    // Return null if video not found or error occurs
    return null
  }
}

/**
 * Sync hotspot to backend
 */
async function syncHotspotToBackend(hotspot: Hotspot): Promise<void> {
  await fetch(`/api/videos/${hotspot.videoId}/hotspots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hotspot),
  })
}

/**
 * Delete hotspot from backend
 */
async function deleteHotspotFromBackend(hotspotId: string): Promise<void> {
  await fetch(`/api/videos/hotspots/${hotspotId}`, {
    method: 'DELETE',
  })
}

// =============================================================================
// Video Segments
// =============================================================================

/**
 * Get video segments for 360° vehicle walkaround
 * 
 * @param videoId - Video identifier
 * @param customSegments - Optional custom segment definitions
 * @returns Array of video segments with associated hotspots
 * 
 * @example
 * ```typescript
 * const segments = await getVideoSegments('video-123')
 * // segments[0] = { name: 'front_bumper', startTime: 0, endTime: 10, ... }
 * ```
 */
export async function getVideoSegments(
  videoId: string,
  customSegments?: Omit<VideoSegment, 'id' | 'hotspots'>[]
): Promise<VideoSegment[]> {
  const segments = customSegments || VEHICLE_SEGMENTS
  const allHotspots = await getHotspots(videoId)

  return segments.map((segment, index) => {
    const segmentHotspots = allHotspots.filter(
      h => h.timestamp >= segment.startTime && h.timestamp <= segment.endTime
    )

    return {
      ...segment,
      id: `${videoId}_segment_${index}`,
      hotspots: segmentHotspots,
      thumbnailUrl: `${STORAGE_CONFIG.baseUrl}/thumbnails/${videoId}_segment_${index}.jpg`,
    }
  })
}

/**
 * Get segment by name
 */
export async function getSegmentByName(
  videoId: string,
  name: VehicleSegmentType
): Promise<VideoSegment | undefined> {
  const segments = await getVideoSegments(videoId)
  return segments.find(s => s.name === name)
}

/**
 * Get current segment based on video timestamp
 */
export function getCurrentSegment(
  timestamp: number,
  segments: VideoSegment[]
): VideoSegment | undefined {
  return segments.find(
    s => timestamp >= s.startTime && timestamp <= s.endTime
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get video duration from file
 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = URL.createObjectURL(file)

    video.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    })

    video.addEventListener('error', () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video metadata'))
    })
  })
}

/**
 * Get video dimensions from file
 */
function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = URL.createObjectURL(file)

    video.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(video.src)
      resolve({ width: video.videoWidth, height: video.videoHeight })
    })

    video.addEventListener('error', () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Failed to load video metadata'))
    })
  })
}

/**
 * Generate unique video ID
 */
function generateVideoId(): string {
  return 'vid_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

/**
 * Generate unique hotspot ID
 */
function generateHotspotId(): string {
  return 'hs_' + Math.random().toString(36).substring(2, 15)
}

/**
 * Extract video ID from URL
 */
function extractVideoIdFromUrl(url: string): string {
  const match = url.match(/\/videos\/([^/]+)\./)
  return match ? match[1] : Date.now().toString(36)
}

/**
 * Get file extension
 */
function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/)
  return match ? match[0] : ''
}

/**
 * Format duration as HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Validate video file
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 500 * 1024 * 1024 // 500MB
  const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Allowed: MP4, WebM, MOV, AVI' }
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File too large. Maximum size: 500MB' }
  }

  return { valid: true }
}

// =============================================================================
// Export Service Object (Alternative API)
// =============================================================================

/**
 * Video service object with all methods
 * Alternative to individual function imports
 */
export const videoService = {
  // Upload & Compression
  uploadVideo,
  compressVideo,
  
  // Thumbnails & Frames
  extractFrame,
  generateThumbnailFromFile,
  
  // HLS Streaming
  generateHLSPlaylist,
  
  // Hotspots
  addHotspot,
  updateHotspot,
  deleteHotspot,
  getHotspots,
  
  // Segments
  getVideoSegments,
  getSegmentByName,
  getCurrentSegment,
  
  // FFmpeg Management
  getFFmpeg,
  terminateFFmpeg,
  
  // Utilities
  formatDuration,
  validateVideoFile,
}

export default videoService
