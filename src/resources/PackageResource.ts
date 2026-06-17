import type { PubPackageInfo, PubPackageScore, PubVersionInfo } from '../domain/Package';
import type { RequestFn } from './types';

export class PackageResource {
  private readonly name: string;
  private readonly request: RequestFn;

  /** @internal */
  constructor(name: string, request: RequestFn) {
    this.name = name;
    this.request = request;
  }

  async info(signal?: AbortSignal): Promise<PubPackageInfo> {
    return this.request<PubPackageInfo>(`/api/packages/${this.name}`, signal);
  }

  async versions(signal?: AbortSignal): Promise<PubVersionInfo[]> {
    const data = await this.request<PubPackageInfo>(`/api/packages/${this.name}`, signal);
    return data.versions;
  }

  async version(v: string, signal?: AbortSignal): Promise<PubVersionInfo> {
    return this.request<PubVersionInfo>(`/api/packages/${this.name}/versions/${v}`, signal);
  }

  async latest(signal?: AbortSignal): Promise<PubVersionInfo> {
    const data = await this.request<PubPackageInfo>(`/api/packages/${this.name}`, signal);
    return data.latest;
  }

  async score(signal?: AbortSignal): Promise<PubPackageScore> {
    return this.request<PubPackageScore>(`/api/packages/${this.name}/score`, signal);
  }
}
