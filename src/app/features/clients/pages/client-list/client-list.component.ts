import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ClientService } from '../../../../core/services/client.service';
import { Client } from '../../../../shared/models/client.model';
import { CommonModule } from '@angular/common';
import { ClientFormComponent } from '../client-form/client-form.component';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';

@Component({
    selector: 'app-client-list',
    standalone: true,
    imports: [CommonModule, ClientFormComponent, TableModule, Button, FormsModule, InputText],
    templateUrl: './client-list.component.html',
    styleUrl: './client-list.component.css'
})
export class ClientListComponent implements OnInit {
    private clientService = inject(ClientService);
    clients = signal<Client[]>([]);
    loading = signal(false);
    error = '';
    mostrarModal = signal(false);
    clienteSeleccionado = signal<Client | null>(null);
    searchText = signal('');

    filteredClients = computed(() => {
        const search = this.searchText().toLowerCase().trim();
        if (!search) return this.clients();
        return this.clients().filter(c => {
            const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
            const nui = (c.nui || '').toLowerCase();
            return fullName.includes(search) || nui.includes(search);
        });
    });

    ngOnInit(): void {
        this.loadClients();
    }

    loadClients(): void {
        this.loading.set(true);
        this.clientService.getAll().subscribe({
            next: (data) => {
                this.clients.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                this.error = 'Error al cargar clientes';
                this.loading.set(false);
            }
        });
    }
    abrirModal(): void {
        this.clienteSeleccionado.set(null);
        this.mostrarModal.set(true);
    }

    seleccionarCliente(cliente: Client): void {
        this.clienteSeleccionado.set(cliente); // ← modo edición
        this.mostrarModal.set(true);
    }
    cerrarModal(): void {
        this.mostrarModal.set(false);
    }
    alGuardar(): void {
        this.mostrarModal.set(false);
        this.loadClients();
    }
}