import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Quote } from '../../shared/models/quote.model';

@Injectable({ providedIn: 'root' })
export class QuoteService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/quotes`;

    getAll(): Observable<Quote[]> {
        return this.http.get<Quote[]>(this.baseUrl);
    }

    create(payload: { clientId: number }): Observable<Quote> {
        return this.http.post<Quote>(this.baseUrl, payload);
    }

    addItem(quoteId: number, item: { productId: number; quantity: number; unitPrice: number }): Observable<any> {
        return this.http.post(`${this.baseUrl}/${quoteId}/items`, item);
    }

    getItems(quoteId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/${quoteId}/items`);
    }
    removeItem(quoteId: number, itemId: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${quoteId}/items/${itemId}`);
    }
    getById(id: number): Observable<Quote> {
        return this.http.get<Quote>(`${this.baseUrl}/${id}`);
    }

    updateStatus(id: number, status: string): Observable<Quote> {
        return this.http.patch<Quote>(`${this.baseUrl}/${id}/status`, { status });
    }

    update(id: number, payload: any): Observable<Quote> {
        return this.http.put<Quote>(`${this.baseUrl}/${id}`, payload);
    }

    uploadPdf(id: number, file: Blob): Observable<{ pdfUrl: string }> {
        const formData = new FormData();
        formData.append('file', file, `proforma-${id}.pdf`);
        return this.http.post<{ pdfUrl: string }>(`${this.baseUrl}/${id}/upload-pdf`, formData);
    }
}