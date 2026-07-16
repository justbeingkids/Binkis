export type CodeStatus = "available" | "claimed" | "non-winner";

export interface CodeRecord {
  code: string;
  isWinner: boolean;
  generatedAt: string;
  claimed: boolean;
  claimedAt: string | null;
  winnerName: string | null;
  winnerEmail: string | null;
  winnerPhone: string | null;
  winnerAddress: string | null;
  characterName?: string | null;
}

export interface CodeMetrics {
  totalGenerated: number;
  totalWinners: number;
  totalClaimed: number;
  totalAvailable: number;
  claimRate: number;
  latestGeneratedAt: string | null;
}

export interface GenerateBatchResult {
  generated: number;
  totalAfter: number;
  codes: string[];
}

export interface ValidationResult {
  state: "valid" | "claimed" | "invalid";
  code: string;
  claimedAt?: string | null;
}

export interface WinnerSubmission {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Character {
  id: string;
  name: string;
  variantId: string | null;
  quota: number;
  assignedCount: number;
  remaining: number;
  weight: number;
  winProbability: number;
  active: boolean;
  sortOrder: number;
  imageUrl: string | null;
  createdAt: string;
}

export interface AssignedCharacter {
  id: string;
  name: string;
}

export interface LoyaltyBalance {
  email: string;
  points: number;
}
