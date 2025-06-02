import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButtons,
  IonBackButton,
  AlertController
} from '@ionic/angular/standalone';
import { CarritoService } from 'src/app/core/carrito.service';

@Component({
  selector: 'app-lista-deseos',
  templateUrl: './lista-deseos.page.html',
  styleUrls: ['./lista-deseos.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButtons,
    IonBackButton
  ]
})
export class ListaDeseosPage implements OnInit {
  listaDeseos: any[] = [];
  error: string | null = null;
  cargando: boolean = false;

  constructor(
    private carritoService: CarritoService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.cargarListaDeseos();
  }

  ionViewWillEnter() {
    this.cargarListaDeseos();
  }

  async cargarListaDeseos() {
    try {
      this.cargando = true;
      this.error = null;
      this.listaDeseos = await this.carritoService.obtenerListaDeseos();
    } catch (err: any) {
      this.error = err.message || 'Error al cargar lista de deseos';
      console.error('Error:', err);
    } finally {
      this.cargando = false;
    }
  }

  async eliminarDeListaDeseos(item: any) {
    const alert = await this.alertController.create({
      header: 'Eliminar de Lista de Deseos',
      message: `¿Estás seguro de eliminar "${item.productos.nombre}" de tu lista de deseos?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: async () => {
            try {
              await this.carritoService.eliminarDeListaDeseos(item.id);
              await this.cargarListaDeseos();
            } catch (err: any) {
              await this.mostrarError('Error al eliminar: ' + err.message);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async actualizarCantidad(item: any) {
    const alert = await this.alertController.create({
      header: 'Actualizar Cantidad',
      message: `¿Cuántas unidades de "${item.productos.nombre}" necesitas?`,
      inputs: [
        {
          name: 'cantidad',
          type: 'number',
          placeholder: 'Cantidad',
          min: 1,
          value: item.cantidad
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Actualizar',
          handler: async (data) => {
            const nuevaCantidad = parseInt(data.cantidad);
            if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
              await this.mostrarError('Cantidad no válida');
              return false;
            }

            try {
              await this.carritoService.actualizarCantidadEnListaDeseos(item.id, nuevaCantidad);
              await this.cargarListaDeseos();
            } catch (err: any) {
              await this.mostrarError('Error al actualizar: ' + err.message);
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async mostrarError(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: mensaje,
      buttons: ['Entendido']
    });
    await alert.present();
  }
}
