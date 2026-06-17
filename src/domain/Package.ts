export interface PubPubspec {
  name: string;
  version: string;
  description?: string;
  homepage?: string;
  repository?: string;
  [key: string]: unknown;
}

export interface PubVersionInfo {
  version: string;
  pubspec: PubPubspec;
  archiveUrl: string;
  archiveSha256: string;
  published: string;
}

export interface PubPackageInfo {
  name: string;
  latest: PubVersionInfo;
  versions: PubVersionInfo[];
}

export interface PubPackageScore {
  grantedPoints: number;
  maxPoints: number;
  likeCount: number;
  popularityScore: number;
  lastUpdated: string;
}
