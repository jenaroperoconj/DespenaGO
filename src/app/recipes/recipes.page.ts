import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonButtons,
  IonMenuButton,
  IonChip,
  IonBadge,
  IonSpinner,
  IonIcon
} from '@ionic/angular/standalone';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { SupabaseService } from 'src/app/core/supabase.service';
import { getApiUrl } from 'src/app/core/api.config';
import { addIcons } from 'ionicons';
import { 
  restaurantOutline,
  bookOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  refreshOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-recipes',
  templateUrl: './recipes.page.html',
  styleUrls: ['./recipes.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonButtons,
    IonMenuButton,
    IonChip,
    IonBadge,
    IonSpinner,
    IonIcon
  ]
})
export class RecipesPage implements OnInit {
  despensas: any[] = [];
  despensaSeleccionada: any = null;
  condicionMedica: string = 'none';
  receta: string = '';
  cargando: boolean = false;
  cargandoDespensas: boolean = false;
  productosDisponibles: any[] = [];
  errorCarga: string = '';
  recetaGenerada: string = '';

  constructor(
    private http: HttpClient,
    private supabaseService: SupabaseService
  ) {
    addIcons({
      restaurantOutline,
      bookOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      refreshOutline
    });
  }

  async ngOnInit() {
    await this.verificarAutenticacion();
    await this.cargarDespensas();
  }

  async verificarAutenticacion() {
    try {
      const user = await this.supabaseService.getUser();
      console.log('Usuario autenticado:', user);
      
      if (!user.data.user) {
        this.errorCarga = 'No estás autenticado. Inicia sesión primero.';
        return false;
      }
      
      console.log('ID del usuario:', user.data.user.id);
      return true;
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      this.errorCarga = 'Error al verificar autenticación.';
      return false;
    }
  }

  async cargarDespensas() {
    try {
      this.cargandoDespensas = true;
      this.errorCarga = '';
      
      console.log('Cargando despensas del usuario...');
      const despensasData = await this.supabaseService.obtenerDespensasUsuario();
      console.log('Datos de despensas obtenidos:', despensasData);
      
      // Transformar la estructura de datos
      this.despensas = despensasData
        .filter((item: any) => item.despensas) // Filtrar items sin despensa
        .map((item: any) => ({
          id: item.despensas.id,
          nombre: item.despensas.nombre,
          created_at: item.despensas.created_at,
          rol: item.rol,
          cantidadProductos: item.despensas.cantidadProductos || 0,
          productos: [] // Se cargarán después
        }));
      
      console.log('Despensas procesadas:', this.despensas);
      
      if (this.despensas.length === 0) {
        this.errorCarga = 'No tienes despensas creadas. Crea una despensa primero.';
        return;
      }
      
      // Cargar productos para cada despensa
      console.log('Cargando productos para cada despensa...');
      for (let despensa of this.despensas) {
        try {
          const productosData = await this.supabaseService.obtenerProductosDeDespensa(despensa.id);
          console.log(`Productos para despensa "${despensa.nombre}":`, productosData);
          
          // Transformar la estructura de productos
          despensa.productos = productosData.map((item: any) => ({
            id: item.productos.id,
            nombre: item.productos.nombre,
            categoria: item.productos.categoria,
            origen: item.productos.origen,
            stock: item.stock,
            fecha_vencimiento: item.fecha_vencimiento
          }));
          
        } catch (error) {
          console.error(`Error cargando productos para despensa ${despensa.id}:`, error);
          despensa.productos = [];
        }
      }
      
      console.log('Carga de despensas completada');
      
    } catch (error) {
      console.error('Error cargando despensas:', error);
      this.errorCarga = 'Error al cargar las despensas. Verifica tu conexión.';
    } finally {
      this.cargandoDespensas = false;
    }
  }

  onDespensaChange() {
    console.log('Despensa seleccionada:', this.despensaSeleccionada);
    if (this.despensaSeleccionada) {
      this.productosDisponibles = this.despensaSeleccionada.productos || [];
      console.log('Productos disponibles:', this.productosDisponibles);
    } else {
      this.productosDisponibles = [];
    }
  }

  generarReceta() {
    if (!this.despensaSeleccionada || !this.productosDisponibles.length) {
      this.receta = 'Selecciona una despensa con productos para generar una receta.';
      return;
    }

    // Solo los nombres de los productos, separados por coma
    const ingredientes = this.productosDisponibles
      .filter(p => p.stock > 0)
      .map(p => p.nombre)
      .join(', ');

    this.cargando = true;
    this.receta = '';

    this.http
      .post<any>(getApiUrl('/api/receta'), { 
        prompt: ingredientes, 
        condicionMedica: this.condicionMedica 
      })
      .subscribe({
        next: (res) => {
          console.log('Respuesta del servidor:', res);
          this.receta = res.receta;
          this.cargando = false;
          this.recetaGenerada = res.receta;
        },
        error: (err) => {
          console.error('Error completo al generar receta:', err);
          console.error('Status:', err.status);
          console.error('Error message:', err.error);
          
          let errorMessage = 'Ocurrió un error al generar la receta.';
          
          if (err.status === 0) {
            errorMessage = 'No se puede conectar al servidor. Verifica tu conexión a internet.';
          } else if (err.status === 500) {
            errorMessage = `Error del servidor: ${err.error?.error || err.error?.details || 'Error interno'}`;
          } else if (err.status === 404) {
            errorMessage = 'El endpoint de recetas no se encontró.';
          }
          
          this.receta = errorMessage;
          this.cargando = false;
        }
      });
  }

  private getCondicionMedicaText(): string {
    switch (this.condicionMedica) {
      case 'diabetic':
        return 'El usuario es diabético, por favor evita azúcares refinados y usa edulcorantes naturales.';
      case 'celiac':
        return 'El usuario es celíaco, evita ingredientes con gluten como trigo, cebada, centeno.';
      case 'hypertensive':
        return 'El usuario es hipertenso, usa poca sal y evita alimentos procesados altos en sodio.';
      default:
        return 'No hay restricciones dietéticas especiales.';
    }
  }

  getCategoriaColor(categoria: string): string {
    const colores: { [key: string]: string } = {
      'Fruta': 'success',
      'Verdura': 'success',
      'Carne': 'danger',
      'Lácteo': 'primary',
      'Embutido': 'warning',
      'Aceites y Grasas': 'medium',
      'Pastas y Arroces': 'secondary',
      'Masas y Premezclas': 'tertiary',
      'Snack': 'warning',
      'Enlatado': 'medium',
      'Congelado': 'primary',
      'Panadería': 'secondary',
      'Condimento': 'tertiary',
      'Bebestible': 'primary',
      'Infusión': 'medium',
      'Otro': 'light'
    };
    return colores[categoria] || 'light';
  }
}
