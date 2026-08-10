import { successResponse, type SuccessResponse } from '../../shared/http/api-response.js';

export interface HealthData {
  status: 'ok';
  service: 'zeva-backend';
  version: string;
  timestamp: string;
}

export function getHealth(): SuccessResponse<HealthData> {
  return successResponse({
    status: 'ok',
    service: 'zeva-backend',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
}
