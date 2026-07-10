import { ApplicationError } from "../application/application-error.js";

export type DataRightsRequestType = "export" | "delete" | "close-account";
export type DataRightsRequestStatus = "pending" | "processing" | "completed" | "rejected" | "cancelled";

export function transitionDataRightsRequest(status: DataRightsRequestStatus, next: DataRightsRequestStatus): DataRightsRequestStatus {
  const allowed: Record<DataRightsRequestStatus, readonly DataRightsRequestStatus[]> = {
    pending: ["processing", "rejected", "cancelled"],
    processing: ["completed", "rejected"],
    completed: [],
    rejected: [],
    cancelled: []
  };
  if (!allowed[status].includes(next)) throw new ApplicationError("INVALID_DATA_RIGHTS_TRANSITION", 409, "数据权利请求状态转换无效。");
  return next;
}
