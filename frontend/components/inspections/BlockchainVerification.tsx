'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Loader2,
  AlertTriangle,
  QrCode,
  FileCheck,
  Database,
  Clock,
  Fuel,
  Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getInspectionFromBlockchain,
  verifyInspection,
  VerificationResult,
  InspectionData,
  NFTMintResult,
} from '@/lib/services/blockchainService'

// QR Code SVG Component - compatible with qrcode.react API
// To use the real qrcode.react library, install it and import:
// import { QRCodeSVG } from 'qrcode.react'
interface QRCodeSVGProps {
  value: string
  size?: number
  level?: 'L' | 'M' | 'Q' | 'H'
  className?: string
}

const QRCodeSVG = ({ value, size = 200, className }: QRCodeSVGProps) => {
  // Generate a simple pattern based on the value for visual representation
  // In production, replace this with actual QRCodeSVG from 'qrcode.react'
  const generatePattern = (str: string) => {
    const seed = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const cells = 25
    const cellSize = Math.floor((size - 40) / cells)
    const pattern = []
    
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        // Create a pseudo-random pattern based on the seed
        const isFilled = ((seed + i * cells + j) * 9301 + 49297) % 233280 / 233280 > 0.5
        // Add position detection patterns (corners)
        const isCorner = 
          (i < 7 && j < 7) || // Top-left
          (i < 7 && j >= cells - 7) || // Top-right
          (i >= cells - 7 && j < 7) // Bottom-left
        
        if (isFilled || isCorner) {
          pattern.push(
            <rect
              key={`${i}-${j}`}
              x={20 + j * cellSize}
              y={20 + i * cellSize}
              width={cellSize}
              height={cellSize}
              fill={isCorner ? '#000' : '#333'}
            />
          )
        }
      }
    }
    return pattern
  }

  return (
    <div
      className={cn(
        'bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size - 40} height={size - 40} viewBox={`0 0 ${size - 40} ${size - 40}`}>
        <rect width="100%" height="100%" fill="white" />
        {generatePattern(value)}
      </svg>
    </div>
  )
}

interface BlockchainVerificationProps {
  inspectionId: string
  contractAddress?: string
  ipfsCID?: string
  inspectionData?: InspectionData
  nftData?: NFTMintResult
  verificationUrl?: string
}

type VerificationStatus = 'idle' | 'loading' | 'verified' | 'not_found' | 'tampered'

interface CertificateDetails {
  contractAddress: string
  transactionHash: string
  blockNumber: bigint
  timestamp: string
  ipfsCid: string
  gasUsed: bigint
  inspectorAddress?: string
  vin?: string
  isRevoked: boolean
}

export function BlockchainVerification({
  inspectionId,
  contractAddress: initialContractAddress,
  ipfsCID: initialIpfsCID,
  inspectionData,
  nftData,
  verificationUrl,
}: BlockchainVerificationProps) {
  const [status, setStatus] = useState<VerificationStatus>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [certificateDetails, setCertificateDetails] = useState<CertificateDetails | null>(null)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const fetchCertificateDetails = useCallback(async () => {
    if (!initialContractAddress) return

    setIsLoading(true)
    setError(null)

    try {
      const details = await getInspectionFromBlockchain(initialContractAddress as `0x${string}`)

      setCertificateDetails({
        contractAddress: details.contractAddress,
        transactionHash: details.transactionHash,
        blockNumber: details.blockNumber,
        timestamp: new Date(Number(details.timestamp)).toISOString(),
        ipfsCid: details.ipfsCid || initialIpfsCID || '',
        gasUsed: BigInt(150000), // Mock value - would come from deployment receipt
        inspectorAddress: details.inspectorAddress,
        vin: details.vin,
        isRevoked: details.isRevoked,
      })

      setStatus(details.isRevoked ? 'tampered' : 'verified')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch certificate details')
      setStatus('not_found')
    } finally {
      setIsLoading(false)
    }
  }, [initialContractAddress, initialIpfsCID])

  // Fetch details on mount if contract address is provided
  useEffect(() => {
    if (initialContractAddress) {
      fetchCertificateDetails()
    }
  }, [initialContractAddress, fetchCertificateDetails])

  const handleVerify = async () => {
    if (!initialContractAddress || !inspectionData) {
      setError('Contract address and inspection data required for verification')
      return
    }

    setIsLoading(true)
    setError(null)
    setStatus('loading')

    try {
      const result = await verifyInspection(
        initialContractAddress as `0x${string}`,
        inspectionData
      )

      setVerificationResult(result)
      setStatus(result.isValid && result.match ? 'verified' : 'tampered')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setStatus('not_found')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // Fallback - ignore error
    }
  }

  const truncateAddress = (address: string, start = 6, end = 4) => {
    if (!address) return ''
    return `${address.slice(0, start)}...${address.slice(-end)}`
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          title: 'Certificate Verified on Blockchain',
          description: 'This inspection certificate is authentic and verified on the Polygon blockchain.',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badgeVariant: 'success' as const,
        }
      case 'not_found':
        return {
          icon: XCircle,
          title: 'Not Found',
          description: 'This inspection certificate could not be found on the blockchain.',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeVariant: 'destructive' as const,
        }
      case 'tampered':
        return {
          icon: AlertTriangle,
          title: 'Data Tampered',
          description: 'Warning: The inspection data does not match the blockchain record.',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          badgeVariant: 'warning' as const,
        }
      case 'loading':
        return {
          icon: Loader2,
          title: 'Verifying...',
          description: 'Please wait while we verify the certificate on the blockchain.',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badgeVariant: 'default' as const,
        }
      default:
        return {
          icon: Shield,
          title: 'Ready to Verify',
          description: 'Click the button below to verify this inspection on the blockchain.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          badgeVariant: 'secondary' as const,
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  const DetailRow = ({
    label,
    value,
    truncate = false,
    copyable = false,
    link,
    icon: Icon,
  }: {
    label: string
    value: string
    truncate?: boolean
    copyable?: boolean
    link?: string
    icon?: React.ComponentType<{ className?: string }>
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {Icon && <Icon className="h-4 w-4" />}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {truncate ? truncateAddress(value) : value}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-sm font-medium text-gray-900">
            {truncate ? truncateAddress(value) : value}
          </span>
        )}
        {copyable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => copyToClipboard(value, label)}
          >
            {copiedField === label ? (
              <CheckCircle className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 text-gray-400" />
            )}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card
        className={cn(
          'border-2 transition-all',
          statusConfig.borderColor,
          statusConfig.bgColor
        )}
      >
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center',
                status === 'verified' && 'bg-green-100',
                status === 'not_found' && 'bg-red-100',
                status === 'tampered' && 'bg-orange-100',
                status === 'loading' && 'bg-blue-100',
                status === 'idle' && 'bg-gray-100'
              )}
            >
              <StatusIcon
                className={cn(
                  'h-10 w-10',
                  status === 'loading' && 'animate-spin',
                  statusConfig.color
                )}
              />
            </div>
            <div>
              <h3 className={cn('text-xl font-bold', statusConfig.color)}>
                {status === 'verified' && '✓ '}
                {status === 'not_found' && '⚠ '}
                {statusConfig.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1 max-w-md">
                {statusConfig.description}
              </p>
            </div>
            <Badge
              variant={
                status === 'verified'
                  ? 'default'
                  : status === 'not_found'
                  ? 'destructive'
                  : status === 'tampered'
                  ? 'outline'
                  : 'secondary'
              }
              className="text-sm px-3 py-1"
            >
              {status === 'verified' && 'Verified'}
              {status === 'not_found' && 'Not Found'}
              {status === 'tampered' && 'Data Mismatch'}
              {status === 'loading' && 'Verifying...'}
              {status === 'idle' && 'Pending Verification'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certificate Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Certificate Details
            </CardTitle>
            <CardDescription>
              Blockchain-verified inspection certificate information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !certificateDetails ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
              </div>
            ) : certificateDetails ? (
              <div className="space-y-1">
                <DetailRow
                  label="Contract Address"
                  value={certificateDetails.contractAddress}
                  truncate
                  copyable
                  icon={Database}
                  link={`https://polygonscan.com/address/${certificateDetails.contractAddress}`}
                />
                <DetailRow
                  label="Transaction Hash"
                  value={certificateDetails.transactionHash}
                  truncate
                  copyable
                  icon={FileCheck}
                  link={`https://polygonscan.com/tx/${certificateDetails.transactionHash}`}
                />
                <DetailRow
                  label="Block Number"
                  value={certificateDetails.blockNumber.toString()}
                  icon={Database}
                />
                <DetailRow
                  label="Timestamp"
                  value={new Date(certificateDetails.timestamp).toLocaleString()}
                  icon={Clock}
                />
                <DetailRow
                  label="Gas Used"
                  value={`${certificateDetails.gasUsed.toString()} units`}
                  icon={Fuel}
                />
                {certificateDetails.ipfsCid && (
                  <DetailRow
                    label="IPFS CID"
                    value={certificateDetails.ipfsCid}
                    truncate
                    copyable
                    icon={Database}
                    link={`https://gateway.pinata.cloud/ipfs/${certificateDetails.ipfsCid}`}
                  />
                )}
                {certificateDetails.vin && (
                  <DetailRow label="VIN" value={certificateDetails.vin} icon={Shield} />
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No certificate details available</p>
                <p className="text-sm mt-1">
                  Deploy the inspection to the blockchain to view details
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code & Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Verification QR Code
              </CardTitle>
              <CardDescription>Scan with your mobile device to verify</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                {initialContractAddress ? (
                  <>
                    <QRCodeSVG
                      value={
                        verificationUrl ||
                        `https://polygonscan.com/address/${initialContractAddress}`
                      }
                      size={200}
                      className="mb-4"
                    />
                    <p className="text-xs text-gray-500 text-center">
                      Scan this QR code to verify the certificate authenticity
                      <br />
                      on the Polygon blockchain
                    </p>
                  </>
                ) : (
                  <div className="w-[200px] h-[200px] bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-center">
                      <QrCode className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400">No contract deployed</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verification Action */}
          <Card>
            <CardHeader>
              <CardTitle>Verify Inspection Data</CardTitle>
              <CardDescription>
                Compare current data with blockchain record
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {verificationResult && (
                <div
                  className={cn(
                    'p-4 rounded-lg border',
                    verificationResult.match
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {verificationResult.match ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span
                      className={cn(
                        'font-medium',
                        verificationResult.match ? 'text-green-700' : 'text-red-700'
                      )}
                    >
                      {verificationResult.match ? 'Hash Matches' : 'Data Tampered'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Blockchain Hash:</span>
                      <code className="block bg-white px-2 py-1 rounded mt-1 text-xs break-all font-mono">
                        {verificationResult.blockchainHash}
                      </code>
                    </div>
                    <div>
                      <span className="text-gray-500">Calculated Hash:</span>
                      <code className="block bg-white px-2 py-1 rounded mt-1 text-xs break-all font-mono">
                        {verificationResult.calculatedHash}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleVerify}
                disabled={isLoading || !initialContractAddress || !inspectionData}
                className="w-full"
                loading={isLoading}
              >
                {isLoading ? (
                  'Verifying...'
                ) : verificationResult ? (
                  'Verify Again'
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Verify Now
                  </>
                )}
              </Button>

              {!initialContractAddress && (
                <p className="text-xs text-amber-600 text-center">
                  Deploy the inspection to the blockchain first to enable verification
                </p>
              )}
              {!inspectionData && initialContractAddress && (
                <p className="text-xs text-amber-600 text-center">
                  Inspection data required for hash verification
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* NFT Certificate Section */}
      {nftData && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <ImageIcon className="h-5 w-5" />
              NFT Certificate
            </CardTitle>
            <CardDescription className="text-purple-600">
              This inspection has been minted as an NFT certificate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-6">
              {/* NFT Image Preview */}
              <div className="flex-shrink-0">
                <div className="w-48 h-48 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl shadow-lg flex items-center justify-center">
                  <div className="text-center text-white">
                    <Shield className="h-16 w-16 mx-auto mb-2" />
                    <p className="font-bold">NFT Certificate</p>
                    <p className="text-sm opacity-90">#{nftData.tokenId.toString()}</p>
                  </div>
                </div>
              </div>

              {/* NFT Details */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/60 rounded-lg">
                    <p className="text-xs text-purple-600">Token ID</p>
                    <p className="font-medium text-purple-900">#{nftData.tokenId.toString()}</p>
                  </div>
                  <div className="p-3 bg-white/60 rounded-lg">
                    <p className="text-xs text-purple-600">Network</p>
                    <p className="font-medium text-purple-900">Polygon</p>
                  </div>
                  <div className="p-3 bg-white/60 rounded-lg">
                    <p className="text-xs text-purple-600">Owner</p>
                    <p className="font-medium text-purple-900">
                      {truncateAddress(nftData.owner)}
                    </p>
                  </div>
                  <div className="p-3 bg-white/60 rounded-lg">
                    <p className="text-xs text-purple-600">Block</p>
                    <p className="font-medium text-purple-900">
                      {nftData.blockNumber.toString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="bg-white/80 border-purple-300 hover:bg-purple-100"
                    asChild
                  >
                    <a
                      href={`https://opensea.io/assets/matic/${nftData.contractAddress}/${nftData.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on OpenSea
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-white/80 border-purple-300 hover:bg-purple-100"
                    asChild
                  >
                    <a
                      href={`https://polygonscan.com/token/${nftData.contractAddress}?a=${nftData.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Polygonscan
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Verification Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default BlockchainVerification
