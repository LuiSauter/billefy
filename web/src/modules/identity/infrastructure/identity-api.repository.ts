import { IHttpClient } from "@/shared/application/http-client.contract";
import {
  AuthResponseDto,
  IIdentityRepository,
  UserDataExportDto,
  UserDto,
} from "../domain/identity.types";

export class IdentityApiRepository implements IIdentityRepository {
  constructor(private readonly http: IHttpClient) {}

  async loginWithGoogle(
    idToken: string,
    preferredCurrency?: string
  ): Promise<AuthResponseDto> {
    const body: Record<string, string> = { idToken };
    if (preferredCurrency) {
      body.preferredCurrency = preferredCurrency;
    }
    const res = await this.http.post<AuthResponseDto>("/api/v1/auth/google", body);
    this.http.setAuthSession(res.accessToken, res.user.id);
    return res;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const res = await this.http.post<AuthResponseDto>("/api/v1/auth/refresh", {
      refreshToken,
    });
    this.http.setAuthSession(res.accessToken, res.user.id);
    return res;
  }

  async getCurrentUser(): Promise<UserDto> {
    return this.http.get<UserDto>("/api/v1/auth/me");
  }

  async updatePreferredCurrency(preferredCurrency: string): Promise<UserDto> {
    return this.http.put<UserDto>("/api/v1/auth/preferred-currency", { preferredCurrency });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.http.post<void>("/api/v1/auth/logout", { refreshToken });
    this.http.setAuthSession(undefined);
  }

  async requestAccountDeletion(): Promise<void> {
    await this.http.delete<void>("/api/v1/auth/account");
  }

  async exportUserData(): Promise<UserDataExportDto> {
    return this.http.get<UserDataExportDto>("/api/v1/auth/export");
  }
}
