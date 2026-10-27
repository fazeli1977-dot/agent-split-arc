/**
 * AgentSplit contract configuration.
 * AGENT_SPLIT_ADDRESS is set after deployment â€” update from AGENTS.md.
 */

// Replace with deployed address after running deploy:
export const AGENT_SPLIT_ADDRESS = (
  import.meta.env.VITE_AGENT_SPLIT_ADDRESS ?? '0xa0baaAc2751d95fB59566ADbf6Ca447F7745c0a4'
) as `0x${string}`

export const SETTLED_EVENT_ABI =
  'event Settled(bytes32 indexed taskId, address indexed payer, address indexed recipient, uint256 totalAmount, uint256 recipientAmount, uint256 platformFee, address treasury)'

export const AGENT_SPLIT_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_usdc', type: 'address' },
      { name: '_treasury', type: 'address' },
      { name: '_owner', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'taskId', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSettlement',
    inputs: [
      { name: 'payer', type: 'address' },
      { name: 'taskId', type: 'bytes32' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'taskId', type: 'bytes32' },
          { name: 'payer', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'totalAmount', type: 'uint256' },
          { name: 'recipientAmount', type: 'uint256' },
          { name: 'platformFee', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'setTreasury',
    inputs: [{ name: 'newTreasury', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setFeeBps',
    inputs: [{ name: 'newFeeBps', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'usdc',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'treasury',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'feeBps',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'settlements',
    inputs: [{ name: 'key', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'taskId', type: 'bytes32' },
          { name: 'payer', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'totalAmount', type: 'uint256' },
          { name: 'recipientAmount', type: 'uint256' },
          { name: 'platformFee', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'Settled',
    inputs: [
      { name: 'taskId', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
      { name: 'recipientAmount', type: 'uint256', indexed: false },
      { name: 'platformFee', type: 'uint256', indexed: false },
      { name: 'treasury', type: 'address', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TreasuryUpdated',
    inputs: [{ name: 'newTreasury', type: 'address', indexed: false }],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'FeeBpsUpdated',
    inputs: [{ name: 'newFeeBps', type: 'uint256', indexed: false }],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidAmount',
    inputs: [],
  },
  {
    type: 'error',
    name: 'FeeTooHigh',
    inputs: [
      { name: 'feeBps', type: 'uint256' },
      { name: 'maxFeeBps', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'DuplicateTaskId',
    inputs: [{ name: 'taskId', type: 'bytes32' }],
  },
] as const
