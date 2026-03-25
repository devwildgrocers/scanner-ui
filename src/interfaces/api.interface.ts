export interface SessionResponse {
  success: boolean;
  sessionStartedAt: string;
  cartId: string;
  teamMemberId: string;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  status: number;
}
