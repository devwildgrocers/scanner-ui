export interface LocalItemState {
  pickedQty: number;
  replacedQty?: number;
  replacementBarcode?: string;
  replacementProductId?: string;
}

export interface PickPlan {
  originalQtyToPick: number;
  replacedQty: number;
  replacementBarcode: string;
  replacementProductName?: string;
  replacementProductId?: string;
}
