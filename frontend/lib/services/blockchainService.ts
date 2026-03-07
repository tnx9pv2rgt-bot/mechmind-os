/**
 * Blockchain Service for Inspection Certificate Verification
 * 
 * This service provides blockchain-based verification for vehicle inspection
 * certificates using Polygon (Matic) network. It includes functionality for:
 * - Deploying inspection smart contracts
 * - Verifying inspection data integrity
 * - Uploading documents to IPFS
 * - Minting NFT certificates (optional)
 * 
 * @module blockchainService
 * @version 1.0.0
 */

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * Inspection data structure for blockchain storage
 */
export interface InspectionData {
  /** Unique inspection identifier */
  id: string;
  /** Vehicle Identification Number */
  vin: string;
  /** Inspector wallet address */
  inspectorAddress: `0x${string}`;
  /** Inspection timestamp (ISO string) */
  timestamp: string;
  /** Inspection result/status */
  result: 'passed' | 'failed' | 'pending';
  /** Inspection notes/details */
  notes?: string;
  /** Vehicle mileage at inspection */
  mileage?: number;
  /** Inspection location */
  location?: string;
  /** Array of checklist items */
  checklistItems?: ChecklistItem[];
  /** Photos array with metadata */
  photos?: InspectionPhoto[];
  /** PDF document data (base64 or blob) */
  pdfDocument?: string | Blob;
  /** IPFS CID for the PDF document */
  ipfsCid?: string;
}

/**
 * Individual checklist item for inspection
 */
export interface ChecklistItem {
  /** Item identifier */
  id: string;
  /** Item name/description */
  name: string;
  /** Item status */
  status: 'pass' | 'fail' | 'na';
  /** Additional notes */
  notes?: string;
}

/**
 * Inspection photo metadata
 */
export interface InspectionPhoto {
  /** Photo identifier */
  id: string;
  /** Photo caption/description */
  caption: string;
  /** IPFS CID for the photo */
  ipfsCid?: string;
  /** Base64 photo data (for initial upload) */
  data?: string;
  /** Timestamp when photo was taken */
  takenAt?: string;
}

/**
 * Result of deploying an inspection contract
 */
export interface DeploymentResult {
  /** Deployed contract address */
  contractAddress: `0x${string}`;
  /** Transaction hash */
  transactionHash: `0x${string}`;
  /** Block number where contract was deployed */
  blockNumber: bigint;
  /** Gas used for deployment */
  gasUsed: bigint;
  /** Inspection hash stored in contract */
  inspectionHash: `0x${string}`;
  /** Timestamp of deployment */
  deployedAt: string;
}

/**
 * Result of verifying inspection data against blockchain
 */
export interface VerificationResult {
  /** Whether the inspection data is valid */
  isValid: boolean;
  /** Hash stored on blockchain */
  blockchainHash: `0x${string}`;
  /** Hash calculated from current data */
  calculatedHash: `0x${string}`;
  /** Whether hashes match */
  match: boolean;
  /** Contract address verified */
  contractAddress: `0x${string}`;
  /** Original inspector address */
  inspectorAddress?: `0x${string}`;
  /** Original timestamp */
  timestamp?: string;
  /** Verification timestamp */
  verifiedAt: string;
}

/**
 * Inspection data retrieved from blockchain
 */
export interface BlockchainInspection {
  /** Contract address */
  contractAddress: `0x${string}`;
  /** Inspection hash */
  inspectionHash: `0x${string}`;
  /** Inspector address */
  inspectorAddress: `0x${string}`;
  /** Vehicle VIN */
  vin: string;
  /** Timestamp of inspection */
  timestamp: bigint;
  /** Whether inspection is revoked */
  isRevoked: boolean;
  /** IPFS CID for additional data */
  ipfsCid?: string;
  /** Block number when created */
  blockNumber: bigint;
  /** Transaction hash */
  transactionHash: `0x${string}`;
}

/**
 * IPFS upload result
 */
export interface IPFSUploadResult {
  /** IPFS Content Identifier */
  cid: string;
  /** IPFS gateway URL */
  url: string;
  /** File size in bytes */
  size: number;
  /** Upload timestamp */
  uploadedAt: string;
  /** Pin status */
  pinStatus: 'pinned' | 'pinning' | 'failed';
}

/**
 * NFT minting result
 */
