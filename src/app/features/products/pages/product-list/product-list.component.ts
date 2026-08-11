import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../../core/services/product.service';
import { Product } from '../../../../shared/models/product.model';
import { ProductFormComponent } from '../product-form/product-form.component';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { environment } from '../../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';

@Component({
    selector: 'app-product-list',
    standalone: true,
    imports: [CommonModule, ProductFormComponent, TableModule, Button, Tag, FormsModule, InputText],
    templateUrl: './product-list.component.html',
    styleUrl: './product-list.component.css'
})
export class ProductListComponent implements OnInit {
    private productService = inject(ProductService);
    apiUrl = environment.apiUrl;


    products = signal<Product[]>([]);
    loading = signal(false);
    error = signal('');
    mostrarModal = signal(false);
    productoSeleccionado = signal<Product | null>(null);
    searchText = signal('');

    filteredProducts = computed(() => {
        const search = this.searchText().toLowerCase().trim();
        if (!search) return this.products();
        return this.products().filter(p => 
            p.name?.toLowerCase().includes(search) || 
            p.sku?.toLowerCase().includes(search)
        );
    });

    ngOnInit(): void {
        this.loadProducts();
    }

    loadProducts(): void {
        this.loading.set(true);
        this.productService.getAll().subscribe({
            next: (data) => {
                this.products.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Error al cargar productos');
                this.loading.set(false);
            }
        });
    }

    abrirModal(): void {
        this.productoSeleccionado.set(null);
        this.mostrarModal.set(true);
    }

    seleccionarProducto(producto: Product): void {
        this.productoSeleccionado.set(producto);
        this.mostrarModal.set(true);
    }

    cerrarModal(): void {
        this.mostrarModal.set(false);
        this.productoSeleccionado.set(null);
    }

    alGuardar(): void {
        this.mostrarModal.set(false);
        this.productoSeleccionado.set(null);
        this.loadProducts();
    }

    getCategoryLabel(category: string): string {
        const labels: Record<string, string> = {
            'LIVING_ROOM': 'Sala de Estar',
            'DINING_ROOM': 'Comedor',
            'BEDROOM': 'Dormitorio',
            'OFFICE': 'Oficina',
            'OUTDOOR': 'Exterior',
            'OTHER': 'Otro'
        };
        return labels[category] ?? category;
    }

    getProductImageUrl(imageUrl?: string): string | undefined {
        if (!imageUrl) return undefined;
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }
        return `${this.apiUrl}${imageUrl}`;
    }
}