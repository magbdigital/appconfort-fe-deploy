import { Component, Output, EventEmitter, inject, Input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../../../core/services/client.service';
import { Client } from '../../../../shared/models/client.model';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { SharedModule } from 'primeng/api';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, InputText, Button, SharedModule],
  templateUrl: './client-form.component.html',
  styleUrl: './client-form.component.css' // stylesheet reference
})
export class ClientFormComponent implements OnInit {
  private clientService = inject(ClientService);
  @Input() cliente: Client | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  esEdicion = signal(false);
  visible = signal(true);
  errorMsg = signal<string | null>(null);
  confirmarEliminar = signal(false);
  private resetTimeout: any;

  formData = {
    nui: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
  };

  ngOnInit(): void {
    if (this.cliente) {
      this.esEdicion.set(true);
      this.formData = {
        nui: this.cliente.nui,
        firstName: this.cliente.firstName,
        lastName: this.cliente.lastName,
        email: this.cliente.email ?? '',
        mobile: this.cliente.mobile ?? '',
      };
    }
  }

  onCerrar(): void {
    if (this.resetTimeout) clearTimeout(this.resetTimeout);
    this.confirmarEliminar.set(false);
    this.cerrar.emit();
  }

  onGuardar(): void {
    this.errorMsg.set(null);
    if (this.esEdicion() && this.cliente) {
      this.clientService.update(this.cliente.id, this.formData).subscribe({
        next: () => this.guardado.emit(),
        error: (err) => {
          console.error('Error al actualizar:', err);
          const backendMsg = err?.error?.message || err?.message || 'Error al actualizar el cliente';
          this.errorMsg.set(backendMsg);
        }
      });
    } else {
      this.clientService.create(this.formData).subscribe({
        next: () => this.guardado.emit(),
        error: (err) => {
          console.error('Error al crear:', err);
          const backendMsg = err?.error?.message || err?.message || 'Error al crear el cliente';
          this.errorMsg.set(backendMsg);
        }
      });
    }
  }

  onEliminar(): void {
    this.errorMsg.set(null);
    if (!this.confirmarEliminar()) {
      this.confirmarEliminar.set(true);
      
      if (this.resetTimeout) clearTimeout(this.resetTimeout);
      this.resetTimeout = setTimeout(() => {
        this.confirmarEliminar.set(false);
      }, 4000);
      
      return;
    }

    if (this.resetTimeout) clearTimeout(this.resetTimeout);
    this.confirmarEliminar.set(false);

    if (this.cliente) {
      this.clientService.delete(this.cliente.id).subscribe({
        next: () => this.guardado.emit(),
        error: (err) => {
          console.error('Error al eliminar:', err);
          const backendMsg = err?.error?.message || err?.message || 'Error al eliminar el cliente';
          this.errorMsg.set(backendMsg);
        }
      });
    }
  }
}