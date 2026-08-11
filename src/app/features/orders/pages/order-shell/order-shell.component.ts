import { Component, inject, signal, OnInit, computed, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { jsPDF } from 'jspdf';
import { Steps } from 'primeng/steps';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { SplitButton } from 'primeng/splitbutton';
import { MenuItem, MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { CustomerSearchModalComponent } from './components/customer-search-modal/customer-search-modal.component';
import { Client } from '../../../../shared/models/client.model';
import { OrderQuoteStepComponent } from '../../components/order-quote-step/order-quote-step.component';
import { QuoteService } from '../../../../core/services/quote.service';
import { CustomStepperComponent, StepItem } from './components/custom-stepper/custom-stepper.component';
import { OrderLiquidacionesComponent } from '../../components/order-liquidaciones/order-liquidaciones.component';
import { SalesOrderService } from '../../../../core/services/sales-order.service';

@Component({
  selector: 'app-order-shell',
  standalone: true,
  providers: [MessageService],
  imports: [
    CommonModule,
    FormsModule,
    Steps,
    Card,
    Button,
    Tag,
    SplitButton,
    CustomerSearchModalComponent,
    OrderQuoteStepComponent,
    CustomStepperComponent,
    OrderLiquidacionesComponent,
    Toast
  ],
  templateUrl: './order-shell.component.html',
  styleUrl: './order-shell.component.css'
})
export class OrderShellComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quoteService = inject(QuoteService);
  private messageService = inject(MessageService);
  private salesOrderService = inject(SalesOrderService);

  liquidacionesComponent = viewChild(OrderLiquidacionesComponent);

  quoteId = signal<number | null>(null);
  quoteStatus = signal<string>('DRAFT');
  salesOrderStatus = signal<string | null>(null);
  salesOrderId = signal<number | null>(null);
  // Información de ejemplo del pedido
  orderId = signal<string>('PED-1082');
  clientName = signal<string>('Juan Pérez');
  productName = signal<string>('Closet Modular');

  currentStepIndex = signal<number>(0); // Iniciamos en Proforma (Paso 1, índice 0)

  // Estados del pago / cliente
  selectedClient = signal<Client | null>(null);
  isOpenClientSearch = signal<boolean>(false);
  total = signal<number>(0);
  selectedPaymentMethod = signal<string>('Pago Completado');

  stepItems: MenuItem[] = [
    { label: 'Proforma', icon: 'pi pi-file' },
    { label: 'Liquidación', icon: 'pi pi-wallet' },
    { label: 'Taller', icon: 'pi pi-cog' }
  ];

  customSteps = computed<StepItem[]>(() => {
    const active = this.currentStepIndex();
    const status = this.quoteStatus();

    const proformaBadgeMap: Record<string, { label: string, severity: string }> = {
      'DRAFT': { label: 'Borrador', severity: 'info' },
      'SENT': { label: 'Enviada', severity: 'success' },
      'ACCEPTED': { label: 'Aprobada', severity: 'success' },
      'REJECTED': { label: 'Rechazada', severity: 'danger' }
    };

    const proformaStatus = proformaBadgeMap[status] || { label: 'Borrador', severity: 'info' };

    const salesStatus = this.salesOrderStatus();
    const liquidacionLabels: Record<string, string> = {
      'PENDING': 'Por Pagar',
      'DEPOSIT_PAID': 'Abonado',
      'DELIVERED': 'Entregado',
      'COMPLETED': 'Completado',
      'VOIDED': 'Anulado'
    };
    const liquidacionBadge = salesStatus ? (liquidacionLabels[salesStatus] || salesStatus) : (active === 1 ? 'Activo' : (active > 1 ? 'Listo' : 'Pendiente'));
    const liquidacionSeverity = salesStatus ? (salesStatus === 'VOIDED' ? 'danger' : (salesStatus === 'COMPLETED' || salesStatus === 'DELIVERED' ? 'success' : 'info')) : (active === 1 ? 'info' : (active > 1 ? 'success' : 'warn'));

    return [
      {
        label: 'Proforma',
        key: 'A',
        badge: proformaStatus.label,
        badgeSeverity: proformaStatus.severity
      },
      {
        label: 'Liquidación',
        key: 'B',
        badge: liquidacionBadge,
        badgeSeverity: liquidacionSeverity,
        disabled: status === 'DRAFT'
      },
      {
        label: 'Fábrica / Taller',
        key: 'C',
        badge: active === 2 ? 'Activo' : 'Pendiente',
        badgeSeverity: active === 2 ? 'info' : 'warn',
        disabled: status === 'DRAFT' || status === 'SENT' || status === 'REJECTED'
      }
    ];
  });

  confirmActionItems: MenuItem[] = [
    {
      label: 'Enviar',
      icon: 'pi pi-send',
      command: () => {
        this.sendQuote();
      }
    },
    {
      label: 'Generar PDF',
      icon: 'pi pi-file-pdf',
      command: () => {
        this.openPdfDirectly();
      }
    },
    {
      label: 'No aprobada',
      icon: 'pi pi-thumbs-down',
      command: () => {
        if (this.quoteStatus() !== 'SENT') {
          this.messageService.add({
            severity: 'warn',
            summary: 'Acción Requerida',
            detail: 'Por favor, primero envíe la proforma al cliente antes de rechazarla.'
          });
          return;
        }
        this.quoteStatus.set('REJECTED');
        const id = this.quoteId();
        if (id) {
          this.quoteService.updateStatus(id, 'REJECTED').subscribe({
            next: (updatedQuote) => console.log('Status updated to REJECTED:', updatedQuote),
            error: (err) => console.error('Error updating status to REJECTED:', err)
          });
        }
      }
    }
  ];

  paymentActionItems: MenuItem[] = [
    {
      label: 'Registrar Pago',
      icon: 'pi pi-plus',
      command: () => {
        this.liquidacionesComponent()?.isPaymentModalVisible.set(true);
      }
    },
    {
      label: 'Generar PDF de Pagos',
      icon: 'pi pi-file-pdf',
      command: () => {
        this.generatePaymentsPdf();
      }
    }
  ];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && id !== 'new') {
        this.quoteId.set(Number(id));
        if (id.startsWith('PED-') || id.includes('-')) {
          this.orderId.set(id);
        } else {
          this.orderId.set('PED-' + id);
        }

        this.quoteService.getById(Number(id)).subscribe({
          next: (quote) => {
            this.clientName.set(`${quote.client.firstName} ${quote.client.lastName}`);
            this.selectedClient.set(quote.client);
            this.quoteStatus.set(quote.status);
            this.salesOrderStatus.set(quote.salesOrder?.status || null);
            this.salesOrderId.set(quote.salesOrder?.id || null);

            // Redireccionar al paso según el estado cargado
            if (quote.status === 'ACCEPTED') {
              this.currentStepIndex.set(1);
            } else {
              this.currentStepIndex.set(0);
            }
          },
          error: (err) => console.error('Error loading order/quote in shell:', err)
        });
      } else {
        this.quoteId.set(null);
        this.orderId.set('PED-Nuevo');
        this.clientName.set('Sin Asignar');
        this.selectedClient.set(null);
        this.currentStepIndex.set(0); // Comienza en Paso 1 (Proforma) para crear el pedido
      }
    });
  }

  nextStep(): void {
    if (this.currentStepIndex() < 2) {
      this.currentStepIndex.update(idx => idx + 1);
    }
  }

  prevStep(): void {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update(idx => idx - 1);
    }
  }

  openClientSearch(): void {
    this.isOpenClientSearch.set(true);
  }

  onClientSelected(client: Client): void {
    this.selectedClient.set(client);
    this.isOpenClientSearch.set(false);

    // Si es un pedido nuevo, creamos la proforma
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'new') {
      this.quoteService.create({ clientId: client.id }).subscribe({
        next: (quote) => {
          // Redireccionar al ID de la proforma creada
          this.router.navigate(['/orders', quote.id]);
        },
        error: (err) => console.error('Error al crear proforma:', err)
      });
    }
  }

  seleccionarMetodo(metodo: string): void {
    this.selectedPaymentMethod.set(`Pagar con ${metodo}`);
  }

  onConfirmarPago(): void {
    const orderId = this.salesOrderId();
    if (!orderId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No hay una orden de venta activa para completar.'
      });
      return;
    }

    this.salesOrderService.complete(orderId).subscribe({
      next: (updatedOrder) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Orden Completada',
          detail: 'La orden de venta ha sido completada exitosamente.'
        });
        this.salesOrderStatus.set(updatedOrder.status);
        const quoteId = this.quoteId();
        if (quoteId) {
          this.liquidacionesComponent()?.loadSalesOrder(quoteId);
        }
      },
      error: (err) => {
        console.error('Error completing sales order:', err);
        const errMsg = err.error?.message || 'No se puede completar la orden de venta.';
        this.messageService.add({
          severity: 'warn',
          summary: 'Saldo Pendiente',
          detail: `${errMsg}`
        });
      }
    });
  }

  onConfirmar(): void {
    if (this.quoteStatus() !== 'SENT') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Acción Requerida',
        detail: 'Por favor, primero envíe la proforma al cliente antes de aprobarla.'
      });
      return;
    }
    this.quoteStatus.set('ACCEPTED');
    const id = this.quoteId();
    if (id) {
      this.quoteService.updateStatus(id, 'ACCEPTED').subscribe({
        next: (updatedQuote) => {
          console.log('Status updated to ACCEPTED:', updatedQuote);
          this.nextStep();
        },
        error: (err) => console.error('Error updating status to ACCEPTED:', err)
      });
    } else {
      this.nextStep();
    }
  }

  onSalesOrderLoaded(salesOrder: any): void {
    this.salesOrderStatus.set(salesOrder?.status || null);
    this.salesOrderId.set(salesOrder?.id || null);
  }

  generateProformaPdf(quoteId: number, client: Client, items: any[], discountPercent: number): Blob {
    const doc = new jsPDF();

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text('APP CONFORT', 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    doc.setFont('helvetica', 'normal');
    doc.text('Soluciones de Confort y Muebles para tu hogar', 20, 26);
    doc.text('Teléfono: +593 98 896 3746', 20, 31);
    doc.text('Ecuador', 20, 36);

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 42, 190, 42);

    // Proforma Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text(`PROFORMA #${quoteId}`, 20, 52);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 140, 52);

    // Client Section
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 20, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${client.firstName} ${client.lastName}`, 20, 71);
    doc.text(`C.I. / NUI: ${client.nui}`, 20, 76);
    if (client.mobile) {
      doc.text(`Teléfono: ${client.mobile}`, 20, 81);
    }
    if (client.email) {
      doc.text(`Email: ${client.email}`, 20, 86);
    }

    // Table Header
    doc.setFillColor(41, 128, 185);
    doc.rect(20, 95, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Descripción del Producto', 23, 100);
    doc.text('Cant.', 120, 100);
    doc.text('P. Unit', 140, 100);
    doc.text('Subtotal', 165, 100);

    // Table Body
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'normal');
    let yPos = 110;
    items.forEach((item) => {
      doc.text(item.product.name, 23, yPos);
      doc.text(item.quantity.toString(), 122, yPos);
      const unitPrice = Number(item.unitPrice || (item.subtotal / item.quantity));
      doc.text(`$${unitPrice.toFixed(2)}`, 140, yPos);
      doc.text(`$${Number(item.subtotal).toFixed(2)}`, 165, yPos);

      doc.setDrawColor(240, 240, 240);
      doc.line(20, yPos + 3, 190, yPos + 3);
      yPos += 10;
    });

    // Totals
    const subtotalVal = items.reduce((acc, item) => acc + parseFloat(item.subtotal), 0);
    const discountAmount = subtotalVal * (discountPercent / 100);
    const subtotalWithDiscount = subtotalVal - discountAmount;
    const ivaVal = subtotalWithDiscount * 0.15;
    const finalTotalVal = subtotalWithDiscount + ivaVal;

    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 120, yPos);
    doc.text(`USD ${subtotalVal.toFixed(2)}`, 165, yPos);

    if (discountPercent > 0) {
      yPos += 7;
      doc.setTextColor(220, 53, 69);
      doc.text(`Descuento (${discountPercent}%):`, 120, yPos);
      doc.text(`-USD ${discountAmount.toFixed(2)}`, 165, yPos);
      doc.setTextColor(44, 62, 80);

      yPos += 7;
      doc.text('Subtotal c/Desc:', 120, yPos);
      doc.text(`USD ${subtotalWithDiscount.toFixed(2)}`, 165, yPos);
    }

    yPos += 7;
    doc.text('IVA (15%):', 120, yPos);
    doc.text(`USD ${ivaVal.toFixed(2)}`, 165, yPos);

    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Total a Pagar:', 120, yPos);
    doc.text(`USD ${finalTotalVal.toFixed(2)}`, 165, yPos);

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text('Gracias por su confianza.', 20, 275);
    doc.text('Documento digital no válido como factura.', 130, 275);

    return doc.output('blob');
  }

  sendQuote(): void {
    const id = this.quoteId();
    const client = this.selectedClient();
    if (!id || !client) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'Debe seleccionar un cliente y tener una cotización activa.'
      });
      return;
    }

    // Load both latest quote details and items
    forkJoin({
      quote: this.quoteService.getById(id),
      items: this.quoteService.getItems(id)
    }).subscribe({
      next: ({ quote, items }) => {
        if (!items || items.length === 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Sin items',
            detail: 'La proforma debe tener al menos un producto para poder ser enviada.'
          });
          return;
        }

        const discountPercent = parseFloat(quote.discountPercent || '0');
        const subtotal = items.reduce((acc, item) => acc + parseFloat(item.subtotal), 0);
        const discountAmount = subtotal * (discountPercent / 100);
        const finalTotal = (subtotal - discountAmount) * 1.15;

        const pdfBlob = this.generateProformaPdf(id, client, items, discountPercent);

        this.messageService.add({
          severity: 'info',
          summary: 'Generando PDF',
          detail: 'Subiendo la proforma e iniciando WhatsApp...'
        });

        this.quoteService.uploadPdf(id, pdfBlob).subscribe({
          next: ({ pdfUrl }) => {
            this.quoteStatus.set('SENT');
            this.quoteService.updateStatus(id, 'SENT').subscribe({
              next: () => {
                let phone = client.mobile ? client.mobile.replace(/\D/g, '') : '';
                if (phone) {
                  if (phone.startsWith('0')) {
                    phone = '593' + phone.substring(1);
                  } else if (!phone.startsWith('593') && phone.length === 9) {
                    phone = '593' + phone;
                  }
                } else {
                  phone = '593982753690';
                }

                const message = encodeURIComponent(
                  `Hola ${client.firstName} ${client.lastName}, te compartimos la proforma de tu cotización por un valor total de USD ${finalTotal.toFixed(2)} (IVA incl.) en el siguiente enlace: ${pdfUrl}`
                );

                const urlWhatsApp = `https://api.whatsapp.com/send?phone=${phone}&text=${message}`;
                window.open(urlWhatsApp, '_blank');
              },
              error: (err) => console.error('Error updating status to SENT:', err)
            });
          },
          error: (err) => {
            console.error('Error al subir PDF:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo generar o subir el PDF de la proforma.'
            });
          }
        });
      },
      error: (err) => console.error('Error al obtener items para PDF:', err)
    });
  }

  openPdfDirectly(): void {
    const id = this.quoteId();
    const client = this.selectedClient();
    if (!id || !client) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'Debe seleccionar un cliente y tener una cotización activa.'
      });
      return;
    }

    forkJoin({
      quote: this.quoteService.getById(id),
      items: this.quoteService.getItems(id)
    }).subscribe({
      next: ({ quote, items }) => {
        if (!items || items.length === 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Sin items',
            detail: 'La proforma debe tener al menos un producto para poder generar el PDF.'
          });
          return;
        }

        const discountPercent = parseFloat(quote.discountPercent || '0');
        const pdfBlob = this.generateProformaPdf(id, client, items, discountPercent);
        
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');
      },
      error: (err) => {
        console.error('Error al generar PDF directamente:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo generar el PDF de la proforma.'
        });
      }
    });
  }

  generatePaymentsPdf(): void {
    const component = this.liquidacionesComponent();
    const salesOrder = component?.salesOrder();
    const client = this.selectedClient();
    
    if (!salesOrder || !client) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'No hay información de liquidación o cliente seleccionada.'
      });
      return;
    }

    const payments = salesOrder.payments || [];
    if (payments.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin pagos',
        detail: 'No hay ningún pago registrado para generar el recibo.'
      });
      return;
    }

    const doc = new jsPDF();

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text('APP CONFORT', 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    doc.setFont('helvetica', 'normal');
    doc.text('Soluciones de Confort y Muebles para tu hogar', 20, 26);
    doc.text('Ecuador', 20, 31);

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 36, 190, 36);

    // Document Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text(`COMPROBANTE DE PAGOS - ORDEN #${salesOrder.number}`, 20, 46);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 140, 46);

    // Client Section
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 20, 58);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${client.firstName} ${client.lastName}`, 20, 64);
    doc.text(`C.I. / NUI: ${client.nui}`, 20, 69);
    if (client.mobile) {
      doc.text(`Teléfono: ${client.mobile}`, 20, 74);
    }

    // Payments Header
    doc.setFillColor(41, 128, 185);
    doc.rect(20, 83, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Método de Pago', 23, 88);
    doc.text('Fecha / Hora', 85, 88);
    doc.text('Monto', 165, 88);

    // Payments Body
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'normal');
    let yPos = 98;

    const getPaymentMethodLabel = (method: string): string => {
      switch (method) {
        case 'CASH': return 'Efectivo';
        case 'BANK_TRANSFER': return 'Transferencia Bancaria';
        case 'CREDIT_CARD': return 'Tarjeta de Crédito';
        case 'DEBIT_CARD': return 'Tarjeta de Débito';
        case 'CHECK': return 'Cheque';
        default: return method;
      }
    };

    payments.forEach((payment: any) => {
      const methodLabel = getPaymentMethodLabel(payment.paymentMethod);
      const paymentDate = new Date(payment.createdAt).toLocaleString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const amountLabel = `$${Number(payment.amount).toFixed(2)}`;

      doc.text(methodLabel, 23, yPos);
      doc.text(paymentDate, 85, yPos);
      doc.text(amountLabel, 165, yPos);

      if (payment.notes) {
        yPos += 5;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(127, 140, 141);
        doc.text(`Notas: ${payment.notes}`, 23, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(44, 62, 80);
      }

      doc.setDrawColor(240, 240, 240);
      doc.line(20, yPos + 3, 190, yPos + 3);
      yPos += 10;
    });

    // Summary Totals
    const totalPaid = payments.reduce((acc: number, p: any) => acc + parseFloat(p.amount), 0);
    const quoteTotal = parseFloat(salesOrder.quoteTotal || '0');
    const balance = quoteTotal - totalPaid;

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Proforma:', 110, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`USD ${quoteTotal.toFixed(2)}`, 165, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('Total Pagado:', 110, yPos);
    doc.text(`USD ${totalPaid.toFixed(2)}`, 165, yPos);

    yPos += 7;
    doc.setTextColor(220, 53, 69);
    doc.text('Saldo Pendiente:', 110, yPos);
    doc.text(`USD ${Math.max(0, balance).toFixed(2)}`, 165, yPos);

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text('Comprobante generado digitalmente.', 20, 275);

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  }
}

