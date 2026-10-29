export interface RegisterDeviceTokenRequest {
  token: string;
  platform: string;
}

export interface DeviceRegistrationDto {
  id: string;
  platform: string;
  createdAt: string;
}

export interface NotificationLogDto {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  sentAt: string;
  status: string;
}

export interface INotificationsRepository {
  registerDeviceToken(req: RegisterDeviceTokenRequest): Promise<DeviceRegistrationDto>;
  getNotificationHistory(): Promise<NotificationLogDto[]>;
}
