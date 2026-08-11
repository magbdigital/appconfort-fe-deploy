import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SalesOrderService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/sales-orders`;

    getAll(): Observable<any[]> {
        return this.http.get<any[]>(this.baseUrl);
    }

    getByQuoteId(quoteId: number): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/quote/${quoteId}`);
    }

    complete(id: number): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/${id}/complete`, {});
    }
}
