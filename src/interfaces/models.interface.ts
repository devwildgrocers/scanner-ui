export interface TeamMember {
  id: string;
  name: string;
}

export interface Cart {
  id: string;
  cartId: string;
  status: string;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  location?: string;
}

export interface PickItem {
  productId: string;
  name: string;
  barcode?: string;
  location: string;
  totalQty: number;
  pickedQty: number;
  replacedQty?: number;
  shortQty?: number;
  replacementBarcode?: string;
  replacementProductId?: string;
  items: Array<{
    id: string;
    orderNumber: string;
    qty: number;
    fulfilled: number;
    replacementProductId?: string;
    replacedQty?: number;
    shortQty?: number;
    status?: string;
    slot?: string;
  }>;
  isReplacement?: boolean;
  originalProductId?: string;
  slot?: string;
}
