export interface SessionResponse {
  success: boolean;
  sessionStartedAt: string;
  cartId: string;
  teamMemberId: string;
}

export interface PickItem {
  productId: string;
  name: string;
  barcode: string;
  location: string;
  totalQty: number;
  pickedQty: number;
  replacedQty?: number;
  replacementBarcode?: string;
  replacementProductId?: string;
  items: Array<{
    id: string;
    orderNumber: string;
    qty: number;
    fulfilled: number;
  }>;
  isReplacement?: boolean;
  originalProductId?: string;
}
