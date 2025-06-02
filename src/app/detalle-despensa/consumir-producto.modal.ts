import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { SupabaseService } from 'src/app/core/supabase.service';
import { CarritoService } from 'src/app/core/carrito.service';
import { 
  IonIcon, 
  IonButton, 
  IonChip 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  restaurantOutline, 
  closeOutline, 
  removeOutline, 
  addOutline, 
  alertCircleOutline, 
  checkmarkOutline 
} from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-consumir-producto-modal',  template: `
    <div class="overlay-blur" (click)="onOverlayClick($event)">
      <div class="form-modal">
        <div class="form-container" (click)="$event.stopPropagation()">
          <div class="form-header">
            <h2>
              <ion-icon name="restaurant-outline"></ion-icon>
              Consumir Producto
            </h2>
            <button class="close-button" (click)="dismiss()">
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>

          <div class="form-content">
            <div class="product-info">
              <h3>{{ producto?.productos?.nombre }}</h3>
              <div class="stock-indicator">
                <span class="stock-text">Stock disponible: {{ producto?.stock }} unidades</span>
              </div>
            </div>

            <div class="quantity-control">
              <button 
                class="quantity-button" 
                (click)="decrementar()"
                [disabled]="cantidad <= 1">
                <ion-icon name="remove-outline"></ion-icon>
              </button>
              
              <div class="quantity-display">
                <div class="quantity-value">{{ cantidad }}</div>
                <div class="quantity-label">unidades</div>
              </div>
              
              <button 
                class="quantity-button" 
                (click)="incrementar()"
                [disabled]="cantidad >= (producto?.stock || 1)">
                <ion-icon name="add-outline"></ion-icon>
              </button>
            </div>

            <div class="message-container" *ngIf="error">
              <ion-chip class="error-chip">
                <ion-icon name="alert-circle-outline"></ion-icon>
                {{ error }}
              </ion-chip>
            </div>

            <div class="form-buttons">
              <ion-button 
                class="primary-button" 
                expand="block"
                (click)="confirmarConsumo()"
                [disabled]="cantidad <= 0 || cantidad > (producto?.stock || 0)">
                <ion-icon name="checkmark-outline" slot="start"></ion-icon>
                Consumir {{ cantidad }} unidad{{ cantidad > 1 ? 'es' : '' }}
              </ion-button>
              
              <ion-button 
                class="secondary-button" 
                expand="block"
                (click)="dismiss()">
                Cancelar
              </ion-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonButton,
    IonChip
  ]
})
export class ConsumirProductoModal {
  @Input() producto: any;
  @Input() despensaId!: string;
  @Input() despensaId!: string;
  cantidad: number = 1;
  error: string | null = null;  constructor(
    private modalCtrl: ModalController, 
    private supabase: SupabaseService,
    private carritoService: CarritoService
  ) {
    addIcons({
      restaurantOutline,
      closeOutline,
      removeOutline,
      addOutline,
      alertCircleOutline,
      checkmarkOutline
    });
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.dismiss();
    }
  }

  incrementar() {
    if (this.cantidad < (this.producto?.stock || 1)) {
      this.cantidad++;
      this.error = null;
    }
  }

  decrementar() {
    if (this.cantidad > 1) {
      this.cantidad--;
      this.error = null;
    }
  }

  validarCantidad() {
    if (this.cantidad <= 0) {
      this.cantidad = 1;
    } else if (this.cantidad > (this.producto?.stock || 1)) {
      this.cantidad = this.producto?.stock || 1;
    }
    this.error = null;
  }
  async confirmarConsumo() {
    if (this.cantidad <= 0 || isNaN(this.cantidad)) {
      this.error = 'Cantidad no válida';
      return;
    }

    try {
    try {
      const nuevoStock = this.producto.stock - this.cantidad;

      if (nuevoStock <= 0) {
        // Si el stock llega a 0 o menos, eliminar el producto de la despensa
        await this.supabase.eliminarProductoDeDespensa(this.producto.id);
        
        // Verificar stock agotado y ofrecer agregar a lista de compras
        await this.carritoService.verificarStockAgotado(
          this.producto.id,
          0,
          this.despensaId,
          this.producto.productos.id,
          this.producto.productos.nombre
        );
      } else {
        // Si queda stock, actualizar la cantidad
        const { error } = await this.supabase.client
          .from('producto_despensa')
          .update({ stock: nuevoStock })
          .eq('id', this.producto.id);

        if (error) {
          this.error = error.message;
          return;
        }
      }
        if (error) {
          this.error = error.message;
          return;
        }
      }

      this.dismiss(true);
    } catch (err: any) {
      this.error = err.message || 'Error al consumir producto';
    }
      this.dismiss(true);
    } catch (err: any) {
      this.error = err.message || 'Error al consumir producto';
    }
  }

  dismiss(success = false) {
    this.modalCtrl.dismiss(success);
  }
}
