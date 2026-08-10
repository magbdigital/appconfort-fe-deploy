import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FurnitureSetService } from '../../../../../../core/services/furniture-set.service';
import { QuoteService } from '../../../../../../core/services/quote.service';
import { FurnitureSet } from '../../../../../../shared/models/furniture-set.model';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { forkJoin, of } from 'rxjs';

@Component({
    selector: 'app-set-picker',
    standalone: true,
    imports: [CommonModule, FormsModule, InputText, Button, Card],
    templateUrl: './set-picker.component.html',
    styleUrl: './set-picker.component.css'
})
export class SetPickerComponent implements OnInit {
    setAdded = output<void>();
    searchText = signal('');
    
    private furnitureSetService = inject(FurnitureSetService);
    private quoteService = inject(QuoteService);
    
    sets = signal<FurnitureSet[]>([]);
    quoteId = input.required<number>();

    ngOnInit(): void {
        this.furnitureSetService.getAll().subscribe({
            next: (data) => this.sets.set(data.filter(s => s.isActive))
        });
    }

    filteredSets = computed(() => {
        const search = this.searchText().toLowerCase().trim();
        if (!search) return this.sets();
        return this.sets().filter(s =>
            (s.description && s.description.toLowerCase().includes(search)) ||
            s.sku.toLowerCase().includes(search)
        );
    });

    addSet(set: FurnitureSet): void {
        const setQty = this.getQuantity(set.id);
        if (!set.setItems || set.setItems.length === 0) return;

        // Map items to quote insertion requests
        const addRequests = set.setItems.map(item => {
            const finalPrice = Number(item.product?.finalPrice) || 0;
            return this.quoteService.addItem(this.quoteId(), {
                productId: item.productId,
                quantity: item.quantity * setQty,
                unitPrice: finalPrice
            });
        });

        forkJoin(addRequests).subscribe({
            next: () => {
                this.setAdded.emit();
                // Reset quantity for this set
                this.quantities[set.id] = 1;
            },
            error: (err) => console.error('Error adding set items:', err)
        });
    }

    quantities: Record<number, number> = {};

    getQuantity(setId: number): number {
        return this.quantities[setId] ?? 1;
    }

    increment(setId: number): void {
        this.quantities[setId] = (this.quantities[setId] ?? 1) + 1;
    }

    decrement(setId: number): void {
        const current = this.quantities[setId] ?? 1;
        if (current > 1) this.quantities[setId] = current - 1;
    }
}
