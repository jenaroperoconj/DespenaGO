import { Component, Input } from '@angular/core';
import { ModalController, PopoverController } from '@ionic/angular';
import { EditarProductoModal } from '../detalle-despensa/editar-producto.modal';
import { ConsumirProductoModal } from '../detalle-despensa/consumir-producto.modal';
import { SupabaseService } from 'src/app/core/supabase.service';
import { IonList, IonItem, IonLabel, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { removeOutline, createOutline, trashOutline } from 'ionicons/icons';
@Component({
  selector: 'app-popover-opciones',
  templateUrl: './popover-opciones.component.html',
  styleUrls: ['./popover-opciones.component.scss'],
  standalone: true,
  providers: [ModalController, PopoverController],
  imports: [
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
  ]
})
export class PopoverOpcionesComponent {
  @Input() producto: any;
  
  constructor(
    private modalCtrl: ModalController,
    private popoverCtrl: PopoverController,
    private supabase: SupabaseService
  ) {
    addIcons({
      removeOutline,
      createOutline,
      trashOutline
    });
  }

  
  async consumir() {
    const modal = await this.modalCtrl.create({
      component: ConsumirProductoModal,
      componentProps: { producto: this.producto }
    });

    modal.onDidDismiss().then((res) => {
      this.popoverCtrl.dismiss(true);
    });

    await modal.present();
  }

  async editar() {
    const modal = await this.modalCtrl.create({
      component: EditarProductoModal,
      componentProps: { producto: this.producto }
    });

    modal.onDidDismiss().then(() => {
      this.popoverCtrl.dismiss(true);
    });

    await modal.present();
  }

  confirmarEliminar() {
    if (confirm(`¿Eliminar el producto "${this.producto.productos.nombre}"?`)) {
      this.supabase.eliminarProductoDeDespensa(this.producto.id).then(() => {
        this.popoverCtrl.dismiss(true);
      });
    }
  }
}
