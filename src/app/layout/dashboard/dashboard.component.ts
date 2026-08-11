import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClientService } from '../../core/services/client.service';
import { ProductService } from '../../core/services/product.service';
import { QuoteService } from '../../core/services/quote.service';
import { Quote } from '../../shared/models/quote.model';
import { SalesOrderService } from '../../core/services/sales-order.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, Card, Button, TableModule, Tag],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private clientService = inject(ClientService);
  private productService = inject(ProductService);
  private quoteService = inject(QuoteService);
  private salesOrderService = inject(SalesOrderService);
  private router = inject(Router);

  loading = signal(false);
  totalSales = signal(0);
  totalClients = signal(0);
  activeQuotesCount = signal(0);
  totalProducts = signal(0);
  totalPendingBalance = signal(0);
  recentQuotes = signal<Quote[]>([]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    forkJoin({
      clients: this.clientService.getAll(),
      products: this.productService.getAll(),
      quotes: this.quoteService.getAll(),
      salesOrders: this.salesOrderService.getAll()
    }).subscribe({
      next: ({ clients, products, quotes, salesOrders }) => {
        // Calculate total sales from ACCEPTED quotes
        const sales = quotes
          .filter(q => q.status === 'ACCEPTED')
          .reduce((acc, q) => acc + parseFloat(q.total || '0'), 0);
        this.totalSales.set(sales);

        // Total clients count
        this.totalClients.set(clients.length);

        // Active quotes count (DRAFT, SENT)
        const active = quotes.filter(q => q.status === 'DRAFT' || q.status === 'SENT').length;
        this.activeQuotesCount.set(active);

        // Total active products count
        this.totalProducts.set(products.filter(p => p.isActive).length);

        // Calculate total pending balance from sales orders
        const pending = salesOrders
          .filter(so => so.status !== 'VOIDED')
          .reduce((acc, so) => acc + parseFloat(so.pendingBalance || '0'), 0);
        this.totalPendingBalance.set(pending);

        // Sort quotes by id desc, get top 5
        const sorted = [...quotes].sort((a, b) => b.id - a.id).slice(0, 5);
        this.recentQuotes.set(sorted);

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.loading.set(false);
      }
    });
  }

  goToQuote(id: number): void {
    this.router.navigate(['/orders', id]);
  }

  goToNewQuote(): void {
    this.router.navigate(['/orders/new']);
  }

  goToNewClient(): void {
    this.router.navigate(['/clients']);
  }

  goToCatalog(): void {
    this.router.navigate(['/products']);
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
}
