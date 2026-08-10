import { Component, Output, EventEmitter, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../../core/services/product.service';
import { Product, CreateProductDto, ProductCategory } from '../../../../shared/models/product.model';
import { environment } from '../../../../../environments/environment';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { SharedModule } from 'primeng/api';

@Component({
    selector: 'app-product-form',
    standalone: true,
    imports: [CommonModule, FormsModule, Dialog, InputText, Button, SharedModule],
    templateUrl: './product-form.component.html',
    styleUrl: './product-form.component.css'
})
export class ProductFormComponent implements OnInit {
    visible = signal(true);
    private productService = inject(ProductService);

    @Input() producto: Product | null = null;
    @Output() cerrar = new EventEmitter<void>();
    @Output() guardado = new EventEmitter<void>();

    imagePreview = signal<string | null>(null);
    isUploadingImage = signal(false);
    esEdicion = signal(false);

    categorias: ProductCategory[] = [
        'LIVING_ROOM', 'DINING_ROOM', 'BEDROOM', 'OFFICE', 'OUTDOOR', 'OTHER'
    ];

    tasasIva: number[] = [0, 5, 15, 19];

    formData: CreateProductDto = {
        sku: '',
        name: '',
        description: '',
        category: 'OTHER',
        materialCost: 0,
        laborCost: 0,
        overheadCost: 0,
        profitMargin: 0,
        taxRate: 0,
        basePrice: 0,
        finalPrice: 0,
        isActive: true,
    };

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

    calculatePrice(): void {
        const material = Number(this.formData.materialCost) || 0;
        const labor = Number(this.formData.laborCost) || 0;
        const overhead = Number(this.formData.overheadCost) || 0;
        const margin = Number(this.formData.profitMargin) || 0;
        const tax = Number(this.formData.taxRate) || 0;

        const subtotal = material + labor + overhead;
        const profit = subtotal * (margin / 100);
        const beforeTax = subtotal + profit;
        const final = beforeTax * (1 + tax / 100);

        this.formData.basePrice = Math.round((beforeTax + Number.EPSILON) * 100) / 100;
        this.formData.finalPrice = Math.round((final + Number.EPSILON) * 100) / 100;
    }

    ngOnInit(): void {
        if (this.producto) {
            this.esEdicion.set(true);
            if (!this.tasasIva.includes(this.producto.taxRate)) {
                this.tasasIva.push(this.producto.taxRate);
                this.tasasIva.sort((a, b) => a - b);
            }
            this.formData = {
                sku: this.producto.sku,
                name: this.producto.name,
                description: this.producto.description ?? '',
                category: this.producto.category,
                materialCost: this.producto.materialCost,
                laborCost: this.producto.laborCost,
                overheadCost: this.producto.overheadCost,
                profitMargin: this.producto.profitMargin,
                taxRate: this.producto.taxRate,
                basePrice: this.producto.basePrice,
                finalPrice: this.producto.finalPrice,
                isActive: this.producto.isActive,
                imageUrl: this.producto.imageUrl 
                    ? (this.producto.imageUrl.startsWith('http') ? this.producto.imageUrl : `${environment.apiUrl}${this.producto.imageUrl}`) 
                    : undefined
            };
        }
    }

    onCerrar(): void {
        this.cerrar.emit();
    }

    onGuardar(): void {
        this.formData.taxRate = Number(this.formData.taxRate) || 0;
        this.formData.materialCost = Number(this.formData.materialCost) || 0;
        this.formData.laborCost = Number(this.formData.laborCost) || 0;
        this.formData.overheadCost = Number(this.formData.overheadCost) || 0;
        this.formData.profitMargin = Number(this.formData.profitMargin) || 0;
        this.formData.basePrice = Number(this.formData.basePrice) || 0;
        this.formData.finalPrice = Number(this.formData.finalPrice) || 0;

        if (this.esEdicion() && this.producto) {
            this.productService.update(this.producto.id, this.formData).subscribe({
                next: () => this.guardado.emit(),
                error: (err) => console.error('Error al actualizar:', err)
            });
        } else {
            this.productService.create(this.formData).subscribe({
                next: () => this.guardado.emit(),
                error: (err) => console.error('Error al crear:', err)
            });
        }
    }

    onEliminar(): void {
        if (this.producto) {
            this.productService.delete(this.producto.id).subscribe({
                next: () => this.guardado.emit(),
                error: (err) => console.error('Error al eliminar:', err)
            });
        }
    }

    onImageSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const file = input.files[0];

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = () => {
            this.imagePreview.set(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to backend
        this.isUploadingImage.set(true);
        this.productService.uploadImage(file).subscribe({
            next: (res) => {
                this.formData.imageUrl = res.imageUrl;
                this.isUploadingImage.set(false);
            },
            error: (err) => {
                console.error('Error uploading image:', err);
                this.isUploadingImage.set(false);
            }
        });
    }

    roundFinalPriceToTen(): void {
        const material = Number(this.formData.materialCost) || 0;
        const labor = Number(this.formData.laborCost) || 0;
        const overhead = Number(this.formData.overheadCost) || 0;
        const tax = Number(this.formData.taxRate) || 0;
        
        const subtotal = material + labor + overhead;
        if (subtotal === 0) return;

        const currentFinalPrice = this.formData.finalPrice;
        const targetFinalPrice = Math.round(currentFinalPrice / 10) * 10;
        
        const factor = 1 + tax / 100;
        const newMargin = ((targetFinalPrice / (subtotal * factor)) - 1) * 100;
        
        this.formData.profitMargin = Math.round((newMargin + Number.EPSILON) * 100) / 100;
        this.formData.basePrice = Math.round((targetFinalPrice / factor + Number.EPSILON) * 100) / 100;
        this.formData.finalPrice = targetFinalPrice;
    }
}