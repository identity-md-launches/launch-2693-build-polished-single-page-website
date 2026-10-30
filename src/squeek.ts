import { createClient, fallback, http, parseAbi } from 'viem';
import { getBlockNumber, readContract } from 'viem/actions';
import { sepolia } from 'viem/chains';

/** SqueekCore proxy (EIP-1967) on Sepolia. Reads go through the proxy to the current implementation. */
export const SQUEEK_CORE = '0x74665dAecA35A2303e767E76a2FF1FB6F93e119f' as const;

/** Public Sepolia RPCs, tried in order. Both answer browser requests with CORS. */
export const RPC_URLS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.gateway.tenderly.co',
] as const;

export const EXPLORER_URL = `https://sepolia.etherscan.io/address/${SQUEEK_CORE}`;

/** One Squeek block is 1e9 block units (`SqueekDifficulty.BLOCK_UNITS_PER_BLOCK`). */
export const BLOCK_UNITS_PER_BLOCK = 1_000_000_000n;

/** Auto-refresh period in milliseconds. */
export const REFRESH_MS = 15_000;

const abi = parseAbi([
  'function state() view returns ((uint64 settledThroughRound, uint64 cumulativeWork, uint96 cumulativeBlockUnits, uint64 blockHeight, uint96 blockProgress, uint32 workPerThousandBlocks, uint256 authorizationNonce, bool paused))',
  'function configuration() view returns ((bytes32 streamId, uint64 genesisTimestamp, uint64 roundDuration, uint64 maxWorkPerRound, uint16 maxRoundsPerBatch, address guardian, address reporter, uint32 initialWorkPerThousandBlocks, uint64 targetBlocksPerActiveRound, uint64 difficultySmoothingRounds, uint96 blockUnitsPerBlock))',
]);

// A bare client with only the two actions used keeps the bundle small (no wallet or signing code).
const client = createClient({
  chain: sepolia,
  transport: fallback(RPC_URLS.map((url) => http(url, { timeout: 10_000, retryCount: 1 }))),
});

export interface SqueekSnapshot {
  blockHeight: bigint;
  blockProgress: bigint;
  settledThroughRound: bigint;
  cumulativeWork: bigint;
  workPerThousandBlocks: number;
  paused: boolean;
  /** Unix seconds when the settled frontier round ended. */
  settledRoundEnd: number;
  /** Ethereum block the snapshot was read at. */
  readAtBlock: bigint;
}

interface Timing {
  genesisTimestamp: bigint;
  roundDuration: bigint;
}

let timing: Timing | undefined;

async function readTiming(blockNumber: bigint): Promise<Timing> {
  if (timing) return timing;
  const config = await readContract(client, {
    address: SQUEEK_CORE,
    abi,
    functionName: 'configuration',
    blockNumber,
  });
  timing = { genesisTimestamp: config.genesisTimestamp, roundDuration: config.roundDuration };
  return timing;
}

/** Reads the ledger state and the round timing at one Ethereum block, so every value agrees. */
export async function readSnapshot(): Promise<SqueekSnapshot> {
  const blockNumber = await getBlockNumber(client, { cacheTime: 0 });
  const [state, t] = await Promise.all([
    readContract(client, { address: SQUEEK_CORE, abi, functionName: 'state', blockNumber }),
    readTiming(blockNumber),
  ]);
  // Round r covers [genesis + (r - 1) * duration, genesis + r * duration).
  const settledRoundEnd = Number(t.genesisTimestamp + state.settledThroughRound * t.roundDuration);
  return {
    blockHeight: state.blockHeight,
    blockProgress: state.blockProgress,
    settledThroughRound: state.settledThroughRound,
    cumulativeWork: state.cumulativeWork,
    workPerThousandBlocks: state.workPerThousandBlocks,
    paused: state.paused,
    settledRoundEnd,
    readAtBlock: blockNumber,
  };
}

/** Progress inside the current block as a fraction from 0 to 1. */
export function progressFraction(snapshot: SqueekSnapshot): number {
  return Number(snapshot.blockProgress) / Number(BLOCK_UNITS_PER_BLOCK);
}

/**
 * Work units (wheel passes) still needed to finish the current block at today's difficulty.
 * A round earns floor(work * 1e12 / difficulty) block units, so this is an estimate: difficulty
 * steers after every active round.
 */
export function passesToNextBlock(snapshot: SqueekSnapshot): bigint {
  const remaining = BLOCK_UNITS_PER_BLOCK - snapshot.blockProgress;
  const difficulty = BigInt(snapshot.workPerThousandBlocks);
  const scale = 1_000_000_000_000n;
  return (remaining * difficulty + scale - 1n) / scale;
}
