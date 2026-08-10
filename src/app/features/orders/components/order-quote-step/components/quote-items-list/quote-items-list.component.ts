import { Component, OnInit, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuoteService } from '../../../../../../core/services/quote.service';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';

interface QuoteItem {
    id: number;
    productId: number;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    product: {
        name: string;
        sku: string;
        finalPrice: number;
        basePrice: number;
    };
}

@Component({
    selector: 'app-quote-items-list',
    standalone: true,
    imports: [CommonModule, Button, TableModule],
    templateUrl: './quote-items-list.component.html',
    styleUrl: './quote-items-list.component.css'
})
export class QuoteItemsListComponent implements OnInit {
    private quoteService = inject(QuoteService);

    quoteId = input.required<number>(); // ← receives quoteId from parent
    discountPercent = input<string>('0'); // ← receives discountPercent from parent

    items = signal<QuoteItem[]>([]);
    loading = signal(false);

    ngOnInit(): void {
        this.loadItems();
    }

    loadItems(): void {
        this.loading.set(true);
        this.quoteService.getItems(this.quoteId()).subscribe({
            next: (data) => {
                this.items.set(data);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    getTotal(): number {
        return this.items().reduce((acc, item) =>
            acc + parseFloat(item.subtotal), 0
        );
    }

    getDiscountAmount(): number {
        const subtotal = this.getTotal();
        const discPercent = parseFloat(this.discountPercent() || '0');
        return subtotal * (discPercent / 100);
    }

    getSubtotalWithDiscount(): number {
        return this.getTotal() - this.getDiscountAmount();
    }

    getIva(): number {
        return this.getSubtotalWithDiscount() * 0.15;
    }

    getFinalTotal(): number {
        return this.getSubtotalWithDiscount() * 1.15;
    }

    removeItem(itemId: number): void {
        this.quoteService.removeItem(this.quoteId(), itemId).subscribe({
            next: () => this.loadItems(),
            error: (err) => console.error('Error removing item:', err)
        });
    }
}
