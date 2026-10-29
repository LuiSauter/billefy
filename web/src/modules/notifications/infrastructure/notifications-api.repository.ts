import { IHttpClient } from "@/shared/application/http-client.contract";
import {
  DeviceRegistrationDto,
  INotificationsRepository,
  NotificationLogDto,
  RegisterDeviceTokenRequest,
} from "../domain/notifications.types";

export class NotificationsApiRepository implements INotificationsRepository {
  constructor(private readonly http: IHttpClient) {}

  async registerDeviceToken(
    req: RegisterDeviceTokenRequest
  ): Promise<DeviceRegistrationDto> {
    return this.http.post<DeviceRegistrationDto>("/v1/notifications/devices", req);
  }

  async getNotificationHistory(): Promise<NotificationLogDto[]> {
    return this.http.get<NotificationLogDto[]>("/v1/notifications");
  }
}