export interface NFTMintResult {
  /** Token ID of minted NFT */
  tokenId: bigint;
  /** Contract address */
  contractAddress: `0x${string}`;
  /** Transaction hash */
  transactionHash: `0x${string}`;
  /** Token URI (metadata location) */
  tokenUri: string;
  /** Owner address */
  owner: `0x${string}`;
  /** Block number */
  blockNumber: bigint;
}

/**
 * NFT metadata structure
 */
export interface NFTMetadata {
  /** NFT name */
  name: string;
  /** NFT description */
  description: string;
  /** Image URL or IPFS CID */
  image: string;
  /** Inspection ID reference */
  inspectionId: string;
  /** Vehicle VIN */
  vin: string;
  /** Inspection result */
  result: string;
  /** Inspection date */
  inspectionDate: string;
  /** Inspector address */
  inspector: `0x${string}`;
  /** Additional attributes */
  attributes?: NFTAttribute[];
}

/**
 * NFT attribute for metadata
 */
export interface NFTAttribute {
  /** Attribute name */
  trait_type: string;
  /** Attribute value */
  value: string | number;
  /** Display type (optional) */
  display_type?: 'number' | 'date' | 'boost_percentage' | 'boost_number';
}

/**
 * Service configuration options
 */
export interface BlockchainServiceConfig {
  /** RPC URL for Polygon network */
  rpcUrl: string;
  /** Chain ID (137 for Polygon Mainnet, 80001 for Mumbai Testnet) */
  chainId: number;
  /** Factory contract address for deploying inspection contracts */
  factoryContractAddress?: `0x${string}`;
  /** NFT contract address */
  nftContractAddress?: `0x${string}`;
  /** IPFS API endpoint */
  ipfsApiUrl: string;
  /** IPFS gateway URL */
  ipfsGatewayUrl: string;
  /** Whether to use mock implementation */
  useMock?: boolean;
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  /** Gas limit override */
  gasLimit?: bigint;
  /** Max fee per gas */
  maxFeePerGas?: bigint;
  /** Max priority fee per gas */
  maxPriorityFeePerGas?: bigint;
  /** Transaction value */
  value?: bigint;
}

// =============================================================================
// SMART CONTRACT ABIS
// =============================================================================

/**
 * Inspection Contract ABI - Simplified version for type safety
 * In production, import the full ABI from your compiled contract
 */
