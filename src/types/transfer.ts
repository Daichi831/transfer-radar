export type TransferType = "complete" | "loan" | "extension";

export interface TransferNews {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  content?: string;
  extractedInfo?: {
    playerName?: string;
    fromTeam?: string;
    toTeam?: string;
    transferType?: TransferType;
    transferFee?: string;
  };
}
