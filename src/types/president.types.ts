export interface President {
  id: string;
  name: string;
  year: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  createdAt: any;
}

export type CreatePresidentInput = Omit<President, "id" | "createdAt">;