export const INSPECTION_CONTRACT_ABI = [
  {
    inputs: [
      { name: '_inspectionHash', type: 'bytes32' },
      { name: '_inspector', type: 'address' },
      { name: '_vin', type: 'string' },
      { name: '_timestamp', type: 'uint256' },
      { name: '_ipfsCid', type: 'string' }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'inspectionHash',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'inspector',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'vin',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'timestamp',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'ipfsCid',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'isRevoked',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'revoke',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

/**
 * Factory Contract ABI for deploying inspection contracts
 */
export const FACTORY_CONTRACT_ABI = [
  {
    inputs: [
      { name: '_inspectionHash', type: 'bytes32' },
      { name: '_vin', type: 'string' },
      { name: '_timestamp', type: 'uint256' },
      { name: '_ipfsCid', type: 'string' }
    ],
    name: 'createInspectionContract',
    outputs: [{ name: 'contractAddress', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_vin', type: 'string' }],
    name: 'getInspectionsByVIN',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getAllInspections',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

/**
 * NFT Contract ABI for minting inspection certificates
 */
export const NFT_CONTRACT_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'uri', type: 'string' }
    ],
    name: 'mintCertificate',
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: BlockchainServiceConfig = {
  rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
  chainId: Number(process.env.NEXT_PUBLIC_POLYGON_CHAIN_ID) || 137,
  factoryContractAddress: (process.env.NEXT_PUBLIC_INSPECTION_FACTORY_ADDRESS as `0x${string}`) || undefined,
  nftContractAddress: (process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}`) || undefined,
  ipfsApiUrl: process.env.NEXT_PUBLIC_IPFS_API_URL || 'https://api.pinata.cloud/pinning/pinFileToIPFS',
  ipfsGatewayUrl: process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs',
  useMock: process.env.NEXT_PUBLIC_USE_MOCK_BLOCKCHAIN === 'true' || true
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Normalize VIN for consistent hashing
 * Removes spaces, converts to uppercase
 */
function normalizeVIN(vin: string): string {
  return vin.replace(/\s/g, '').toUpperCase();
}

/**
 * Serialize inspection data for consistent hashing
 * Ensures deterministic hash generation
 */
function serializeInspectionData(inspection: InspectionData): string {
  const data = {
    id: inspection.id,
    vin: normalizeVIN(inspection.vin),
    inspectorAddress: inspection.inspectorAddress.toLowerCase(),
    timestamp: inspection.timestamp,
    result: inspection.result,
    notes: inspection.notes || '',
    mileage: inspection.mileage || 0,
    location: inspection.location || '',
    checklistItems: (inspection.checklistItems || [])
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(item => ({
        id: item.id,
        name: item.name,
        status: item.status,
        notes: item.notes || ''
      })),
    photos: (inspection.photos || [])
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(photo => ({
        id: photo.id,
        caption: photo.caption,
        takenAt: photo.takenAt || ''
      }))
  };
  
  return JSON.stringify(data, Object.keys(data).sort());
}

// =============================================================================
// MOCK IMPLEMENTATION
// =============================================================================

/**
 * Mock blockchain storage for development/testing
 */
const mockBlockchainStorage = new Map<string, BlockchainInspection>();
const mockNFTStorage = new Map<string, NFTMintResult>();
let mockContractCounter = 0;
let mockTokenCounter = 0;

/**
 * Generate mock contract address
 */
function generateMockAddress(): `0x${string}` {
  mockContractCounter++;
  return `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}` as `0x${string}`;
}

/**
 * Generate mock transaction hash
 */
function generateMockTxHash(): `0x${string}` {
  return `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}` as `0x${string}`;
}

// =============================================================================
// CORE SERVICE FUNCTIONS
// =============================================================================

/**
 * Generates a SHA256 hash of inspection data
 * 
 * This function creates a deterministic hash of the inspection data
 * that can be stored on the blockchain for later verification.
 * 
 * @param inspection - The inspection data to hash
 * @returns The SHA256 hash as a hex string (0x...)
 * 
 * @example
 * ```typescript
 * const hash = generateInspectionHash({
 *   id: 'insp-001',
 *   vin: '1HGBH41JXMN109186',
 *   inspectorAddress: '0x...',
 *   timestamp: '2024-01-15T10:30:00Z',
 *   result: 'passed'
 * });
 * // Returns: '0x...'
 * ```
 */
export async function generateInspectionHash(
  inspection: InspectionData
): Promise<`0x${string}`> {
  const serialized = serializeInspectionData(inspection);
  
  // Use Web Crypto API for SHA256 hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(serialized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `0x${hashHex}` as `0x${string}`;
}

/**
 * Uploads inspection PDF to IPFS
 * 
 * Uploads the inspection document to IPFS for decentralized storage.
 * Returns the IPFS Content Identifier (CID) that can be stored on-chain.
 * 
 * @param inspectionData - The inspection data containing the PDF
 * @param options - Optional configuration overrides
 * @returns IPFS upload result with CID and URL
 * 
 * @example
 * ```typescript
 * const result = await uploadToIPFS({
 *   id: 'insp-001',
 *   pdfDocument: pdfBlob,
 *   // ... other fields
 * });
 * console.log(result.cid); // 'Qm...'
 * ```
 */
export async function uploadToIPFS(
  inspectionData: InspectionData,
  options?: Partial<BlockchainServiceConfig>
): Promise<IPFSUploadResult> {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  if (config.useMock) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockCid = `Qm${Array(44).fill(0).map(() => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('')}`;
    
    return {
      cid: mockCid,
      url: `${config.ipfsGatewayUrl}/${mockCid}`,
      size: inspectionData.pdfDocument instanceof Blob 
        ? inspectionData.pdfDocument.size 
        : (inspectionData.pdfDocument?.length || 0) * 0.75, // Approximate base64 size
      uploadedAt: new Date().toISOString(),
      pinStatus: 'pinned'
    };
  }
  
  // Real implementation using Pinata or similar IPFS service
  if (!inspectionData.pdfDocument) {
    throw new Error('No PDF document provided for IPFS upload');
  }
  
  const formData = new FormData();
  
  if (inspectionData.pdfDocument instanceof Blob) {
    formData.append('file', inspectionData.pdfDocument, `inspection-${inspectionData.id}.pdf`);
  } else {
    // Convert base64 to blob
    const byteCharacters = atob(inspectionData.pdfDocument.split(',')[1] || inspectionData.pdfDocument);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    formData.append('file', blob, `inspection-${inspectionData.id}.pdf`);
  }
  
  // Add metadata
  formData.append('pinataMetadata', JSON.stringify({
    name: `Inspection-${inspectionData.id}`,
    keyvalues: {
      vin: inspectionData.vin,
      inspector: inspectionData.inspectorAddress,
      result: inspectionData.result
    }
  }));
  
  const response = await fetch(config.ipfsApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PINATA_JWT_TOKEN || ''}`
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  return {
    cid: result.IpfsHash,
    url: `${config.ipfsGatewayUrl}/${result.IpfsHash}`,
    size: result.PinSize,
    uploadedAt: new Date().toISOString(),
    pinStatus: 'pinned'
  };
}

/**
 * Deploys an inspection smart contract to the blockchain
 * 
 * Creates a new smart contract on Polygon that stores the inspection
 * hash, inspector address, VIN, and timestamp immutably.
 * 
 * @param inspectionData - The inspection data to store on-chain
 * @param options - Optional transaction and configuration options
 * @returns Deployment result with contract address and transaction hash
 * 
 * @example
 * ```typescript
 * const result = await deployInspectionContract({
 *   id: 'insp-001',
 *   vin: '1HGBH41JXMN109186',
 *   inspectorAddress: '0x...',
 *   timestamp: '2024-01-15T10:30:00Z',
 *   result: 'passed',
 *   pdfDocument: pdfBlob
 * });
 * console.log(result.contractAddress); // '0x...'
 * ```
 */
export async function deployInspectionContract(
  inspectionData: InspectionData,
  options?: TransactionOptions & Partial<BlockchainServiceConfig>
): Promise<DeploymentResult> {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  // Generate inspection hash
  const inspectionHash = await generateInspectionHash(inspectionData);
  
  // Upload PDF to IPFS if provided
  let ipfsCid = inspectionData.ipfsCid || '';
  if (inspectionData.pdfDocument && !ipfsCid) {
    const ipfsResult = await uploadToIPFS(inspectionData, config);
    ipfsCid = ipfsResult.cid;
  }
  
  if (config.useMock) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const contractAddress = generateMockAddress();
    const transactionHash = generateMockTxHash();
    const blockNumber = BigInt(Math.floor(Date.now() / 1000));
    
    const deployment: BlockchainInspection = {
      contractAddress,
      inspectionHash,
      inspectorAddress: inspectionData.inspectorAddress,
      vin: normalizeVIN(inspectionData.vin),
      timestamp: BigInt(new Date(inspectionData.timestamp).getTime()),
      isRevoked: false,
      ipfsCid,
      blockNumber,
      transactionHash
    };
    
    mockBlockchainStorage.set(contractAddress.toLowerCase(), deployment);
    
    return {
      contractAddress,
      transactionHash,
      blockNumber,
      gasUsed: BigInt(150000 + Math.floor(Math.random() * 50000)),
      inspectionHash,
      deployedAt: new Date().toISOString()
    };
  }
  
  // Real implementation using viem
  // Note: This requires wallet connection and signing
  const { createWalletClient, custom, http, createPublicClient } = await import('viem');
  const { polygon, polygonMumbai } = await import('viem/chains');
  
  const chain = config.chainId === 137 ? polygon : polygonMumbai;
  
  // Check if window.ethereum is available
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('Ethereum provider not found. Please install MetaMask or similar wallet.');
  }
  
  const walletClient = createWalletClient({
    chain,
    transport: custom((window as any).ethereum)
  });
  
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl)
  });
  
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected. Please connect your wallet.');
  }
  
  if (!config.factoryContractAddress) {
    throw new Error('Factory contract address not configured');
  }
  
  // Deploy contract through factory
  const txHash = await walletClient.writeContract({
    address: config.factoryContractAddress,
    abi: FACTORY_CONTRACT_ABI,
    functionName: 'createInspectionContract',
    args: [
      inspectionHash,
      normalizeVIN(inspectionData.vin),
      BigInt(new Date(inspectionData.timestamp).getTime()),
      ipfsCid
    ],
    account,
    gas: options?.gasLimit,
    maxFeePerGas: options?.maxFeePerGas,
    maxPriorityFeePerGas: options?.maxPriorityFeePerGas
  });
  
  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  if (receipt.status !== 'success') {
    throw new Error('Contract deployment failed');
  }
  
  // Extract contract address from event logs
  // The factory emits an event with the new contract address
  const contractAddress = receipt.logs[0]?.address as `0x${string}`;
  
  return {
    contractAddress,
    transactionHash: txHash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
    inspectionHash,
    deployedAt: new Date().toISOString()
  };
}

