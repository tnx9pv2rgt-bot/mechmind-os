'use client'

import { useState } from 'react'
import { AlertCircle, Check } from 'lucide-react'

interface QRCodeDisplayProps {
  qrCode: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  showDownload?: boolean
}

const sizeClasses = {
  sm: 'w-32 h-32',
  md: 'w-48 h-48',
  lg: 'w-64 h-64',
}

export function QRCodeDisplay({ 
  qrCode, 
  alt = 'QR Code',
  size = 'md',
  showDownload = true,
}: QRCodeDisplayProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    if (!qrCode) return
    
    // If qrCode is already a data URL
    if (qrCode.startsWith('data:')) {
      const link = document.createElement('a')
      link.href = qrCode
      link.download = 'mechmind-mfa-qr.png'
      link.click()
    } else {
      // If it's just the base64 data, construct the data URL
      const dataUrl = `data:image/png;base64,${qrCode}`
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = 'mechmind-mfa-qr.png'
      link.click()
    }
  }

  const handleCopy = async () => {
    if (!qrCode) return
    
    try {
      // If qrCode is a data URL, we need to convert it to a blob
      if (qrCode.startsWith('data:')) {
        const response = await fetch(qrCode)
        const blob = await response.blob()
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy QR code:', err)
    }
  }

  // Ensure qrCode is a valid data URL
  const imageSrc = qrCode.startsWith('data:') 
    ? qrCode 
    : `data:image/png;base64,${qrCode}`

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code Container */}
      <div 
        className={`
          relative flex items-center justify-center 
          rounded-xl bg-white p-4 shadow-inner
          ${sizeClasses[size]}
        `}
      >
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          </div>
        )}
        
        {imageError ? (
          <div className="flex flex-col items-center justify-center text-red-500">
            <AlertCircle className="h-8 w-8" />
            <span className="mt-2 text-xs">Errore caricamento</span>
          </div>
        ) : (
          <img
            src={imageSrc}
            alt={alt}
            className={`
              h-full w-full object-contain
              transition-opacity duration-300
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        {/* Success overlay when copied */}
        {copied && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
            <div className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-green-600">
              <Check className="mr-1 inline h-4 w-4" />
              Copiato!
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {showDownload && imageLoaded && (
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Scarica QR
          </button>
          <button
            onClick={handleCopy}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {copied ? 'Copiato!' : 'Copia'}
          </button>
        </div>
      )}

      {/* Help text */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Scansiona con la tua app di autenticazione
      </p>
    </div>
  )
}

export default QRCodeDisplay
