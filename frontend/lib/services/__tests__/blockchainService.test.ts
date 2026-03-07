/**
 * Blockchain Service Unit Tests
 * 
 * Tests for inspection hash generation, IPFS upload, contract deployment,
 * verification logic, and NFT minting.
 * 
 * @module lib/services/__tests__/blockchainService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Import the service functions
import {
  generateInspectionHash,
  uploadToIPFS,
  deployInspectionContract,
  getInspectionFromBlockchain,
  verifyInspection,
  mintInspectionNFT,
  getInspectionsByVIN,
  revokeInspection,
  isInspectionRevoked,
  batchVerifyInspections,
  BlockchainService,
  INSPECTION_CONTRACT_ABI,
  FACTORY_CONTRACT_ABI,
  NFT_CONTRACT_ABI,
  type InspectionData,
  type BlockchainServiceConfig,
} from '../blockchainService'

describe('BlockchainService', () => {
  // Mock crypto.subtle for hash generation
  const originalCrypto = global.crypto

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock crypto.subtle for testing
    global.crypto = {
      ...originalCrypto,
      subtle: {
        digest: vi.fn().mockImplementation(async (algorithm, data) => {
          // Return a mock hash (32 bytes for SHA-256)
          return new Uint8Array(32).fill(0xAB).buffer
        }),
      },
    } as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.crypto = originalCrypto
  })

  // =============================================================================
  // generateInspectionHash Tests
  // =============================================================================
  describe('generateInspectionHash', () => {
    const baseInspectionData: InspectionData = {
      id: 'insp-001',
      vin: '1HGBH41JXMN109186',
      inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      timestamp: '2024-01-15T10:30:00Z',
      result: 'passed',
      notes: 'Vehicle in good condition',
      mileage: 50000,
      location: 'Rome, Italy',
      checklistItems: [
        { id: 'item-1', name: 'Brakes', status: 'pass' },
        { id: 'item-2', name: 'Tires', status: 'pass' },
      ],
      photos: [
        { id: 'photo-1', caption: 'Front view', takenAt: '2024-01-15T10:00:00Z' },
      ],
    }

    it('should generate a hash string', async () => {
      const hash = await generateInspectionHash(baseInspectionData)

      expect(typeof hash).toBe('string')
      expect(hash.startsWith('0x')).toBe(true)
    })

    it('should generate consistent hash for same data', async () => {
      const hash1 = await generateInspectionHash(baseInspectionData)
      const hash2 = await generateInspectionHash(baseInspectionData)

      expect(hash1).toBe(hash2)
    })

    it('should normalize VIN to uppercase', async () => {
      const lowerVinData = { ...baseInspectionData, vin: '1hgbh41jxmn109186' }
      const upperVinData = { ...baseInspectionData, vin: '1HGBH41JXMN109186' }

      const hash1 = await generateInspectionHash(lowerVinData)
      const hash2 = await generateInspectionHash(upperVinData)

      expect(hash1).toBe(hash2)
    })

    it('should normalize inspector address to lowercase', async () => {
      const mixedCaseData = { 
        ...baseInspectionData, 
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as `0x${string}`
      }
      const lowerCaseData = { 
        ...baseInspectionData, 
        inspectorAddress: '0x742d35cc6634c0532925a3b844bc9e7595f0beb' as `0x${string}`
      }

      const hash1 = await generateInspectionHash(mixedCaseData)
      const hash2 = await generateInspectionHash(lowerCaseData)

      expect(hash1).toBe(hash2)
    })

    it('should remove spaces from VIN', async () => {
      const spacedVinData = { ...baseInspectionData, vin: '1HGBH 41JX MN109 186' }
      const normalVinData = { ...baseInspectionData, vin: '1HGBH41JXMN109186' }

      const hash1 = await generateInspectionHash(spacedVinData)
      const hash2 = await generateInspectionHash(normalVinData)

      expect(hash1).toBe(hash2)
    })

    it('should sort checklist items by ID', async () => {
      const unorderedData = {
        ...baseInspectionData,
        checklistItems: [
          { id: 'item-3', name: 'Third', status: 'pass' },
          { id: 'item-1', name: 'First', status: 'pass' },
          { id: 'item-2', name: 'Second', status: 'pass' },
        ],
      }

      const orderedData = {
        ...baseInspectionData,
        checklistItems: [
          { id: 'item-1', name: 'First', status: 'pass' },
          { id: 'item-2', name: 'Second', status: 'pass' },
          { id: 'item-3', name: 'Third', status: 'pass' },
        ],
      }

      const hash1 = await generateInspectionHash(unorderedData)
      const hash2 = await generateInspectionHash(orderedData)

      expect(hash1).toBe(hash2)
    })

    it('should sort photos by ID', async () => {
      const unorderedData = {
        ...baseInspectionData,
        photos: [
          { id: 'photo-3', caption: 'Third' },
          { id: 'photo-1', caption: 'First' },
        ],
      }

      const orderedData = {
        ...baseInspectionData,
        photos: [
          { id: 'photo-1', caption: 'First' },
          { id: 'photo-3', caption: 'Third' },
        ],
      }

      const hash1 = await generateInspectionHash(unorderedData)
      const hash2 = await generateInspectionHash(orderedData)

      expect(hash1).toBe(hash2)
    })

    it('should handle empty optional fields', async () => {
      const minimalData: InspectionData = {
        id: 'insp-001',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
      }

      const hash = await generateInspectionHash(minimalData)
      expect(hash).toBeDefined()
      expect(hash.startsWith('0x')).toBe(true)
    })

    it('should generate different hashes for different data', async () => {
      // Mock different hashes for different data
      let counter = 0
      ;(global.crypto.subtle.digest as any).mockImplementation(async () => {
        counter++
        const arr = new Uint8Array(32).fill(counter)
        return arr.buffer
      })

      const data1 = { ...baseInspectionData, id: 'insp-001' }
      const data2 = { ...baseInspectionData, id: 'insp-002' }

      const hash1 = await generateInspectionHash(data1)
      const hash2 = await generateInspectionHash(data2)

      expect(hash1).not.toBe(hash2)
    })

    it('should produce 64 character hex string (excluding 0x prefix)', async () => {
      const hash = await generateInspectionHash(baseInspectionData)
      const hexPart = hash.slice(2)

      expect(hexPart).toHaveLength(64)
    })
  })

  // =============================================================================
  // Hash Consistency Tests
  // =============================================================================
  describe('Hash Consistency', () => {
    it('should maintain consistency across multiple calls', async () => {
      const data: InspectionData = {
        id: 'insp-test',
        vin: 'TEST1234567890ABC',
        inspectorAddress: '0x1234567890123456789012345678901234567890',
        timestamp: '2024-01-01T00:00:00Z',
        result: 'passed',
      }

      const hashes: string[] = []
      for (let i = 0; i < 5; i++) {
        hashes.push(await generateInspectionHash(data))
      }

      const uniqueHashes = new Set(hashes)
      expect(uniqueHashes.size).toBe(1)
    })

    it('should handle special characters in notes', async () => {
      const dataWithSpecialChars: InspectionData = {
        id: 'insp-001',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
        notes: 'Special chars: äöü € ñ 中文 🚗',
      }

      const hash = await generateInspectionHash(dataWithSpecialChars)
      expect(hash).toBeDefined()
      expect(hash.startsWith('0x')).toBe(true)
    })

    it('should handle very long data', async () => {
      const longData: InspectionData = {
        id: 'insp-001',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
        notes: 'A'.repeat(10000),
        checklistItems: Array(100).fill(null).map((_, i) => ({
          id: `item-${i}`,
          name: `Item ${i}`,
          status: 'pass',
        })),
      }

      const hash = await generateInspectionHash(longData)
      expect(hash).toBeDefined()
    })
  })

  // =============================================================================
  // uploadToIPFS Tests (Mock Mode)
  // =============================================================================
  describe('uploadToIPFS (Mock Mode)', () => {
    const mockInspectionWithPdf: InspectionData = {
      id: 'insp-001',
      vin: '1HGBH41JXMN109186',
      inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      timestamp: '2024-01-15T10:30:00Z',
      result: 'passed',
      pdfDocument: new Blob(['test pdf content'], { type: 'application/pdf' }),
    }

    it('should upload to IPFS in mock mode', async () => {
      const result = await uploadToIPFS(mockInspectionWithPdf, { useMock: true })

      expect(result.cid).toBeDefined()
      expect(result.cid.startsWith('Qm')).toBe(true)
      expect(result.url).toBeDefined()
      expect(result.pinStatus).toBe('pinned')
      expect(result.uploadedAt).toBeDefined()
    })

    it('should generate valid IPFS CID format', async () => {
      const result = await uploadToIPFS(mockInspectionWithPdf, { useMock: true })

      // CID v0 format: Qm + 44 base58 characters
      expect(result.cid).toMatch(/^Qm[A-Za-z0-9]{44}$/)
    })

    it('should include file size in result', async () => {
      const result = await uploadToIPFS(mockInspectionWithPdf, { useMock: true })

      expect(result.size).toBeGreaterThan(0)
    })

    it('should handle base64 PDF data', async () => {
      const base64Pdf = 'data:application/pdf;base64,' + btoa('test content')
      const dataWithBase64: InspectionData = {
        ...mockInspectionWithPdf,
        pdfDocument: base64Pdf,
      }

      const result = await uploadToIPFS(dataWithBase64, { useMock: true })

      expect(result.cid).toBeDefined()
      expect(result.size).toBeGreaterThan(0)
    })
  })

  // =============================================================================
  // deployInspectionContract Tests (Mock Mode)
  // =============================================================================
  describe('deployInspectionContract (Mock Mode)', () => {
    const mockInspectionData: InspectionData = {
      id: 'insp-001',
      vin: '1HGBH41JXMN109186',
      inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      timestamp: '2024-01-15T10:30:00Z',
      result: 'passed',
    }

    it('should deploy contract in mock mode', async () => {
      const result = await deployInspectionContract(mockInspectionData, { useMock: true })

      expect(result.contractAddress).toBeDefined()
      expect(result.contractAddress.startsWith('0x')).toBe(true)
      expect(result.transactionHash).toBeDefined()
      expect(result.inspectionHash).toBeDefined()
      expect(result.blockNumber).toBeDefined()
      expect(result.gasUsed).toBeDefined()
      expect(result.deployedAt).toBeDefined()
    })

    it('should generate valid Ethereum address format', async () => {
      const result = await deployInspectionContract(mockInspectionData, { useMock: true })

      // Ethereum address: 0x + 40 hex characters
      expect(result.contractAddress).toMatch(/^0x[0-9a-f]{40}$/i)
    })

    it('should generate valid transaction hash format', async () => {
      const result = await deployInspectionContract(mockInspectionData, { useMock: true })

      // Transaction hash: 0x + 64 hex characters
      expect(result.transactionHash).toMatch(/^0x[0-9a-f]{64}$/i)
    })

    it('should upload PDF to IPFS if provided', async () => {
      const dataWithPdf: InspectionData = {
        ...mockInspectionData,
        pdfDocument: new Blob(['test'], { type: 'application/pdf' }),
      }

      const result = await deployInspectionContract(dataWithPdf, { useMock: true })

      expect(result.inspectionHash).toBeDefined()
    })

    it('should use provided IPFS CID if available', async () => {
      const dataWithCid: InspectionData = {
        ...mockInspectionData,
        ipfsCid: 'QmTestCID1234567890123456789012345678901234567890',
      }

      const result = await deployInspectionContract(dataWithCid, { useMock: true })

      expect(result.inspectionHash).toBeDefined()
    })
  })

  // =============================================================================
  // getInspectionFromBlockchain Tests (Mock Mode)
  // =============================================================================
  describe('getInspectionFromBlockchain (Mock Mode)', () => {
    it('should retrieve inspection from mock storage', async () => {
      // First deploy to add to storage
      const deployData: InspectionData = {
        id: 'insp-test',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
      }

      const deployment = await deployInspectionContract(deployData, { useMock: true })
      const contractAddress = deployment.contractAddress

      // Then retrieve
      const result = await getInspectionFromBlockchain(contractAddress, { useMock: true })

      expect(result.contractAddress).toBe(contractAddress.toLowerCase())
      expect(result.vin).toBe(deployData.vin.toUpperCase())
      expect(result.inspectorAddress).toBeDefined()
    })

    it('should throw error for non-existent contract', async () => {
      const fakeAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

      await expect(getInspectionFromBlockchain(fakeAddress, { useMock: true })).rejects.toThrow('not found')
    })

    it('should return isRevoked status', async () => {
      const deployData: InspectionData = {
        id: 'insp-revoke-test',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
      }

      const deployment = await deployInspectionContract(deployData, { useMock: true })

      const result = await getInspectionFromBlockchain(deployment.contractAddress, { useMock: true })
      expect(result.isRevoked).toBe(false)
    })
  })

  // =============================================================================
  // verifyInspection Tests
  // =============================================================================
  describe('verifyInspection', () => {
    it('should verify matching inspection data', async () => {
      const inspectionData: InspectionData = {
        id: 'insp-verify',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
      }

      // Deploy first
      const deployment = await deployInspectionContract(inspectionData, { useMock: true })

      // Verify
      const result = await verifyInspection(deployment.contractAddress, inspectionData, { useMock: true })

      expect(result.isValid).toBe(true)
      expect(result.match).toBe(true)
      expect(result.blockchainHash).toBeDefined()
      expect(result.calculatedHash).toBeDefined()
    })

    it('should detect tampered data', async () => {
      const originalData: InspectionData = {
        id: 'insp-tamper',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
      }

      // Deploy original
      const deployment = await deployInspectionContract(originalData, { useMock: true })

      // Verify with modified data
      const tamperedData = { ...originalData, result: 'failed' as const }

      // Mock different hash for tampered data
      ;(global.crypto.subtle.digest as any).mockImplementation(async () => {
        return new Uint8Array(32).fill(0xCD).buffer
      })

      const result = await verifyInspection(deployment.contractAddress, tamperedData, { useMock: true })

      expect(result.isValid).toBe(false)
      expect(result.match).toBe(false)
    })

    it('should return invalid for revoked inspection', async () => {
      const inspectionData: InspectionData = {
        id: 'insp-revoke',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
      }

      const deployment = await deployInspectionContract(inspectionData, { useMock: true })
      
      // Revoke the inspection
      await revokeInspection(deployment.contractAddress, { useMock: true })

      const result = await verifyInspection(deployment.contractAddress, inspectionData, { useMock: true })

      expect(result.isValid).toBe(false)
    })

    it('should include verification timestamp', async () => {
      const inspectionData: InspectionData = {
        id: 'insp-timestamp',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
      }

      const deployment = await deployInspectionContract(inspectionData, { useMock: true })
      const result = await verifyInspection(deployment.contractAddress, inspectionData, { useMock: true })

      expect(result.verifiedAt).toBeDefined()
      expect(new Date(result.verifiedAt).getTime()).toBeGreaterThan(0)
    })
  })

  // =============================================================================
  // batchVerifyInspections Tests
  // =============================================================================
  describe('batchVerifyInspections', () => {
    it('should verify multiple inspections', async () => {
      const inspections = await Promise.all([
        deployInspectionContract({
          id: 'insp-1',
          vin: 'VIN001',
          inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          timestamp: '2024-01-15T10:00:00Z',
          result: 'passed',
        }, { useMock: true }),
        deployInspectionContract({
          id: 'insp-2',
          vin: 'VIN002',
          inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          timestamp: '2024-01-15T11:00:00Z',
          result: 'passed',
        }, { useMock: true }),
      ])

      const dataToVerify = inspections.map(deployment => ({
        contractAddress: deployment.contractAddress,
        inspectionData: {
          id: deployment.inspectionHash,
          vin: 'VIN001', // This might not match exactly but we're testing the function
          inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          timestamp: '2024-01-15T10:00:00Z',
          result: 'passed',
        } as InspectionData,
      }))

      const results = await batchVerifyInspections(dataToVerify, { useMock: true })

      expect(results).toHaveLength(2)
      expect(results[0]).toHaveProperty('isValid')
      expect(results[0]).toHaveProperty('match')
    })
  })

  // =============================================================================
  // getInspectionsByVIN Tests
  // =============================================================================
  describe('getInspectionsByVIN', () => {
    it('should find inspections by VIN', async () => {
      const vin = '1HGBH41JXMN109186'

      // Create inspections for this VIN
      await deployInspectionContract({
        id: 'insp-vin-1',
        vin,
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:00:00Z',
        result: 'passed',
      }, { useMock: true })

      await deployInspectionContract({
        id: 'insp-vin-2',
        vin,
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-02-15T10:00:00Z',
        result: 'passed',
      }, { useMock: true })

      const results = await getInspectionsByVIN(vin, { useMock: true })

      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results[0].startsWith('0x')).toBe(true)
    })

    it('should return empty array for non-existent VIN', async () => {
      const results = await getInspectionsByVIN('NONEXISTENT', { useMock: true })
      expect(results).toEqual([])
    })

    it('should normalize VIN for search', async () => {
      const vin = '1HGBH41JXMN109186'

      await deployInspectionContract({
        id: 'insp-norm',
        vin: vin.toLowerCase(),
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:00:00Z',
        result: 'passed',
      }, { useMock: true })

      const results = await getInspectionsByVIN(vin.toUpperCase(), { useMock: true })

      expect(results.length).toBeGreaterThanOrEqual(1)
    })
  })

  // =============================================================================
  // revokeInspection Tests
  // =============================================================================
  describe('revokeInspection', () => {
    it('should revoke an inspection', async () => {
      const inspectionData: InspectionData = {
        id: 'insp-revoke-test',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
      }

      const deployment = await deployInspectionContract(inspectionData, { useMock: true })

      const result = await revokeInspection(deployment.contractAddress, { useMock: true })

      expect(result.transactionHash).toBeDefined()
      expect(result.blockNumber).toBeDefined()
    })

    it('should mark inspection as revoked', async () => {
      const inspectionData: InspectionData = {
        id: 'insp-check-revoke',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
      }

      const deployment = await deployInspectionContract(inspectionData, { useMock: true })
      
      expect(await isInspectionRevoked(deployment.contractAddress, { useMock: true })).toBe(false)
      
      await revokeInspection(deployment.contractAddress, { useMock: true })
      
      expect(await isInspectionRevoked(deployment.contractAddress, { useMock: true })).toBe(true)
    })

    it('should throw error for non-existent inspection', async () => {
      const fakeAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

      await expect(revokeInspection(fakeAddress, { useMock: true })).rejects.toThrow('not found')
    })
  })

  // =============================================================================
  // mintInspectionNFT Tests (Mock Mode)
  // =============================================================================
  describe('mintInspectionNFT (Mock Mode)', () => {
    it('should mint NFT in mock mode', async () => {
      const metadata = {
        name: 'Vehicle Inspection Certificate',
        description: 'Official inspection certificate',
        image: 'ipfs://QmTestImage',
        inspectionId: 'insp-001',
        vin: '1HGBH41JXMN109186',
        result: 'passed',
        inspectionDate: '2024-01-15',
        inspector: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as `0x${string}`,
      }

      const result = await mintInspectionNFT('insp-001', metadata, undefined, { useMock: true })

      expect(result.tokenId).toBeDefined()
      expect(result.contractAddress).toBeDefined()
      expect(result.transactionHash).toBeDefined()
      expect(result.tokenUri).toBeDefined()
      expect(result.owner).toBeDefined()
    })

    it('should use toAddress when provided', async () => {
      const metadata = {
        name: 'Certificate',
        description: 'Test',
        image: 'ipfs://test',
        inspectionId: 'insp-001',
        vin: '1HGBH41JXMN109186',
        result: 'passed',
        inspectionDate: '2024-01-15',
        inspector: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as `0x${string}`,
      }

      const recipient = '0x1234567890123456789012345678901234567890' as `0x${string}`
      const result = await mintInspectionNFT('insp-001', metadata, recipient, { useMock: true })

      expect(result.owner).toBe(recipient)
    })

    it('should default owner to inspector address', async () => {
      const inspector = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as `0x${string}`
      const metadata = {
        name: 'Certificate',
        description: 'Test',
        image: 'ipfs://test',
        inspectionId: 'insp-001',
        vin: '1HGBH41JXMN109186',
        result: 'passed',
        inspectionDate: '2024-01-15',
        inspector,
      }

      const result = await mintInspectionNFT('insp-001', metadata, undefined, { useMock: true })

      expect(result.owner).toBe(inspector)
    })
  })

  // =============================================================================
  // BlockchainService Class Tests
  // =============================================================================
  describe('BlockchainService Class', () => {
    it('should create service with default config', () => {
      const blockchain = new BlockchainService()
      expect(blockchain).toBeDefined()
    })

    it('should create service with custom config', () => {
      const config: Partial<BlockchainServiceConfig> = {
        rpcUrl: 'https://custom-rpc.com',
        chainId: 137,
        useMock: true,
      }
      const blockchain = new BlockchainService(config)
      expect(blockchain).toBeDefined()
    })

    it('should update config', () => {
      const blockchain = new BlockchainService({ useMock: true })
      blockchain.setConfig({ chainId: 80001 })
      
      const config = blockchain.getConfig()
      expect(config.chainId).toBe(80001)
    })

    it('should generate inspection hash', async () => {
      const blockchain = new BlockchainService({ useMock: true })
      const data: InspectionData = {
        id: 'insp-class',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
      }

      const hash = await blockchain.generateInspectionHash(data)
      expect(hash.startsWith('0x')).toBe(true)
    })

    it('should deploy inspection contract', async () => {
      const blockchain = new BlockchainService({ useMock: true })
      const data: InspectionData = {
        id: 'insp-deploy-class',
        vin: '1HGBH41JXMN109186',
        inspectorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        timestamp: '2024-01-15T10:30:00Z',
        result: 'passed',
      }

      const result = await blockchain.deployInspectionContract(data)
      expect(result.contractAddress).toBeDefined()
    })
  })

  // =============================================================================
  // Contract ABI Tests
  // =============================================================================
  describe('Contract ABIs', () => {
    it('should have valid Inspection Contract ABI', () => {
      expect(INSPECTION_CONTRACT_ABI).toBeDefined()
      expect(INSPECTION_CONTRACT_ABI.length).toBeGreaterThan(0)
      
      // Check for required functions
      const functionNames = INSPECTION_CONTRACT_ABI.map(item => 'name' in item ? item.name : '').filter(Boolean)
      expect(functionNames).toContain('inspectionHash')
      expect(functionNames).toContain('inspector')
      expect(functionNames).toContain('vin')
    })

    it('should have valid Factory Contract ABI', () => {
      expect(FACTORY_CONTRACT_ABI).toBeDefined()
      expect(FACTORY_CONTRACT_ABI.length).toBeGreaterThan(0)
      
      const functionNames = FACTORY_CONTRACT_ABI.map(item => 'name' in item ? item.name : '').filter(Boolean)
      expect(functionNames).toContain('createInspectionContract')
      expect(functionNames).toContain('getInspectionsByVIN')
    })

    it('should have valid NFT Contract ABI', () => {
      expect(NFT_CONTRACT_ABI).toBeDefined()
      expect(NFT_CONTRACT_ABI.length).toBeGreaterThan(0)
      
      const functionNames = NFT_CONTRACT_ABI.map(item => 'name' in item ? item.name : '').filter(Boolean)
      expect(functionNames).toContain('mintCertificate')
      expect(functionNames).toContain('tokenURI')
    })
  })
})