/**
 * Retrieves inspection data from the blockchain
 * 
 * Fetches the stored inspection hash and metadata from a deployed
 * smart contract.
 * 
 * @param contractAddress - The address of the deployed inspection contract
 * @param options - Optional configuration overrides
 * @returns The inspection data stored on the blockchain
 * 
 * @example
 * ```typescript
 * const inspection = await getInspectionFromBlockchain('0x...');
 * console.log(inspection.vin); // '1HGBH41JXMN109186'
 * console.log(inspection.inspectionHash); // '0x...'
 * ```
 */
export async function getInspectionFromBlockchain(
  contractAddress: `0x${string}`,
  options?: Partial<BlockchainServiceConfig>
): Promise<BlockchainInspection> {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  if (config.useMock) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const normalizedAddress = contractAddress.toLowerCase() as `0x${string}`;
    const inspection = mockBlockchainStorage.get(normalizedAddress);
    
    if (!inspection) {
      throw new Error(`Inspection contract not found: ${contractAddress}`);
    }
    
    return inspection;
  }
  
  // Real implementation using viem
  const { createPublicClient, http } = await import('viem');
  const { polygon, polygonMumbai } = await import('viem/chains');
  
  const chain = config.chainId === 137 ? polygon : polygonMumbai;
  
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl)
  });
  
  // Fetch all contract data in parallel
  const [
    inspectionHash,
    inspectorAddress,
    vin,
    timestamp,
    isRevoked,
    ipfsCid
  ] = await Promise.all([
    publicClient.readContract({
      address: contractAddress,
      abi: INSPECTION_CONTRACT_ABI,
      functionName: 'inspectionHash'
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: INSPECTION_CONTRACT_ABI,
      functionName: 'inspector'
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: INSPECTION_CONTRACT_ABI,
      functionName: 'vin'
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: INSPECTION_CONTRACT_ABI,
      functionName: 'timestamp'
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: INSPECTION_CONTRACT_ABI,
      functionName: 'isRevoked'
    }),
    publicClient.readContract({
      address: contractAddress,
      abi: INSPECTION_CONTRACT_ABI,
      functionName: 'ipfsCid'
    }).catch(() => '') // IPFS CID might be empty
  ]);
  
  // Get transaction info from contract creation
  const bytecode = await publicClient.getBytecode({ address: contractAddress });
  if (!bytecode || bytecode === '0x') {
    throw new Error(`No contract found at address: ${contractAddress}`);
  }
  
  // Note: In a real implementation, you'd store the tx hash during deployment
  // or query for the contract creation transaction
  return {
    contractAddress,
    inspectionHash,
    inspectorAddress,
    vin,
    timestamp,
    isRevoked,
    ipfsCid: ipfsCid || undefined,
    blockNumber: BigInt(0), // Would need to query from deployment
    transactionHash: '0x0' as `0x${string}` // Would need to query from deployment
  };
}

