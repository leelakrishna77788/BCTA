export type ShopStatus = "active" | "inactive";

export interface Shop {
  id?: string;
  shopName: string;
  ownerUID: string;
  ownerName: string;
  address: string;
  phone?: string;
  status: ShopStatus;
  createdAt?: Date | { toDate(): Date };
  updatedAt?: Date | { toDate(): Date };
}

export interface CreateShopInput {
  shopName: string;
  ownerUID: string;
  ownerName: string;
  address: string;
  phone?: string;
}

export interface ShopStats {
  total: number;
  active: number;
  inactive: number;
}
