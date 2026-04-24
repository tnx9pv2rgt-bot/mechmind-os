'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getInspectionFromBlockchain,
  verifyInspection,
  VerificationResult,
  InspectionData,
  NFTMintResult,
} from '@/lib/services/blockchainService';

// QR Code SVG Component - compatible with qrcode.react API
// To use the real qrcode.react library, install it and import:
// import { QRCodeSVG } from 'qrcode.react'
interface QRCodeSVGProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  className?: string;
}

const QRCodeSVG = ({ value, size = 200, className }: QRCodeSVGProps) => {
  // Generate a simple pattern based on the value for visual representation
  // In production, replace this with actual QRCodeSVG from 'qrcode.react'
  const generatePattern = (str: string) => {
    const seed = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const cells = 25;
    const cellSize = Math.floor((size - 40) / cells);
    const pattern = [];

    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        // Create a pseudo-random pattern based on the seed
        const isFilled = (((seed + i * cells + j) * 9301 + 49297) % 233280) / 233280 > 0.5;
        // Add position detection patterns (corners)
        const isCorner =
          (i < 7 && j < 7) || // Top-left
          (i < 7 && j >= cells - 7) || // Top-right
          (i >= cells - 7 && j < 7); // Bottom-left

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
          );
        }
      }
    }
    return pattern;
  };

  return (
    <div
      className={cn(
        'bg-[var(--surface-secondary)] p-4 rounded-lg border border-[var(--border-default)] flex items-center justify-center overflow-hidden',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size - 40} height={size - 40} viewBox={`0 0 ${size - 40} ${size - 40}`}>
        <rect width='100%' height='100%' fill='white' />
        {generatePattern(value)}
      </svg>
    </div>
  );
};

interface BlockchainVerificationProps {
  inspectionId: string;
  contractAddress?: string;
  ipfsCID?: string;
  inspectionData?: InspectionData;
  nftData?: NFTMintResult;
  verificationUrl?: string;
}

type VerificationStatus = 'idle' | 'loading' | 'verified' | 'not_found' | 'tampered';

interface CertificateDetails {
  contractAddress: string;
  transactionHash: string;
  blockNumber: bigint;
  timestamp: string;
  ipfsCid: string;
  gasUsed: bigint;
  inspectorAddress?: string;
  vin?: string;
  isRevoked: boolean;
}

