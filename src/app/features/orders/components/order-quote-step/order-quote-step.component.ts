import { Component, computed, inject, signal, OnInit, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerSearchModalComponent } from '../../pages/order-shell/components/customer-search-modal/customer-search-modal.component';
import { Client } from '../../../../shared/models/client.model';
import { Quote } from '../../../../shared/models/quote.model';
import { QuoteService } from '../../../../core/services/quote.service';
import { ProductService } from '../../../../core/services/product.service';
import { Product } from '../../../../shared/models/product.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductPickerComponent } from './components/product-picker/product-picker.component';
import { SetPickerComponent } from './components/set-picker/set-picker.component';
import { QuoteItemsListComponent } from './components/quote-items-list/quote-items-list.component';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';

@Component({
    selector: 'app-order-quote-step',
    standalone: true,
    imports: [
        CustomerSearchModalComponent,
        CommonModule,
        FormsModule,
        ProductPickerComponent,
        SetPickerComponent,
        QuoteItemsListComponent,
        Button,
        Tag,
        Card,
        Dialog
    ],
    templateUrl: './order-quote-step.component.html',
    styleUrl: './order-quote-step.component.css'
})
export class OrderQuoteStepComponent implements OnInit {
    private quoteService = inject(QuoteService);
    private productService = inject(ProductService);
    private route = inject(ActivatedRoute);

    quoteId = signal<number | null>(null);
    selectedClient = signal<Client | null>(null);
    isOpenClientSearch = signal<boolean>(false);
    isOpenProductSearch = signal<boolean>(false);
    isOpenSetSearch = signal<boolean>(false);
    products = signal<Product[]>([]);
    quote = signal<Quote | null>(null);
    isEditMode = signal(false);

    quoteItemsList = viewChild(QuoteItemsListComponent);

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id && id !== 'new') {
                this.isEditMode.set(true);
                this.loadQuote(Number(id));
            } else {
                this.isEditMode.set(false);
                this.quoteId.set(null);
                this.selectedClient.set(null);
                this.quote.set(null);
            }
        });
    }

    loadQuote(id: number): void {
        this.quoteService.getById(id).subscribe({
            next: (quote) => {
                this.quote.set(quote);
                this.selectedClient.set(quote.client);
                this.quoteId.set(quote.id);
            },
            error: (err) => console.error('Error loading quote:', err)
        });
    }

    openClientSearch() {
        this.isOpenClientSearch.set(true);
    }

    openProductSearch() {
        this.isOpenProductSearch.set(true);
    }

    openSetSearch() {
        this.isOpenSetSearch.set(true);
    }

    onClientSelected(client: Client): void {
        this.selectedClient.set(client);
        this.isOpenClientSearch.set(false);
        this.createQuote(client.id);
        this.loadProducts();
    }

    loadProducts(): void {
        this.productService.getAll().subscribe({
            next: (data) => this.products.set(data.filter(p => p.isActive)),
        });
    }

    createQuote(clientId: number): void {
        this.quoteService.create({ clientId }).subscribe({
            next: (quote) => {
                this.quote.set(quote);
                this.quoteId.set(quote.id);
            },
            error: (err) => console.error('Error creating quote:', err)
        });
    }

    onProductAdded(): void {
        const list = this.quoteItemsList();
        if (list) {
            list.loadItems();
        }
    }

    onSetAdded(): void {
        const list = this.quoteItemsList();
        if (list) {
            list.loadItems();
        }
    }
}
