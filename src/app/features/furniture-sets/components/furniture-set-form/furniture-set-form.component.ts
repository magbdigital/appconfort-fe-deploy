import { Component, Output, EventEmitter, inject, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FurnitureSetService } from '../../../../core/services/furniture-set.service';
import { ProductService } from '../../../../core/services/product.service';
import { FurnitureSet, CreateFurnitureSetDto, UpdateFurnitureSetDto } from '../../../../shared/models/furniture-set.model';
import { Product } from '../../../../shared/models/product.model';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';

import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface SelectedProductItem {
    product: Product;
    quantity: number;
}

@Component({
    selector: 'app-furniture-set-form',
    standalone: true,
    imports: [CommonModule, FormsModule, Dialog, InputText, Button, TableModule, CardModule],
    templateUrl: './furniture-set-form.component.html',
    styleUrl: './furniture-set-form.component.css'
})
export class FurnitureSetFormComponent implements OnInit {
    visible = signal(true);
    private furnitureSetService = inject(FurnitureSetService);
    private productService = inject(ProductService);

    @Input() setItem: FurnitureSet | null = null;
    @Output() cerrar = new EventEmitter<void>();
    @Output() guardado = new EventEmitter<void>();

    esEdicion = signal(false);
    description = signal('');
    
    // Available products for selection
    allProducts = signal<Product[]>([]);
    searchText = signal('');
    showSuggestions = signal(false);

    // Selected products for this furniture set
    selectedItems = signal<SelectedProductItem[]>([]);

    ngOnInit(): void {
        // Load all active products for the picker
        this.productService.getAll().subscribe({
            next: (data) => {
                this.allProducts.set(data.filter(p => p.isActive));
            }
        });

        if (this.setItem) {
            this.esEdicion.set(true);
            this.description.set(this.setItem.description);
            // Map existing setItems to selectedItems
            if (this.setItem.setItems) {
                const mapped = this.setItem.setItems.map(item => ({
                    product: item.product,
                    quantity: item.quantity
                }));
                this.selectedItems.set(mapped);
            }
        }
    }

    filteredProducts = computed(() => {
        const query = this.searchText().toLowerCase().trim();
        if (!query) return [];
        return this.allProducts().filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.sku.toLowerCase().includes(query)
        );
    });

    onSearchFocus(): void {
        this.showSuggestions.set(true);
    }

    onSearchBlur(): void {
        // Delay hide to allow click on item
        setTimeout(() => this.showSuggestions.set(false), 200);
    }

    selectProduct(product: Product): void {
        const current = this.selectedItems();
        const existing = current.find(item => item.product.id === product.id);

        if (existing) {
            this.incrementQuantity(product.id);
        } else {
            this.selectedItems.set([...current, { product, quantity: 1 }]);
        }
        this.searchText.set('');
    }

    incrementQuantity(productId: number): void {
        this.selectedItems.update(items => 
            items.map(item => 
                item.product.id === productId 
                    ? { ...item, quantity: item.quantity + 1 } 
                    : item
            )
        );
    }

    decrementQuantity(productId: number): void {
        this.selectedItems.update(items => 
            items.map(item => 
                item.product.id === productId && item.quantity > 1
                    ? { ...item, quantity: item.quantity - 1 } 
                    : item
            )
        );
    }

    removeItem(productId: number): void {
        this.selectedItems.update(items => 
            items.filter(item => item.product.id !== productId)
        );
    }

    getTotalPrice(): number {
        return this.selectedItems().reduce((total, item) => total + (item.product.finalPrice * item.quantity), 0);
    }

    onCerrar(): void {
        this.cerrar.emit();
    }

    guardar(): void {
        // Create an array of unique product IDs
        const uniqueProductIds = Array.from(new Set(this.selectedItems().map(item => item.product.id)));

        const saveObs = this.esEdicion() && this.setItem
            ? this.furnitureSetService.update(this.setItem.id, {
                description: this.description(),
                productIds: uniqueProductIds
              })
            : this.furnitureSetService.create({
                description: this.description() ? this.description() : undefined,
                productIds: uniqueProductIds
              });

        saveObs.pipe(
            // Fetch the saved set details so we have the freshly populated setItems array with database IDs
            switchMap((savedSet) => this.furnitureSetService.getById(savedSet.id)),
            switchMap((detailedSet) => {
                const updateRequests = this.selectedItems()
                    .filter(item => item.quantity > 1)
                    .map(item => {
                        const dbItem = detailedSet.setItems?.find(si => si.productId === item.product.id);
                        if (dbItem) {
                            return this.furnitureSetService.updateItem(detailedSet.id, dbItem.id, {
                                quantity: item.quantity
                            });
                        }
                        return of(null);
                    });

                if (updateRequests.length === 0) {
                    return of(detailedSet);
                }
                return forkJoin(updateRequests);
            })
        ).subscribe({
            next: () => {
                this.guardado.emit();
            },
            error: (err) => {
                console.error('Error al guardar el juego de muebles:', err);
            }
        });
    }
}
