import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FurnitureSetService } from '../../../../core/services/furniture-set.service';
import { FurnitureSet } from '../../../../shared/models/furniture-set.model';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { FurnitureSetFormComponent } from '../../components/furniture-set-form/furniture-set-form.component';

@Component({
    selector: 'app-furniture-set-list',
    standalone: true,
    imports: [CommonModule, TableModule, Button, Tag, FurnitureSetFormComponent],
    templateUrl: './furniture-set-list.component.html',
    styleUrl: './furniture-set-list.component.css'
})
export class FurnitureSetListComponent implements OnInit {
    private furnitureSetService = inject(FurnitureSetService);

    furnitureSets = signal<FurnitureSet[]>([]);
    loading = signal(false);
    error = signal('');
    mostrarModal = signal(false);
    juegoSeleccionado = signal<FurnitureSet | null>(null);

    ngOnInit(): void {
        this.loadFurnitureSets();
    }

    loadFurnitureSets(): void {
        this.loading.set(true);
        this.furnitureSetService.getAll().subscribe({
            next: (data) => {
                this.furnitureSets.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Error al cargar los juegos de muebles');
                this.loading.set(false);
            }
        });
    }

    abrirModal(): void {
        this.juegoSeleccionado.set(null);
        this.mostrarModal.set(true);
    }

    seleccionarJuego(set: FurnitureSet): void {
        this.juegoSeleccionado.set(set);
        this.mostrarModal.set(true);
    }

    cerrarModal(): void {
        this.mostrarModal.set(false);
        this.juegoSeleccionado.set(null);
    }

    alGuardar(): void {
        this.mostrarModal.set(false);
        this.juegoSeleccionado.set(null);
        this.loadFurnitureSets();
    }
}
