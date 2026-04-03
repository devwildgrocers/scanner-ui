export interface SessionResponse {
  success: boolean;
  sessionStartedAt: string;
  cartId: string;
  teamMemberId: string;
  teamMemberName?: string;
  cartStatus?: string;
  assignments?: Record<string, string>;
  summary?: any;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  status: number;
}