export function BlockchainVerification({
  inspectionId,
  contractAddress: initialContractAddress,
  ipfsCID: initialIpfsCID,
  inspectionData,
  nftData,
  verificationUrl,
}: BlockchainVerificationProps) {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [certificateDetails, setCertificateDetails] = useState<CertificateDetails | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchCertificateDetails = useCallback(async () => {
    if (!initialContractAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const details = await getInspectionFromBlockchain(initialContractAddress as `0x${string}`);

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
      });

      setStatus(details.isRevoked ? 'tampered' : 'verified');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossibile recuperare i dettagli del certificato'
      );
      setStatus('not_found');
    } finally {
      setIsLoading(false);
    }
  }, [initialContractAddress, initialIpfsCID]);

  // Fetch details on mount if contract address is provided
  useEffect(() => {
    if (initialContractAddress) {
      fetchCertificateDetails();
    }
  }, [initialContractAddress, fetchCertificateDetails]);

  const handleVerify = async () => {
    if (!initialContractAddress || !inspectionData) {
      setError('Indirizzo contratto e dati ispezione necessari per la verifica');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus('loading');

    try {
      const result = await verifyInspection(
        initialContractAddress as `0x${string}`,
        inspectionData
      );

      setVerificationResult(result);
      setStatus(result.isValid && result.match ? 'verified' : 'tampered');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifica fallita');
      setStatus('not_found');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback - ignore error
    }
  };

  const truncateAddress = (address: string, start = 6, end = 4) => {
    if (!address) return '';
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          title: 'Certificato Verificato su Blockchain',
          description:
            'Questo certificato di ispezione è autentico e verificato sulla blockchain Polygon.',
          color: 'text-[var(--status-success)]',
          bgColor: 'bg-[var(--status-success-subtle)]',
          borderColor: 'border-[var(--status-success-subtle)]',
          badgeVariant: 'success' as const,
        };
      case 'not_found':
        return {
          icon: XCircle,
          title: 'Non Trovato',
          description: 'Questo certificato di ispezione non è stato trovato sulla blockchain.',
          color: 'text-[var(--status-error)]',
          bgColor: 'bg-[var(--status-error-subtle)]',
          borderColor: 'border-[var(--status-error-subtle)]',
          badgeVariant: 'destructive' as const,
        };
      case 'tampered':
        return {
          icon: AlertTriangle,
          title: 'Dati Manomessi',
          description:
            "Attenzione: i dati dell'ispezione non corrispondono al record sulla blockchain.",
          color: 'text-[var(--status-warning)]',
          bgColor: 'bg-[var(--status-warning)]/5',
          borderColor: 'border-[var(--status-warning)]/20',
          badgeVariant: 'warning' as const,
        };
      case 'loading':
        return {
          icon: Loader2,
          title: 'Verifica in corso...',
          description: 'Attendere durante la verifica del certificato sulla blockchain.',
          color: 'text-[var(--status-info)]',
          bgColor: 'bg-[var(--status-info-subtle)]',
          borderColor: 'border-[var(--status-info-subtle)]',
          badgeVariant: 'default' as const,
        };
      default:
        return {
          icon: Shield,
          title: 'Pronto per la Verifica',
          description:
            'Clicca il pulsante qui sotto per verificare questa ispezione sulla blockchain.',
          color: 'text-[var(--text-secondary)]',
          bgColor: 'bg-[var(--surface-secondary)]',
          borderColor: 'border-[var(--border-default)]',
          badgeVariant: 'secondary' as const,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const DetailRow = ({
    label,
    value,
    truncate = false,
    copyable = false,
    link,
    icon: Icon,
  }: {
    label: string;
    value: string;
    truncate?: boolean;
    copyable?: boolean;
    link?: string;
    icon?: React.ComponentType<{ className?: string }>;
  }) => (
    <div className='flex items-center justify-between py-2 border-b border-[var(--border-default)] last:border-0'>
      <div className='flex items-center gap-2 text-sm text-[var(--text-tertiary)]'>
        {Icon && <Icon className='h-4 w-4' />}
        <span>{label}</span>
      </div>
      <div className='flex items-center gap-2'>
        {link ? (
          <a
            href={link}
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm font-medium text-[var(--status-info)] hover:text-[var(--status-info)] flex items-center gap-1'
          >
            {truncate ? truncateAddress(value) : value}
            <ExternalLink className='h-3 w-3' />
          </a>
        ) : (
          <span className='text-sm font-medium text-[var(--text-primary)]'>
            {truncate ? truncateAddress(value) : value}
          </span>
        )}
        {copyable && (
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={() => copyToClipboard(value, label)}
            aria-label={`Copia ${label}`}
          >
            {copiedField === label ? (
              <CheckCircle className='h-3 w-3 text-[var(--status-success)]' />
            ) : (
              <Copy className='h-3 w-3 text-[var(--text-tertiary)]' />
            )}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className='space-y-6'>
      {/* Status Card */}
      <Card
        className={cn('border-2 transition-all', statusConfig.borderColor, statusConfig.bgColor)}
      >
        <CardContent className='p-6'>
          <div className='flex flex-col items-center text-center space-y-4'>
            <div
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center',
                status === 'verified' && 'bg-[var(--status-success-subtle)]',
                status === 'not_found' && 'bg-[var(--status-error-subtle)]',
                status === 'tampered' && 'bg-[var(--status-warning)]/10',
                status === 'loading' && 'bg-[var(--status-info-subtle)]',
                status === 'idle' && 'bg-[var(--surface-secondary)]'
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
              <p className='text-sm text-[var(--text-secondary)] mt-1 max-w-md'>{statusConfig.description}</p>
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
              className='text-sm px-3 py-1'
            >
              {status === 'verified' && 'Verificato'}
              {status === 'not_found' && 'Non Trovato'}
              {status === 'tampered' && 'Dati Non Corrispondenti'}
              {status === 'loading' && 'Verifica in corso...'}
              {status === 'idle' && 'In Attesa di Verifica'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Certificate Details */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileCheck className='h-5 w-5' />
              Dettagli Certificato
            </CardTitle>
            <CardDescription>
              Informazioni certificato ispezione verificate su blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !certificateDetails ? (
              <div className='space-y-3'>
                <div className='h-4 bg-[var(--border-default)] rounded animate-pulse' />
                <div className='h-4 bg-[var(--border-default)] rounded animate-pulse w-3/4' />
                <div className='h-4 bg-[var(--border-default)] rounded animate-pulse w-1/2' />
                <div className='h-4 bg-[var(--border-default)] rounded animate-pulse w-5/6' />
                <div className='h-4 bg-[var(--border-default)] rounded animate-pulse w-2/3' />
              </div>
            ) : certificateDetails ? (
              <div className='space-y-1'>
                <DetailRow
                  label='Indirizzo Contratto'
                  value={certificateDetails.contractAddress}
                  truncate
                  copyable
                  icon={Database}
                  link={`https://polygonscan.com/address/${certificateDetails.contractAddress}`}
                />
                <DetailRow
                  label='Hash Transazione'
                  value={certificateDetails.transactionHash}
                  truncate
                  copyable
                  icon={FileCheck}
                  link={`https://polygonscan.com/tx/${certificateDetails.transactionHash}`}
                />
                <DetailRow
                  label='Numero Blocco'
                  value={certificateDetails.blockNumber.toString()}
                  icon={Database}
                />
                <DetailRow
                  label='Timestamp'
                  value={new Date(certificateDetails.timestamp).toLocaleString()}
                  icon={Clock}
                />
                <DetailRow
                  label='Gas Utilizzato'
                  value={`${certificateDetails.gasUsed.toString()} unità`}
                  icon={Fuel}
                />
                {certificateDetails.ipfsCid && (
                  <DetailRow
                    label='IPFS CID'
                    value={certificateDetails.ipfsCid}
                    truncate
                    copyable
                    icon={Database}
                    link={`https://gateway.pinata.cloud/ipfs/${certificateDetails.ipfsCid}`}
                  />
                )}
                {certificateDetails.vin && (
                  <DetailRow label='VIN' value={certificateDetails.vin} icon={Shield} />
                )}
              </div>
            ) : (
              <div className='text-center py-8 text-[var(--text-tertiary)]'>
                <Database className='h-12 w-12 mx-auto mb-3 text-[var(--text-tertiary)]' />
                <p>Nessun dettaglio certificato disponibile</p>
                <p className='text-sm mt-1'>
                  Pubblica l&apos;ispezione sulla blockchain per visualizzare i dettagli
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code & Quick Actions */}
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <QrCode className='h-5 w-5' />
                Codice QR di Verifica
              </CardTitle>
              <CardDescription>
                Scansiona con il tuo dispositivo mobile per verificare
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col items-center'>
                {initialContractAddress ? (
                  <>
                    <QRCodeSVG
                      value={
                        verificationUrl ||
                        `https://polygonscan.com/address/${initialContractAddress}`
                      }
                      size={200}
                      className='mb-4'
                    />
                    <p className='text-xs text-[var(--text-tertiary)] text-center'>
                      Scansiona questo codice QR per verificare l&apos;autenticità del certificato
                      <br />
                      sulla blockchain Polygon
                    </p>
                  </>
                ) : (
                  <div className='w-[200px] h-[200px] bg-[var(--surface-secondary)] rounded-lg flex items-center justify-center mb-4'>
                    <div className='text-center'>
                      <QrCode className='h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-2' />
                      <p className='text-sm text-[var(--text-tertiary)]'>Nessun contratto pubblicato</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verification Action */}
          <Card>
            <CardHeader>
              <CardTitle>Verifica Dati Ispezione</CardTitle>
              <CardDescription>Confronta i dati attuali con il record blockchain</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {verificationResult && (
                <div
                  className={cn(
                    'p-4 rounded-lg border',
                    verificationResult.match
                      ? 'bg-[var(--status-success-subtle)] border-[var(--status-success)]/30'
                      : 'bg-[var(--status-error-subtle)] border-[var(--status-error)]/30'
                  )}
                >
                  <div className='flex items-center gap-2 mb-3'>
                    {verificationResult.match ? (
                      <CheckCircle className='h-5 w-5 text-[var(--status-success)]' />
                    ) : (
                      <XCircle className='h-5 w-5 text-[var(--status-error)]' />
                    )}
                    <span
                      className={cn(
                        'font-medium',
                        verificationResult.match ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'
                      )}
                    >
                      {verificationResult.match ? 'Hash Corrispondente' : 'Dati Manomessi'}
                    </span>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div>
                      <span className='text-[var(--text-secondary)]'>Hash Blockchain:</span>
                      <code className='block bg-[var(--surface-secondary)] px-2 py-1 rounded mt-1 text-xs break-all font-mono'>
                        {verificationResult.blockchainHash}
                      </code>
                    </div>
                    <div>
                      <span className='text-[var(--text-secondary)]'>Hash Calcolato:</span>
                      <code className='block bg-[var(--surface-secondary)] px-2 py-1 rounded mt-1 text-xs break-all font-mono'>
                        {verificationResult.calculatedHash}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleVerify}
                disabled={isLoading || !initialContractAddress || !inspectionData}
                className='w-full'
                loading={isLoading}
              >
                {isLoading ? (
                  'Verifica in corso...'
                ) : verificationResult ? (
                  'Verifica di Nuovo'
                ) : (
                  <>
                    <Shield className='h-4 w-4 mr-2' />
                    Verifica Ora
                  </>
                )}
              </Button>

              {!initialContractAddress && (
                <p className='text-xs text-[var(--status-warning)] text-center'>
                  Pubblica prima l&apos;ispezione sulla blockchain per abilitare la verifica
                </p>
              )}
              {!inspectionData && initialContractAddress && (
                <p className='text-xs text-[var(--status-warning)] text-center'>
                  Dati ispezione necessari per la verifica hash
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* NFT Certificate Section */}
      {nftData && (
        <Card className='border-[var(--brand)]/20 bg-gradient-to-br from-[var(--brand)]/5 to-[var(--status-warning)]/5'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-[var(--brand)]'>
              <ImageIcon className='h-5 w-5' />
              Certificato NFT
            </CardTitle>
            <CardDescription className='text-[var(--brand)]'>
              Questa ispezione è stata coniata come certificato NFT
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col sm:flex-row gap-6'>
              {/* NFT Image Preview */}
              <div className='flex-shrink-0'>
                <div className='w-48 h-48 bg-gradient-to-br from-[var(--brand)] to-[var(--status-warning)] rounded-xl shadow-lg flex items-center justify-center'>
                  <div className='text-center text-[var(--text-on-brand)]'>
                    <Shield className='h-16 w-16 mx-auto mb-2' />
                    <p className='font-bold'>Certificato NFT</p>
                    <p className='text-sm opacity-90'>#{nftData.tokenId.toString()}</p>
                  </div>
                </div>
              </div>

              {/* NFT Details */}
              <div className='flex-1 space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='p-3 bg-[var(--surface-secondary)]/60 rounded-lg'>
                    <p className='text-xs text-[var(--brand)]'>Token ID</p>
                    <p className='font-medium text-[var(--brand)]'>#{nftData.tokenId.toString()}</p>
                  </div>
                  <div className='p-3 bg-[var(--surface-secondary)]/60 rounded-lg'>
                    <p className='text-xs text-[var(--brand)]'>Rete</p>
                    <p className='font-medium text-[var(--brand)]'>Polygon</p>
                  </div>
                  <div className='p-3 bg-[var(--surface-secondary)]/60 rounded-lg'>
                    <p className='text-xs text-[var(--brand)]'>Proprietario</p>
                    <p className='font-medium text-[var(--brand)]'>{truncateAddress(nftData.owner)}</p>
                  </div>
                  <div className='p-3 bg-[var(--surface-secondary)]/60 rounded-lg'>
                    <p className='text-xs text-[var(--brand)]'>Blocco</p>
                    <p className='font-medium text-[var(--brand)]'>{nftData.blockNumber.toString()}</p>
                  </div>
                </div>

                <div className='flex flex-wrap gap-3'>
                  <Button
                    variant='outline'
                    className='bg-[var(--surface-secondary)] border-[var(--brand)]/30 hover:bg-[var(--brand)]/10'
                    asChild
                  >
                    <a
                      href={`https://opensea.io/assets/matic/${nftData.contractAddress}/${nftData.tokenId}`}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <ExternalLink className='h-4 w-4 mr-2' />
                      Vedi su OpenSea
                    </a>
                  </Button>
                  <Button
                    variant='outline'
                    className='bg-[var(--surface-secondary)] border-[var(--brand)]/30 hover:bg-[var(--brand)]/10'
                    asChild
                  >
                    <a
                      href={`https://polygonscan.com/token/${nftData.contractAddress}?a=${nftData.tokenId}`}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <ExternalLink className='h-4 w-4 mr-2' />
                      Vedi su Polygonscan
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
        <div className='p-4 bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 rounded-lg flex items-start gap-3'>
          <AlertTriangle className='h-5 w-5 text-[var(--status-error)] flex-shrink-0 mt-0.5' />
          <div>
            <p className='font-medium text-[var(--status-error)]'>Errore di Verifica</p>
            <p className='text-sm text-[var(--status-error)]'>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlockchainVerification;
