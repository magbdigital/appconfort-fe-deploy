import { Product } from './product.model';

export interface FurnitureSetItem {
    id: number;
    furnitureSetId: number;
    productId: number;
    quantity: number;
    sortOrder: number;
    product: Product;
}

export interface FurnitureSet {
    id: number;
    sku: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    setItems: FurnitureSetItem[];
}

export interface CreateFurnitureSetDto {
    productIds: number[];
    description?: string;
}

export interface UpdateFurnitureSetDto {
    description?: string;
    productIds?: number[];
}