/**
 * Verifies inspection data against blockchain record
 * 
 * Compares the hash of current inspection data with the hash stored
 * on the blockchain to verify data integrity.
 * 
 * @param contractAddress - The address of the deployed inspection contract
 * @param inspectionData - The current inspection data to verify
 * @param options - Optional configuration overrides
 * @returns Verification result with match status and hashes
 * 
 * @example
 * ```typescript
 * const result = await verifyInspection('0x...', {
 *   id: 'insp-001',
 *   vin: '1HGBH41JXMN109186',
 *   // ... current data
 * });
 * 
 * if (result.isValid && result.match) {
 *   console.log('Inspection verified!');
 * } else {
 *   console.log('Inspection data has been tampered with');
 * }
 * ```
 */
export async function verifyInspection(
  contractAddress: `0x${string}`,
  inspectionData: InspectionData,
  options?: Partial<BlockchainServiceConfig>
): Promise<VerificationResult> {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  // Get stored inspection from blockchain
  const blockchainInspection = await getInspectionFromBlockchain(contractAddress, config);
  
  // Calculate hash of current data
  const calculatedHash = await generateInspectionHash(inspectionData);
  
  // Compare hashes
  const match = blockchainInspection.inspectionHash.toLowerCase() === calculatedHash.toLowerCase();
  
  return {
    isValid: !blockchainInspection.isRevoked && match,
    blockchainHash: blockchainInspection.inspectionHash,
    calculatedHash,
    match,
    contractAddress,
    inspectorAddress: blockchainInspection.inspectorAddress,
    timestamp: new Date(Number(blockchainInspection.timestamp)).toISOString(),
    verifiedAt: new Date().toISOString()
  };
}

