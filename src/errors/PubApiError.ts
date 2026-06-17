export class PubApiError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(`Pub API error: ${status} ${statusText}`);
    this.name = 'PubApiError';
    this.status = status;
    this.statusText = statusText;
    Object.setPrototypeOf(this, PubApiError.prototype);
  }
}
