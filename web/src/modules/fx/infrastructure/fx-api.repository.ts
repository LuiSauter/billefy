import { IHttpClient } from "@/shared/application/http-client.contract";
import { IFxRepository, RateSnapshotDto } from "../domain/fx.types";

export class FxApiRepository implements IFxRepository {
  constructor(private readonly http: IHttpClient) {}

  async getLatestRate(
    currency: string,
    baseCurrency: string = "USD"
  ): Promise<RateSnapshotDto> {
    return this.http.get<RateSnapshotDto>(
      `/v1/rates/latest?currency=${encodeURIComponent(currency)}&baseCurrency=${encodeURIComponent(baseCurrency)}`
    );
  }
}
