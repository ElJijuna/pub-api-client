export interface PubSearchParams {
  query?: string;
  page?: number;
}

export interface PubSearchPackage {
  package: string;
}

export interface PubSearchResult {
  packages: PubSearchPackage[];
  next?: string;
}
