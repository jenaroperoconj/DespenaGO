import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonIcon,
  IonCardContent,
  IonCard,
  IonInput,
  IonContent,
  IonTitle,
  IonToolbar,
  IonHeader,
  IonButtons,
  IonMenuButton,
  IonGrid,
  IonRow,
  IonCol,
  IonChip,
  IonFab,
  IonFabButton,
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  PopoverController,
  IonRefresher,
  IonRefresherContent,
  AlertController,
  LoadingController
} from '@ionic/angular/standalone';
import { SupabaseService } from 'src/app/core/supabase.service';
import { ModalController } from '@ionic/angular';
import { CompartirDespensaModal } from './compartir-despensa.modal';
import { addIcons } from 'ionicons';
import { 
  addOutline, 
  createOutline, 
  trashOutline, 
  shareOutline, 
  refreshOutline, 
  arrowDownOutline,
  storefrontOutline,
  homeOutline,
  bagOutline,
  ellipsisVertical,
  exitOutline,
  closeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  saveOutline
} from 'ionicons/icons';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { from } from 'rxjs';

@Component({
  selector: 'app-despensa',
  templateUrl: './despensa.page.html',
  styleUrls: ['./despensa.page.scss'],
  providers: [ModalController],
  standalone: true,  imports: [
    CommonModule,
    FormsModule,
    IonIcon,
    IonCardContent,
    IonCard,
    IonInput,
    IonContent,
    IonTitle,
    IonToolbar,
    IonHeader,
    IonButtons,
    IonMenuButton,
    IonGrid,
    IonRow,
    IonCol,
    IonChip,
    IonFab,
    IonFabButton,
    IonButton,
    IonItem,
    IonLabel,
    IonList,
    IonPopover,
    IonRefresher,
    IonRefresherContent
  ]
})
export class DespensaPage implements OnInit, OnDestroy {
  nombre: string = '';
  error: string | null = null;
  success: boolean = false;
  despensas: any[] = [];
  mostrarFormularioCrear: boolean = false;
  mostrarFormularioEditar: boolean = false;
  nombreEditar: string = '';
  despensaIdEditar: string = '';
  private despensasSub: any = null;
  private productosSubs = new Map<string, any>();
  private destroy$ = new Subject<void>();
  loading = true;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private popoverCtrl: PopoverController
  ) {
    addIcons({
      addOutline,
      createOutline,
      trashOutline,
      shareOutline,
      refreshOutline,
      arrowDownOutline,
      storefrontOutline,
      homeOutline,
      bagOutline,
      ellipsisVertical,
      exitOutline,
      closeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      saveOutline
    });
  }

  ngOnInit() {
    this.cargarDespensas();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.limpiarSuscripciones();
  }

  private limpiarSuscripciones() {
    if (this.despensasSub) {
      this.despensasSub.unsubscribe();
      this.despensasSub = null;
    }
    
    this.productosSubs.forEach(sub => {
      if (sub) {
        sub.unsubscribe();
      }
    });
    this.productosSubs.clear();
  }

  private configurarSuscripciones() {
    this.limpiarSuscripciones();

    // Suscripción a cambios en despensas
    this.despensasSub = from(this.supabaseService.obtenerDespensasUsuario())
      .pipe(
        takeUntil(this.destroy$),
        tap((despensas: any[]) => {
          this.despensas = despensas;
          this.configurarSuscripcionesProductos();
        })
      )
      .subscribe({
        error: (err: Error) => {
          console.error('Error en suscripción de despensas:', err);
          this.error = 'Error al cargar despensas';
        }
      });
  }

  private configurarSuscripcionesProductos() {
    this.despensas.forEach(despensa => {
      if (!this.productosSubs.has(despensa.id)) {
        const sub = from(this.supabaseService.obtenerProductosDeDespensa(despensa.id))
          .pipe(
            takeUntil(this.destroy$),
            tap((productos: any[]) => {
              const index = this.despensas.findIndex(d => d.id === despensa.id);
              if (index !== -1) {
                this.despensas[index].productos = productos;
              }
            })
          )
          .subscribe({
            error: (err: Error) => {
              console.error(`Error en suscripción de productos para despensa ${despensa.id}:`, err);
            }
          });
        this.productosSubs.set(despensa.id, sub);
      }
    });
  }

  async crearDespensa() {
    if (!this.nombre.trim()) {
      this.error = 'El nombre de la despensa es requerido';
      return;
    }

    try {
      this.error = null;
      await this.supabaseService.crearDespensa(this.nombre);
      this.success = true;
      this.nombre = '';
      
      // Cerrar modal después de 1 segundo
      setTimeout(() => {
        this.mostrarFormularioCrear = false;
        this.success = false;
      }, 1000);
      
      await this.cargarDespensas();
    } catch (err: any) {
      this.success = false;
      this.error = err.message || 'Error al crear despensa';
    }
  }

  async cargarDespensas() {
    try {
      this.loading = true;
      this.error = null;
      this.configurarSuscripciones();
    } catch (err: any) {
      console.error('Error al cargar despensas:', err);
      this.error = err.message || 'Error al cargar despensas';
    } finally {
      this.loading = false;
    }
  }

  async onPopoverAccion(accion: 'editar' | 'eliminar' | 'compartir', item: any) {
    await this.popoverCtrl.dismiss();

    // Espera un frame más del DOM para asegurar estabilidad
    requestAnimationFrame(() => {
      if (accion === 'editar') {
        this.editarDespensa(item);
      } else if (accion === 'eliminar') {
        this.confirmarEliminar(item);
      } else if (accion === 'compartir') {
        this.abrirModalCompartir(item);
      }
    });
  }

  async doRefresh(event: any) {
    console.log('Actualizando despensas...');
    try {
      await this.cargarDespensas();
      console.log('Despensas actualizadas correctamente');
    } catch (error) {
      console.error('Error al actualizar despensas:', error);
    } finally {
      // Completar el evento de refresher después de 1 segundo para mejor UX
      setTimeout(() => {
        event.target.complete();
      }, 1000);
    }
  }

  irADespensa(id: string) {
    console.log('Navegando a despensa:', id);
    this.router.navigate(['/despensa', id], { replaceUrl: false });
  }

  editarDespensa(item: any) {
    this.mostrarFormularioEditar = true;
    this.nombreEditar = item.despensas.nombre;
    this.despensaIdEditar = item.despensas.id;
  }

  async guardarCambiosEditar() {
    try {
      await this.supabaseService.editarDespensa(this.despensaIdEditar, {
        nombre: this.nombreEditar
      });
      this.mostrarFormularioEditar = false;
      this.nombreEditar = '';
      this.despensaIdEditar = '';
      await this.cargarDespensas();
    } catch (err: any) {
      this.error = err.message || 'Error al editar despensa';
    }
  }

  async confirmarEliminar(item: any) {
    // Asegura cierre del popover
    try {
      await this.popoverCtrl.dismiss();
    } catch (e) {
      // Ignorar si ya estaba cerrado
    }

    // Verificar si el usuario es propietario o colaborador
    const esPropietario = item.rol === 'propietario';
    
    // Delay breve para asegurar cierre completo del popover
    setTimeout(async () => {
      const alert = await this.alertCtrl.create({
        header: esPropietario ? 'Eliminar despensa' : 'Abandonar despensa',
        message: esPropietario
          ? `¿Estás seguro de eliminar la despensa "${item.despensas.nombre}"? Esta acción no se puede deshacer.`
          : `¿Estás seguro de abandonar la despensa "${item.despensas.nombre}"? Perderás el acceso a ella, pero seguirá disponible para los demás colaboradores.`,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: esPropietario ? 'Eliminar' : 'Abandonar',
            role: 'destructive',
            handler: async () => {
              try {
                if (esPropietario) {
                  // Si es propietario, eliminar la despensa
                  await this.supabaseService.eliminarDespensa(item.despensas.id);
                } else {
                  // Si no es propietario, solo abandonar la despensa
                  const resultado = await this.supabaseService.abandonarDespensa(item.despensas.id);
                  if (!resultado.success) {
                    throw new Error(resultado.error?.message || 'Error al abandonar la despensa');
                  }
                }
                await this.cargarDespensas();
              } catch (err: any) {
                console.error(esPropietario ? 'Error al eliminar despensa:' : 'Error al abandonar despensa:', err.message);
                this.error = esPropietario 
                  ? 'No se pudo eliminar la despensa. Verifica que no tenga productos asociados.'
                  : 'No se pudo abandonar la despensa. Intenta nuevamente más tarde.';
              }
            }
          }
        ]
      });

      await alert.present();    }, 300);
    
  }

  getRoleColor(rol: string): string {
    switch (rol) {
      case 'owner':
        return 'primary';
      case 'admin':
        return 'secondary';
      case 'viewer':
        return 'medium';
      default:
        return 'medium';
    }
  }

  getRoleIcon(rol: string): string {
    switch (rol) {
      case 'owner':
        return 'shield-outline';
      case 'admin':
        return 'person-outline';
      case 'viewer':
        return 'eye-outline';
      default:
        return 'person-outline';
    }
  }

  cerrarFormularios() {
    this.mostrarFormularioCrear = false;
    this.mostrarFormularioEditar = false;
    this.error = null;
    this.success = false;
  }

  // Método específico para abrir el modal de crear despensa
  abrirModalCrear() {
    this.error = null;
    this.success = false;
    this.nombre = '';
    this.mostrarFormularioCrear = true;
  }

  // Método para manejar el click del overlay
  onOverlayClick(event: Event) {
    // Solo cerrar si se hizo click directamente en el overlay, no en el contenido del modal
    if (event.target === event.currentTarget) {
      this.cerrarFormularios();
    }
  }

  async abrirModalCompartir(item: any) {
    try {
      console.log('🔗 Abriendo modal compartir para:', item.despensas.nombre);
      
      const modal = await this.modalCtrl.create({
        component: CompartirDespensaModal,
        componentProps: {
          despensaId: item.despensas.id,
          nombreDespensa: item.despensas.nombre
        }
      });

      await modal.present();
      
      // Recargar datos después de cerrar modal (en caso de cambios)
      const { data } = await modal.onDidDismiss();
      if (data?.changed) {
        console.log('📝 Recargando datos tras cambios en colaboración');
        await this.cargarDespensas();
      }
      
    } catch (error: any) {
      console.error('❌ Error abriendo modal compartir:', error);
      
      const alert = await this.alertCtrl.create({
        header: '❌ Error',
        message: `No se pudo abrir el modal de compartir: ${error.message || 'Error desconocido'}`,
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}
