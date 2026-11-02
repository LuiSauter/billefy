export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  pictureUrl?: string;
  preferredCurrency: string;
  createdAt: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: UserDto;
}

export interface UserDataExportDto {
  user: UserDto;
  exportedAt: string;
  systemVersion: string;
}

export interface IIdentityRepository {
  loginWithGoogle(idToken: string, preferredCurrency?: string): Promise<AuthResponseDto>;
  refreshToken(refreshToken: string): Promise<AuthResponseDto>;
  getCurrentUser(): Promise<UserDto>;
  updatePreferredCurrency(preferredCurrency: string): Promise<UserDto>;
  logout(refreshToken: string): Promise<void>;
  requestAccountDeletion(): Promise<void>;
  exportUserData(): Promise<UserDataExportDto>;
}

export function getUserDisplayName(user?: UserDto | null): string {
  return user?.fullName || user?.email?.split("@")[0] || "Mi Usuario";
}

export function getUserInitials(user?: UserDto | null): string {
  if (user?.fullName) {
    return user.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }
  if (user?.email) {
    return user.email[0].toUpperCase();
  }
  return "U";
}
