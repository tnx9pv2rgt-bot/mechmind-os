/**
 * POST /api/inspections/[id]/video
 * Upload and process video for inspection
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  uploadVideo,
  compressVideo,
  validateVideoFile,
} from '@/lib/services/videoService'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Maximum file size: 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Inspection ID is required' },
        { status: 400 }
      )
    }

    // Check content type
    const contentType = request.headers.get('content-type') || ''
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { 
          error: 'Invalid content type',
          details: 'Content-Type must be multipart/form-data'
        },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const compress = formData.get('compress') !== 'false' // default to true
    const compressionOptions = formData.get('compressionOptions') 
      ? JSON.parse(formData.get('compressionOptions') as string)
      : undefined

    if (!file) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'file is required'
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: 'File must be a video'
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`
        },
        { status: 400 }
      )
    }

    // Validate video file
    const validation = await validateVideoFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error || 'Invalid video file'
        },
        { status: 400 }
      )
    }

    let processedFile = file

    // Compress if requested and file is large (> 50MB)
    if (compress && file.size > 50 * 1024 * 1024) {
      processedFile = await compressVideo(file, compressionOptions || {
        resolution: '1080p',
        bitrate: 5000,
        crf: 23,
      })
    }

    // Upload video
    const metadata = await uploadVideo(processedFile, id)

    return NextResponse.json(
      { 
        success: true,
        data: {
          videoId: metadata.id,
          inspectionId: id,
          videoUrl: metadata.videoUrl,
          thumbnailUrl: metadata.thumbnailUrl,
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          size: metadata.size,
          mimeType: metadata.mimeType,
          status: metadata.status,
          uploadedAt: metadata.uploadedAt,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Upload video error:', error)

    if (error instanceof Error && error.message.includes('Failed to get presigned URL')) {
      return NextResponse.json(
        { 
          error: 'Storage error',
          details: 'Failed to get upload URL from storage service'
        },
        { status: 503 }
      )
    }

    if (error instanceof Error && error.message.includes('Upload failed')) {
      return NextResponse.json(
        { 
          error: 'Upload failed',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