/**
 * Mints an NFT certificate for an inspection
 * 
 * Creates a unique NFT representing the inspection certificate.
 * This can be used for premium verification features or customer
 * loyalty programs.
 * 
 * @param inspectionId - The ID of the inspection
 * @param metadata - NFT metadata including image and attributes
 * @param toAddress - Address to mint the NFT to (defaults to inspector)
 * @param options - Optional transaction and configuration options
 * @returns NFT minting result with token ID
 * 
 * @example
 * ```typescript
 * const result = await mintInspectionNFT(
 *   'insp-001',
 *   {
 *     name: 'Vehicle Inspection Certificate',
 *     description: 'Official inspection for VIN 1HGBH41JXMN109186',
 *     image: 'ipfs://Qm...',
 *     inspectionId: 'insp-001',
 *     vin: '1HGBH41JXMN109186',
 *     result: 'passed',
 *     inspectionDate: '2024-01-15',
 *     inspector: '0x...',
 *     attributes: [
 *       { trait_type: 'Mileage', value: 50000, display_type: 'number' },
 *       { trait_type: 'Result', value: 'Passed' }
 *     ]
 *   },
 *   '0x...' // Customer wallet address
 * );
 * 
 * console.log(result.tokenId); // 123n
 * ```
 */
export async function mintInspectionNFT(
  inspectionId: string,
  metadata: NFTMetadata,
  toAddress?: `0x${string}`,
  options?: TransactionOptions & Partial<BlockchainServiceConfig>
): Promise<NFTMintResult> {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  if (config.useMock) {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    mockTokenCounter++;
    const tokenId = BigInt(mockTokenCounter);
    const contractAddress = generateMockAddress();
    const transactionHash = generateMockTxHash();
    const tokenUri = `ipfs://QmMetadata${mockTokenCounter}`;
    const owner = toAddress || metadata.inspector;
    
    const result: NFTMintResult = {
      tokenId,
      contractAddress,
      transactionHash,
      tokenUri,
      owner,
      blockNumber: BigInt(Math.floor(Date.now() / 1000))
    };
    
    mockNFTStorage.set(`${contractAddress}-${tokenId}`, result);
    
    return result;
  }
  
  // Real implementation using viem
  const { createWalletClient, custom, http, createPublicClient } = await import('viem');
  const { polygon, polygonMumbai } = await import('viem/chains');
  
  const chain = config.chainId === 137 ? polygon : polygonMumbai;
  
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('Ethereum provider not found');
  }
  
  const walletClient = createWalletClient({
    chain,
    transport: custom((window as any).ethereum)
  });
  
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl)
  });
  
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }
  
  if (!config.nftContractAddress) {
    throw new Error('NFT contract address not configured');
  }
  
  // Upload metadata to IPFS
  const metadataJson = JSON.stringify(metadata);
  const metadataBlob = new Blob([metadataJson], { type: 'application/json' });
  const metadataFormData = new FormData();
  metadataFormData.append('file', metadataBlob, `metadata-${inspectionId}.json`);
  
  const ipfsResponse = await fetch(config.ipfsApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PINATA_JWT_TOKEN || ''}`
    },
    body: metadataFormData
  });
  
  if (!ipfsResponse.ok) {
    throw new Error('Failed to upload NFT metadata to IPFS');
  }
  
  const ipfsResult = await ipfsResponse.json();
  const tokenUri = `ipfs://${ipfsResult.IpfsHash}`;
  
  const recipient = toAddress || metadata.inspector;
  
  // Mint NFT
  const txHash = await walletClient.writeContract({
    address: config.nftContractAddress,
    abi: NFT_CONTRACT_ABI,
    functionName: 'mintCertificate',
    args: [recipient, tokenUri],
    account,
    gas: options?.gasLimit,
    maxFeePerGas: options?.maxFeePerGas,
    maxPriorityFeePerGas: options?.maxPriorityFeePerGas
  });
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  if (receipt.status !== 'success') {
    throw new Error('NFT minting failed');
  }
  
  // Extract token ID from event logs
  // The NFT contract emits a Transfer event with the new token ID
  const tokenId = BigInt(receipt.logs[0]?.topics[3] || '0');
  
  return {
    tokenId,
    contractAddress: config.nftContractAddress,
    transactionHash: txHash,
    tokenUri,
    owner: recipient,
    blockNumber: receipt.blockNumber
  };
}

