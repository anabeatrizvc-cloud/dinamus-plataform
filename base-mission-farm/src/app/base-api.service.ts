import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";

export type MissionBaseStageStatus = "CONCLUIDA" | "EM_ANDAMENTO" | "EM_BREVE";

export type MissionBaseStage = {
  id: string;
  name: string;
  description: string;
  goalCents: number;
  raisedCents: number;
  percent: number;
  goalExceeded: boolean;
  status: MissionBaseStageStatus;
  icon: string;
  sortOrder: number;
  current: boolean;
  visible: boolean;
  remainingCents?: number | null;
  updatedAt?: string | null;
};

export type MissionBaseCampaign = {
  id: string;
  title: string;
  description: string;
  active: boolean;
  totalGoalCents: number;
  totalRaisedCents: number;
  percent: number;
  goalExceeded: boolean;
  stages: MissionBaseStage[];
  updatedAt?: string | null;
};

export type MissionBasePix = {
  stageId: string;
  stageName: string;
  amountCents: number;
  txid: string;
  pixPayload: string;
};

@Injectable({ providedIn: "root" })
export class BaseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "/api/v1";

  getCampaign() {
    return this.http.get<MissionBaseCampaign>(`${this.baseUrl}/mission-base`);
  }

  generatePix(stageId: string, amountCents: number) {
    return this.http.post<MissionBasePix>(`${this.baseUrl}/mission-base/pix`, {
      stageId,
      amountCents,
    });
  }
}
