import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
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
  mailOutline, 
  gridOutline, 
  bagHandleOutline, 
  checkmarkCircleOutline, 
  timeOutline, 
  alertCircleOutline, 
  warningOutline, 
  flashOutline, 
  homeOutline, 
  cartOutline, 
  restaurantOutline, 
  scanOutline, 
  addOutline, 
  heartOutline, 
  statsChartOutline, 
  listOutline, 
  refreshOutline, 
  chevronForwardOutline 
} from 'ionicons/icons';

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
})
export class HomePage implements OnInit, OnDestroy {
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
  private subscriptions: any[] = [];
  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private modalCtrl: ModalController
  ) {
    addIcons({
      mailOutline,
      gridOutline,
      bagHandleOutline,
      checkmarkCircleOutline,
      timeOutline,
      alertCircleOutline,
      warningOutline,
      flashOutline,
      homeOutline,
      cartOutline,
      restaurantOutline,
      scanOutline,
      addOutline,
      heartOutline,
      statsChartOutline,
      listOutline,
      refreshOutline,
      chevronForwardOutline
    });
  }

  ngOnInit() {
    this.cargarDatos();
    this.configurarSuscripciones();
  }

  ngOnDestroy() {
    this.limpiarSuscripciones();
  }

  private configurarSuscripciones() {
    // Suscripción a cambios en despensas
    const despensasSub = this.supabaseService.suscribirADespensas(async (payload) => {
      console.log('Cambio en despensas:', payload);
      await this.cargarDatos();
    });
    this.subscriptions.push(despensasSub);

    // Suscripción a invitaciones
    const invitacionesSub = this.supabaseService.suscribirAInvitaciones(async (payload) => {
      console.log('Cambio en invitaciones:', payload);
      this.contadorInvitaciones = await this.supabaseService.contarInvitacionesPendientes();
    });
    this.subscriptions.push(invitacionesSub);
  }

  private limpiarSuscripciones() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  async cargarDatos() {
    try {
      this.loading = true;
      this.error = null;

      // Cargar datos del usuario
      const { data: { user } } = await this.supabaseService.getUser();
      this.usuario = user;

      // Cargar estadísticas
      this.estadisticas = await this.supabaseService.obtenerEstadisticasUsuario();

      // Cargar productos próximos a vencer
      this.productosProximosVencer = await this.supabaseService.obtenerProductosProximosAVencer();

      // Cargar productos con bajo stock
      this.productosBajoStock = await this.supabaseService.obtenerProductosBajoStock();

      // Cargar contador de invitaciones
      this.contadorInvitaciones = await this.supabaseService.contarInvitacionesPendientes();

    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.error = 'Error al cargar los datos. Por favor, intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  async doRefresh(event: any) {
    await this.cargarDatos();
    event.target.complete();
  }

  // Métodos de navegación
  irADespensas() {
    console.log('Navegando a despensas');
    this.router.navigate(['/despensa'], { replaceUrl: false });
  }

  irAListaDeseos() {
    console.log('Navegando a lista de compras');
    this.router.navigate(['/lista-compras'], { replaceUrl: false });
  }

  irARecetas() {
    console.log('Navegando a recetas');
    this.router.navigate(['/recipes'], { replaceUrl: false });
  }

  irAOcrBoleta() {
    console.log('Navegando a OCR boleta');
    this.router.navigate(['/ocr-boleta'], { replaceUrl: false });
  }

  irADespensa(despensaId: string) {
    console.log('Navegando a despensa:', despensaId);
    this.router.navigate(['/despensa', despensaId], { replaceUrl: false });
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

  // Método para abrir modal de invitaciones pendientes
  async abrirInvitacionesPendientes() {
    try {
      const modal = await this.modalCtrl.create({
        component: InvitacionesPendientesModal,
        cssClass: 'modal-fullscreen'
      });

      await modal.present();

      const { data } = await modal.onWillDismiss();
      if (data?.actualizado) {
        this.contadorInvitaciones = await this.supabaseService.contarInvitacionesPendientes();
      }
    } catch (error) {
      console.error('Error al abrir invitaciones pendientes:', error);
    }
  }
}
