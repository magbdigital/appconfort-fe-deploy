import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuoteService } from '../../../../core/services/quote.service';
import { Quote } from '../../../../shared/models/quote.model';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';

@Component({
    selector: 'app-order-list',
    standalone: true,
    imports: [CommonModule, TableModule, Button, Tag, FormsModule, InputText],
    templateUrl: './order-list.component.html',
    styleUrl: './order-list.component.css'
})
export class OrderListComponent implements OnInit {
    private quoteService = inject(QuoteService);
    private router = inject(Router);

    quotes = signal<Quote[]>([]);
    loading = signal(false);
    error = signal('');
    searchText = signal('');

    filteredQuotes = computed(() => {
        const search = this.searchText().toLowerCase().trim();
        if (!search) return this.quotes();
        return this.quotes().filter(q => {
            const firstName = q.client?.firstName?.toLowerCase() || '';
            const lastName = q.client?.lastName?.toLowerCase() || '';
            const fullName = `${firstName} ${lastName}`;
            return fullName.includes(search);
        });
    });

    ngOnInit(): void {
        this.loadQuotes();
    }

    goToOrder(id: number): void {
        this.router.navigate(['/orders', id]);
    }

    loadQuotes(): void {
        this.loading.set(true);
        this.quoteService.getAll().subscribe({
            next: (data) => {
                this.quotes.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Error al cargar proformas');
                this.loading.set(false);
            }
        });
    }

    goToNewQuote(): void {
        this.router.navigate(['/orders/new']);
    }

    getStatusLabel(status: string): string {
        const labels: Record<string, string> = {
            'DRAFT': 'Borrador',
            'SENT': 'Enviada',
            'ACCEPTED': 'Aceptada',
            'REJECTED': 'Rechazada',
            'CANCELLED': 'Cancelada',
        };
        return labels[status] ?? status;
    }

    getStatusSeverity(status: string): 'secondary' | 'info' | 'success' | 'danger' | 'warn' {
        const severities: Record<string, 'secondary' | 'info' | 'success' | 'danger' | 'warn'> = {
            'DRAFT': 'secondary',
            'SENT': 'info',
            'ACCEPTED': 'success',
            'REJECTED': 'danger',
            'CANCELLED': 'warn',
        };
        return severities[status] ?? 'secondary';
    }

    getLiquidacionLabel(quote: Quote): string {
        if (!quote.salesOrder) {
            return 'Pendiente';
        }
        const status = quote.salesOrder.status;
        const labels: Record<string, string> = {
            'PENDING': 'Por Pagar',
            'DEPOSIT_PAID': 'Abonado',
            'DELIVERED': 'Entregado',
            'COMPLETED': 'Completado',
            'VOIDED': 'Anulado'
        };
        return labels[status] ?? status;
    }

    getLiquidacionSeverity(quote: Quote): 'secondary' | 'info' | 'success' | 'danger' | 'warn' {
        if (!quote.salesOrder) {
            return 'secondary';
        }
        const status = quote.salesOrder.status;
        const severities: Record<string, 'secondary' | 'info' | 'success' | 'danger' | 'warn'> = {
            'PENDING': 'warn',
            'DEPOSIT_PAID': 'info',
            'DELIVERED': 'success',
            'COMPLETED': 'success',
            'VOIDED': 'danger'
        };
        return severities[status] ?? 'secondary';
    }

    getTallerLabel(quote: Quote): string {
        if (!quote.salesOrder) {
            return 'Pendiente';
        }
        const status = quote.salesOrder.status;
        const labels: Record<string, string> = {
            'PENDING': 'Pendiente',
            'DEPOSIT_PAID': 'En Producción',
            'DELIVERED': 'Entregado',
            'COMPLETED': 'Completado',
            'VOIDED': 'Cancelado'
        };
        return labels[status] ?? status;
    }

    getTallerSeverity(quote: Quote): 'secondary' | 'info' | 'success' | 'danger' | 'warn' {
        if (!quote.salesOrder) {
            return 'secondary';
        }
        const status = quote.salesOrder.status;
        const severities: Record<string, 'secondary' | 'info' | 'success' | 'danger' | 'warn'> = {
            'PENDING': 'secondary',
            'DEPOSIT_PAID': 'info',
            'DELIVERED': 'success',
            'COMPLETED': 'success',
            'VOIDED': 'danger'
        };
        return severities[status] ?? 'secondary';
    }

    getStatusIcon(status: string): string {
        const icons: Record<string, string> = {
            'DRAFT': 'pi pi-pencil',
            'SENT': 'pi pi-send',
            'ACCEPTED': 'pi pi-check-circle',
            'REJECTED': 'pi pi-times-circle',
            'CANCELLED': 'pi pi-ban',
        };
        return icons[status] ?? 'pi pi-question-circle';
    }

    getLiquidacionIcon(quote: Quote): string {
        if (!quote.salesOrder) {
            return 'pi pi-clock';
        }
        const status = quote.salesOrder.status;
        const icons: Record<string, string> = {
            'PENDING': 'pi pi-exclamation-circle',
            'DEPOSIT_PAID': 'pi pi-wallet',
            'DELIVERED': 'pi pi-truck',
            'COMPLETED': 'pi pi-check-circle',
            'VOIDED': 'pi pi-ban'
        };
        return icons[status] ?? 'pi pi-question-circle';
    }

    getTallerIcon(quote: Quote): string {
        if (!quote.salesOrder) {
            return 'pi pi-clock';
        }
        const status = quote.salesOrder.status;
        const icons: Record<string, string> = {
            'PENDING': 'pi pi-cog',
            'DEPOSIT_PAID': 'pi pi-cog',
            'DELIVERED': 'pi pi-check',
            'COMPLETED': 'pi pi-verified',
            'VOIDED': 'pi pi-times'
        };
        return icons[status] ?? 'pi pi-question-circle';
    }

    getStatusColor(severity: string): string {
        const colors: Record<string, string> = {
            'secondary': '#94a3b8',
            'info': '#3b82f6',
            'success': '#22c55e',
            'danger': '#ef4444',
            'warn': '#f59e0b'
        };
        return colors[severity] ?? '#94a3b8';
    }
}
