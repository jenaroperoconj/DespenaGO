
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonIcon,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonLabel,
  IonButton,
  IonList,
  IonListHeader,
  IonButtons,
  IonBackButton
} from '@ionic/angular/standalone';
import { SupabaseService } from 'src/app/core/supabase.service';
import { AgregarProductoModal } from './agregar-producto.modal';
import { EditarProductoModal } from './editar-producto.modal';
import { PopoverOpcionesComponent } from '../popover-opciones/popover-opciones.component';
import { ModalController } from '@ionic/angular';
import { PopoverController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-detalle-despensa',
  templateUrl: './detalle-despensa.page.html',
  styleUrls: ['./detalle-despensa.page.scss'],
  standalone: true,
  providers: [ModalController],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonItem,
    IonLabel,
    IonButton,
    IonList,
    IonListHeader,
    IonIcon,
    IonButtons,
    IonBackButton,
  ]
})
export class DetalleDespensaPage implements OnInit {
  despensaId!: string;
  nombreProducto: string = '';
  error: string | null = null;
  nombreDespensa: string = '';

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService, 
    private modalCtrl: ModalController, 
    private popoverCtrl: PopoverController
  ) {}

  ngOnInit() {
    this.despensaId = this.route.snapshot.paramMap.get('id')!;
    this.cargarProductos();
    this.cargarNombreDespensa();
  }

  producto = {
    nombre: '',
    categoria: '',
    origen: '',
    fecha_vencimiento: '',
    stock: 1
  };

  productos: any[] = [];
  async cargarProductos() {
    try {
      this.productos = await this.supabase.obtenerProductosDeDespensa(this.despensaId);
      console.log('Productos cargados:', this.productos);
    } catch (err: any) {
      this.error = err.message;
    }
  }

  async abrirModalAgregarProducto() {
    const modal = await this.modalCtrl.create({
      component: AgregarProductoModal,
      componentProps: {
        despensaId: this.despensaId
      }
    });

    modal.onDidDismiss().then((res) => {
      if (res.data === true) {
        this.cargarProductos();
      }
    });

    await modal.present();
  }

  async abrirModalEditarProducto(producto: any) {
    const modal = await this.modalCtrl.create({
      component: EditarProductoModal,
      componentProps: { producto }
    });

    modal.onDidDismiss().then((res) => {
      if (res.data === true) this.cargarProductos();
    });

    await modal.present();
  }

  async abrirPopover(ev: Event, producto: any) {
    const popover = await this.popoverCtrl.create({
      component: PopoverOpcionesComponent,
      event: ev,
      translucent: true,
      componentProps: { producto }
    });

    popover.onDidDismiss().then(() => {
      this.cargarProductos();
    });

    await popover.present();
  }
  async cargarNombreDespensa() {
    try {
      const { data, error } = await this.supabase.client
        .from('despensas')
        .select('nombre')
        .eq('id', this.despensaId)
        .single();

      if (error) throw error;
      this.nombreDespensa = data.nombre;
    } catch (err: any) {
      console.error('Error al obtener nombre de despensa:', err.message);
    }
  }

  esVencido(fecha: string): boolean {
    if (!fecha) return false;
    return new Date(fecha) < new Date();
  }

  esProntoAVencer(fecha: string, dias: number = 5): boolean {
    if (!fecha) return false;
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const limite = new Date(hoy);
    limite.setDate(hoy.getDate() + dias);
    return vencimiento >= hoy && vencimiento <= limite;
  }


}
