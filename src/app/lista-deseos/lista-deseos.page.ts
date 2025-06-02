import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  IonGrid,
  IonRow,
  IonCol,
  IonChip,
  IonRefresher,
  IonRefresherContent,
  AlertController
} from '@ionic/angular/standalone';
import { SupabaseService } from 'src/app/core/supabase.service';
import { addIcons } from 'ionicons';
import { 
  listOutline, 
  homeOutline, 
  bagOutline, 
  refreshOutline, 
  cartOutline,
  personOutline,
  shieldOutline,
  eyeOutline,
  arrowDownOutline, addOutline } from 'ionicons/icons';

@Component({
  selector: 'app-lista-compras',
  templateUrl: './lista-deseos.page.html',
  styleUrls: ['./lista-deseos.page.scss'],
  standalone: true,  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonLabel,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonButtons,
    IonBackButton,
    IonGrid,
    IonRow,
    IonCol,
    IonChip,
    IonRefresher,
    IonRefresherContent
  ]
})
export class ListaDeseosPage implements OnInit {
  despensas: any[] = [];
  error: string | null = null;
  loading: boolean = false;
  
  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private alertController: AlertController
  ) {
    addIcons({cartOutline,homeOutline,bagOutline,listOutline,addOutline,refreshOutline,personOutline,shieldOutline,eyeOutline,arrowDownOutline});
  }

  ngOnInit() {
    this.cargarDespensas();
  }

  ionViewWillEnter() {
    this.cargarDespensas();
  }

  async cargarDespensas() {
    try {
      this.loading = true;
      this.error = null;
      this.despensas = await this.supabaseService.obtenerDespensasUsuario();
    } catch (err: any) {
      this.error = err.message || 'Error al cargar despensas';
      console.error('Error:', err);
    } finally {
      this.loading = false;
    }
  }

  async doRefresh(event: any) {
    await this.cargarDespensas();
    event.target.complete();
  }

  irAListaComprasDespensa(despensaId: string) {
    this.router.navigate(['/lista-compras', despensaId]);
  }

  getRoleColor(rol: string): string {
    switch (rol) {
      case 'propietario':
        return 'primary';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'medium';
      default:
        return 'medium';
    }
  }

  getRoleIcon(rol: string): string {
    switch (rol) {
      case 'propietario':
        return 'shield-outline';
      case 'editor':
        return 'person-outline';
      case 'viewer':
        return 'eye-outline';
      default:
        return 'person-outline';
    }
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