// =============================================================================
// ADDITIONAL UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets all inspection contracts for a specific VIN
 * 
 * @param vin - Vehicle Identification Number
 * @param options - Optional configuration overrides
 * @returns Array of contract addresses
 */
export async function getInspectionsByVIN(
  vin: string,
  options?: Partial<BlockchainServiceConfig>
): Promise<`0x${string}`[]> {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  if (config.useMock) {
    const normalizedVIN = normalizeVIN(vin);
    const results: `0x${string}`[] = [];
    
    for (const [address, inspection] of mockBlockchainStorage.entries()) {
      if (inspection.vin === normalizedVIN) {
        results.push(address as `0x${string}`);
      }
    }
    
    return results;
  }
  
  // Real implementation
  const { createPublicClient, http } = await import('viem');
  const { polygon, polygonMumbai } = await import('viem/chains');
  
  const chain = config.chainId === 137 ? polygon : polygonMumbai;
  
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl)
  });
  
  if (!config.factoryContractAddress) {
    throw new Error('Factory contract address not configured');
  }
  
  const addresses = await publicClient.readContract({
    address: config.factoryContractAddress,
    abi: FACTORY_CONTRACT_ABI,
    functionName: 'getInspectionsByVIN',
    args: [normalizeVIN(vin)]
  });
  
  return addresses;
}

/**
 * Revokes an inspection certificate (inspector only)
 * 
 * @param contractAddress - Address of the inspection contract
 * @param options - Optional transaction options
 */
