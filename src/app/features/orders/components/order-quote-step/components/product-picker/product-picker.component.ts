import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../../../../core/services/product.service';
import { QuoteService } from '../../../../../../core/services/quote.service';
import { environment } from '../../../../../../../environments/environment';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';

export interface Product {
    id: number;
    sku: string;
    name: string;
    imageUrl?: string;
    basePrice: number;
    finalPrice: number;
}

@Component({
    selector: 'app-product-picker',
    standalone: true,
    imports: [CommonModule, FormsModule, InputText, Button, Card],
    templateUrl: './product-picker.component.html',
    styleUrl: './product-picker.component.css'
})
export class ProductPickerComponent implements OnInit {

    productAdded = output<void>();
    searchText = signal('');
    private productService = inject(ProductService);
    private quoteService = inject(QuoteService);
    products = signal<any[]>([]);
    quoteId = input.required<number>();
    apiUrl = environment.apiUrl;

    ngOnInit(): void {
        this.productService.getAll().subscribe({
            next: (data) => this.products.set(data.filter((p: any) => p.isActive))
        });
    }

    filteredProducts = computed(() => {
        const search = this.searchText().toLowerCase();
        if (!search) return this.products();
        return this.products().filter(p =>
            p.name.toLowerCase().includes(search) ||
            p.sku.toLowerCase().includes(search)
        );
    });

    addProduct(product: Product): void {
        this.quoteService.addItem(this.quoteId(), {
            productId: product.id,
            quantity: this.getQuantity(product.id),
            unitPrice: product.finalPrice
        }).subscribe({
            next: () => this.productAdded.emit(),
            error: (err) => console.error('Error adding item:', err)
        });
    }

    quantities: Record<number, number> = {};

    getQuantity(productId: number): number {
        return this.quantities[productId] ?? 1;
    }

    increment(productId: number): void {
        this.quantities[productId] = (this.quantities[productId] ?? 1) + 1;
    }

    decrement(productId: number): void {
        const current = this.quantities[productId] ?? 1;
        if (current > 1) this.quantities[productId] = current - 1;
    }

    getProductImageUrl(imageUrl?: string): string | undefined {
        if (!imageUrl) return undefined;
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }
        return `${this.apiUrl}${imageUrl}`;
    }
}
