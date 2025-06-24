import { Component, Input } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { IonList, IonItem, IonLabel, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';
@Component({
  selector: 'app-popover-opciones-lista-compras',
  template: `
    <ion-list class="popover-list">
      <ion-item button (click)="editar()">
        <ion-icon name="create-outline" slot="start"></ion-icon>
        <ion-label>Editar</ion-label>
      </ion-item>
      <ion-item button class="danger" (click)="eliminar()">
        <ion-icon name="trash-outline" slot="start"></ion-icon>
        <ion-label>Eliminar</ion-label>
      </ion-item>
    </ion-list>
  `,
  standalone: true,
  imports: [IonList, IonItem, IonLabel, IonIcon]
})
export class PopoverOpcionesListaComprasComponent {
  @Input() item: any;
  constructor(private popoverCtrl: PopoverController) {
    addIcons({ createOutline, trashOutline });
  }
  editar() {
    this.popoverCtrl.dismiss('editar');
  }
  eliminar() {
    this.popoverCtrl.dismiss('eliminar');
  }
} 