import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FurnitureSet, CreateFurnitureSetDto, UpdateFurnitureSetDto } from '../../shared/models/furniture-set.model';

@Injectable({ providedIn: 'root' })
export class FurnitureSetService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/furniture-sets`;

    getAll(): Observable<FurnitureSet[]> {
        return this.http.get<FurnitureSet[]>(this.baseUrl);
    }

    getById(id: number): Observable<FurnitureSet> {
        return this.http.get<FurnitureSet>(`${this.baseUrl}/${id}`);
    }

    create(dto: CreateFurnitureSetDto): Observable<FurnitureSet> {
        return this.http.post<FurnitureSet>(this.baseUrl, dto);
    }

    update(id: number, dto: UpdateFurnitureSetDto): Observable<FurnitureSet> {
        return this.http.put<FurnitureSet>(`${this.baseUrl}/${id}`, dto);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    addItem(furnitureSetId: number, dto: { productId: number; quantity?: number; sortOrder?: number }): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/${furnitureSetId}/items`, dto);
    }

    updateItem(furnitureSetId: number, itemId: number, dto: { productId?: number; quantity?: number; sortOrder?: number }): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/${furnitureSetId}/items/${itemId}`, dto);
    }

    deleteItem(furnitureSetId: number, itemId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${furnitureSetId}/items/${itemId}`);
    }
}
