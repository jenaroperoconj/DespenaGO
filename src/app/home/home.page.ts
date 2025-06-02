import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonButton,
  IonChip,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonBadge,
  IonFab,
  IonFabButton,
  IonButtons,
  IonMenuButton
} from '@ionic/angular/standalone';
import { SupabaseService } from '../core/supabase.service';
import { InvitacionesPendientesModal } from '../invitaciones/invitaciones-pendientes.modal';
import { addIcons } from 'ionicons';
import { 
  homeOutline, 
  timeOutline, 
  warningOutline, 
  statsChartOutline,
  gridOutline,
  listOutline,
  heartOutline,
  addOutline,
  refreshOutline,
  chevronForwardOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  bagHandleOutline, notificationsOutline, flashOutline, restaurantOutline, scanOutline, mailOutline, cartOutline } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],  imports: [
    CommonModule, 
    FormsModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonButton,
    IonChip,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonBadge,
    IonFab,
    IonFabButton,
    IonButtons,
    IonMenuButton
  ]
  schemas: [CUSTOM_ELEMENTS_SCHEMA],  imports: [
    CommonModule, 
    FormsModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonButton,
    IonChip,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonBadge,
    IonFab,
    IonFabButton,
    IonButtons,
    IonMenuButton
  ]
})
export class HomePage implements OnInit {
  productosProximosVencer: any[] = [];
  productosBajoStock: any[] = [];
  estadisticas = {
    totalProductos: 0,
    totalDespensas: 0,
    productosVencidos: 0,
    productosProximosVencer: 0
  };
  
  contadorInvitaciones = 0;
  loading = true;
  error: string | null = null;
  usuario: any = null;
  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private modalCtrl: ModalController
  ) {
    addIcons({mailOutline,notificationsOutline,gridOutline,bagHandleOutline,checkmarkCircleOutline,timeOutline,alertCircleOutline,warningOutline,flashOutline,homeOutline,cartOutline,restaurantOutline,scanOutline,addOutline,heartOutline,statsChartOutline,listOutline,refreshOutline,chevronForwardOutline});
  }

  async ngOnInit() {
    await this.cargarDatosIniciales();
  }

  async cargarDatosIniciales() {
    this.loading = true;
    this.error = null;
    
    try {
      // Verificar si está autenticado
      const { data: { user } } = await this.supabaseService.getUser();
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      
      this.usuario = user;      // Cargar datos en paralelo para mejor rendimiento
      await Promise.all([
        this.cargarEstadisticas(),
        this.cargarProductosProximosVencer(),
        this.cargarProductosBajoStock(),
        this.cargarContadorInvitaciones()
      ]);

    } catch (err: any) {
      console.error('Error al cargar datos del home:', err);
      this.error = err.message || 'Error al cargar datos';
    } finally {
      this.loading = false;
    }
  }

  async cargarEstadisticas() {
    try {
      this.estadisticas = await this.supabaseService.obtenerEstadisticasUsuario();
    } catch (err: any) {
      console.error('Error al cargar estadísticas:', err);
    }
  }
  async cargarProductosProximosVencer() {
    try {
      this.productosProximosVencer = await this.supabaseService.obtenerProductosProximosAVencer(7);
      console.log('Productos próximos a vencer:', this.productosProximosVencer);
    } catch (err: any) {
      console.error('Error al cargar productos próximos a vencer:', err);
    }
  }
  async cargarProductosBajoStock() {
    try {
      this.productosBajoStock = await this.supabaseService.obtenerProductosBajoStock(3);
      console.log('Productos bajo stock:', this.productosBajoStock);
    } catch (err: any) {
      console.error('Error al cargar productos con bajo stock:', err);
    }
  }

  async doRefresh(event: any) {
    await this.cargarDatosIniciales();
    event.target.complete();
  }

  // Métodos de navegación
  irADespensas() {
    this.router.navigate(['/despensa']);
  }
  irAListaDeseos() {
    this.router.navigate(['/lista-compras']);
  }

  irARecetas() {
    this.router.navigate(['/recipes']);
  }

  irANotificaciones() {
    this.router.navigate(['/notifications']);
  }

  irADespensa(despensaId: string) {
    this.router.navigate(['/despensa', despensaId]);
  }

  // Utilidades
  getDiasParaVencer(fechaVencimiento: string): number {
    if (!fechaVencimiento) return 0;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  getColorSegunDias(dias: number): string {
    if (dias <= 0) return 'danger';
    if (dias <= 3) return 'warning';
    if (dias <= 7) return 'tertiary';
    return 'success';
  }

  getIconoCategoria(categoria: string): string {
    const iconos: { [key: string]: string } = {
      'lacteos': '🥛',
      'carnes': '🥩',
      'verduras': '🥬',
      'frutas': '🍎',
      'granos': '🌾',
      'enlatados': '🥫',
      'condimentos': '🧂',
      'bebidas': '🥤',
      'panaderia': '🍞',
      'congelados': '🧊'
    };
    
    return iconos[categoria?.toLowerCase()] || '📦';
  }

  getSaludoSegunHora(): string {
    const hora = new Date().getHours();
    if (hora < 12) return '¡Buenos días!';
    if (hora < 18) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  }
  getNombreUsuario(): string {
    return this.usuario?.user_metadata?.nombre || 
           this.usuario?.email?.split('@')[0] || 
           'Usuario';
  }
  // Métodos auxiliares para acceso seguro a datos
  obtenerNombreProducto(producto: any): string {
    return producto?.productos?.nombre || 'Producto sin nombre';
  }

  obtenerNombreDespensa(producto: any): string {
    return producto?.despensas?.nombre || 'Despensa sin nombre';
  }
  obtenerCategoriaProducto(producto: any): string {
    return producto?.productos?.categoria || 'sin categoria';
  }

  // Método para cargar contador de invitaciones pendientes
  async cargarContadorInvitaciones() {
    try {
      this.contadorInvitaciones = await this.supabaseService.contarInvitacionesPendientes();
      console.log('📧 Invitaciones pendientes:', this.contadorInvitaciones);
    } catch (error: any) {
      console.error('❌ Error cargando contador de invitaciones:', error);
      this.contadorInvitaciones = 0;
    }
  }  // Método para abrir modal de invitaciones pendientes
  async abrirInvitacionesPendientes() {
    try {
      console.log('📧 Abriendo modal de invitaciones pendientes');
      
      const modal = await this.modalCtrl.create({
        component: InvitacionesPendientesModal,
        cssClass: 'modal-centrado'
      });

      await modal.present();
      
      // Recargar contador después de cerrar modal (en caso de aceptar/rechazar invitaciones)
      const { data } = await modal.onDidDismiss();
      await this.cargarContadorInvitaciones();
      
    } catch (error: any) {
      console.error('❌ Error abriendo modal de invitaciones:', error);
    }
  }
}