export async function revokeInspection(
  contractAddress: `0x${string}`,
  options?: TransactionOptions & Partial<BlockchainServiceConfig>
): Promise<{ transactionHash: `0x${string}`; blockNumber: bigint }> {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  if (config.useMock) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const inspection = mockBlockchainStorage.get(contractAddress.toLowerCase());
    if (!inspection) {
      throw new Error('Inspection not found');
    }
    
    inspection.isRevoked = true;
    mockBlockchainStorage.set(contractAddress.toLowerCase(), inspection);
    
    return {
      transactionHash: generateMockTxHash(),
      blockNumber: BigInt(Math.floor(Date.now() / 1000))
    };
  }
  
  const { createWalletClient, custom, http, createPublicClient } = await import('viem');
  const { polygon, polygonMumbai } = await import('viem/chains');
  
  const chain = config.chainId === 137 ? polygon : polygonMumbai;
  
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('Ethereum provider not found');
  }
  
  const walletClient = createWalletClient({
    chain,
    transport: custom((window as any).ethereum)
  });
  
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl)
  });
  
  const [account] = await walletClient.getAddresses();
  
  if (!account) {
    throw new Error('No account connected');
  }
  
  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: INSPECTION_CONTRACT_ABI,
    functionName: 'revoke',
    account,
    gas: options?.gasLimit,
    maxFeePerGas: options?.maxFeePerGas,
    maxPriorityFeePerGas: options?.maxPriorityFeePerGas
  });
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  
  if (receipt.status !== 'success') {
    throw new Error('Revocation failed');
  }
  
  return {
    transactionHash: txHash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * Checks if an inspection has been revoked
 * 
 * @param contractAddress - Address of the inspection contract
 * @param options - Optional configuration overrides
 * @returns Whether the inspection is revoked
 */
export async function isInspectionRevoked(
  contractAddress: `0x${string}`,
  options?: Partial<BlockchainServiceConfig>
): Promise<boolean> {
  const inspection = await getInspectionFromBlockchain(contractAddress, options);
  return inspection.isRevoked;
}

/**
 * Batch verify multiple inspections
 * 
 * @param inspections - Array of {contractAddress, inspectionData} objects
 * @param options - Optional configuration overrides
 * @returns Array of verification results
 */
export async function batchVerifyInspections(
  inspections: Array<{
    contractAddress: `0x${string}`;
    inspectionData: InspectionData;
  }>,
  options?: Partial<BlockchainServiceConfig>
): Promise<VerificationResult[]> {
  return Promise.all(
    inspections.map(({ contractAddress, inspectionData }) =>
      verifyInspection(contractAddress, inspectionData, options)
    )
  );
}

// =============================================================================
// SERVICE CLASS (Alternative API)
// =============================================================================

/**
 * BlockchainService class for object-oriented usage
 * 
 * Provides the same functionality as the standalone functions
 * but encapsulated in a class with persistent configuration.
 * 
 * @example
 * ```typescript
 * const blockchain = new BlockchainService({
 *   rpcUrl: 'https://polygon-rpc.com',
 *   chainId: 137,
 *   factoryContractAddress: '0x...',
 *   useMock: false
 * });
 * 
 * const result = await blockchain.deployInspectionContract(inspectionData);
 * ```
 */
export class BlockchainService {
  private config: BlockchainServiceConfig;
  
  constructor(config?: Partial<BlockchainServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Update service configuration
   */
  setConfig(config: Partial<BlockchainServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): BlockchainServiceConfig {
    return { ...this.config };
  }
  
  /**
   * Generate inspection hash
   */
  async generateInspectionHash(inspection: InspectionData): Promise<`0x${string}`> {
    return generateInspectionHash(inspection);
  }
  
  /**
   * Upload to IPFS
   */
  async uploadToIPFS(inspectionData: InspectionData): Promise<IPFSUploadResult> {
    return uploadToIPFS(inspectionData, this.config);
  }
  
  /**
   * Deploy inspection contract
   */
  async deployInspectionContract(
    inspectionData: InspectionData,
    options?: TransactionOptions
  ): Promise<DeploymentResult> {
    return deployInspectionContract(inspectionData, { ...this.config, ...options });
  }
  
  /**
   * Get inspection from blockchain
   */
  async getInspectionFromBlockchain(contractAddress: `0x${string}`): Promise<BlockchainInspection> {
    return getInspectionFromBlockchain(contractAddress, this.config);
  }
  
  /**
   * Verify inspection
   */
  async verifyInspection(
    contractAddress: `0x${string}`,
    inspectionData: InspectionData
  ): Promise<VerificationResult> {
    return verifyInspection(contractAddress, inspectionData, this.config);
  }
  
  /**
   * Mint NFT certificate
   */
  async mintInspectionNFT(
    inspectionId: string,
    metadata: NFTMetadata,
    toAddress?: `0x${string}`,
    options?: TransactionOptions
  ): Promise<NFTMintResult> {
    return mintInspectionNFT(inspectionId, metadata, toAddress, { ...this.config, ...options });
  }
  
  /**
   * Get inspections by VIN
   */
  async getInspectionsByVIN(vin: string): Promise<`0x${string}`[]> {
    return getInspectionsByVIN(vin, this.config);
  }
  
  /**
   * Revoke inspection
   */
  async revokeInspection(
    contractAddress: `0x${string}`,
    options?: TransactionOptions
  ): Promise<{ transactionHash: `0x${string}`; blockNumber: bigint }> {
    return revokeInspection(contractAddress, { ...this.config, ...options });
  }
  
  /**
   * Check if inspection is revoked
   */
  async isInspectionRevoked(contractAddress: `0x${string}`): Promise<boolean> {
    return isInspectionRevoked(contractAddress, this.config);
  }
  
  /**
   * Batch verify inspections
   */
  async batchVerifyInspections(
    inspections: Array<{
      contractAddress: `0x${string}`;
      inspectionData: InspectionData;
    }>
  ): Promise<VerificationResult[]> {
    return batchVerifyInspections(inspections, this.config);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
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
  BlockchainService
};

// Re-export types
export type {
  InspectionData,
  ChecklistItem,
  InspectionPhoto,
  DeploymentResult,
  VerificationResult,
  BlockchainInspection,
  IPFSUploadResult,
  NFTMintResult,
  NFTMetadata,
  NFTAttribute,
  BlockchainServiceConfig,
  TransactionOptions
};
