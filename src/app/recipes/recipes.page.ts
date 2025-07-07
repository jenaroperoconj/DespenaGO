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
  IonIcon,
  IonFab,
  IonFabButton,
  IonFabList,
  IonModal,
  IonBackdrop
} from '@ionic/angular/standalone';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { SupabaseService } from 'src/app/core/supabase.service';
import { getApiUrl } from 'src/app/core/api.config';
import { addIcons } from 'ionicons';
import { 
  restaurantOutline,
  bookOutline,
  checkmarkCircleOutline,
  checkmarkCircle,
  alertCircleOutline,
  refreshOutline, closeOutline, copyOutline } from 'ionicons/icons';

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
    IonIcon,
    IonFab,
    IonFabButton,
    IonFabList,
    IonModal,
    IonBackdrop
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
  productosSeleccionados: any[] = [];
  mostrarModalReceta: boolean = false;
  loadingStep: number = 0;
  loadingMessage: string = '';
  mostrarLoading: boolean = false;

  constructor(
    private http: HttpClient,
    private supabaseService: SupabaseService
  ) {
    addIcons({restaurantOutline,alertCircleOutline,refreshOutline,checkmarkCircle,checkmarkCircleOutline,copyOutline,closeOutline,bookOutline});
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
      
      // Ordenar despensas alfabéticamente por nombre
      this.despensas = this.despensas.sort((a, b) => {
        const nombreA = (a.nombre || '').toLowerCase();
        const nombreB = (b.nombre || '').toLowerCase();
        if (nombreA < nombreB) return -1;
        if (nombreA > nombreB) return 1;
        return 0;
      });
      
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
      this.productosDisponibles = (this.despensaSeleccionada.productos || []).slice();
      // Ordenar por fecha de vencimiento y luego por categoría
      this.productosDisponibles.sort((a, b) => {
        // Primero por fecha de vencimiento (ascendente)
        const fechaA = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : Infinity;
        const fechaB = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : Infinity;
        if (fechaA !== fechaB) return fechaA - fechaB;
        // Luego por categoría (alfabéticamente)
        const catA = (a.categoria || '').toLowerCase();
        const catB = (b.categoria || '').toLowerCase();
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        return 0;
      });
      console.log('Productos disponibles ordenados:', this.productosDisponibles);
    } else {
      this.productosDisponibles = [];
    }
  }

  isProductoSeleccionado(producto: any): boolean {
    return this.productosSeleccionados.some(p => p.id === producto.id);
  }

  toggleProductoSeleccionado(producto: any) {
    if (this.isProductoSeleccionado(producto)) {
      this.productosSeleccionados = this.productosSeleccionados.filter(p => p.id !== producto.id);
    } else if (this.productosSeleccionados.length < 3) {
      this.productosSeleccionados.push(producto);
    }
  }

  generarReceta() {
    if (this.productosSeleccionados.length === 0 || this.productosSeleccionados.length > 3) {
      return;
    }

    this.loadingStep = 0;
    this.loadingMessage = 'Extrayendo productos...';
    this.mostrarLoading = true;

    setTimeout(() => {
      this.loadingStep = 30;
      this.loadingMessage = 'Preparando ingredientes...';

      setTimeout(() => {
        this.loadingStep = 60;
        this.loadingMessage = 'Generando receta con IA...';

        // Solo los nombres de los productos seleccionados, separados por coma
        const ingredientes = this.productosSeleccionados
          .map(p => p.nombre)
          .join(', ');

        this.cargando = true;
        this.receta = '';
        this.mostrarModalReceta = false;

        // Prompt mejorado para formato móvil
        const prompt = `Genera una receta usando estos ingredientes: ${ingredientes}.

Formato requerido (exactamente así):
🍽️ NOMBRE DEL PLATO

📋 INGREDIENTES:
- [Lista de ingredientes principales]
- [Ingredientes adicionales necesarios]

👨‍🍳 PASOS:
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]
[Continuar numerando los pasos]

${this.condicionMedica !== 'none' ? `\n💡 CONSIDERACIÓN: ${this.getCondicionMedicaText()}` : ''}

Genera una receta simple, práctica y deliciosa. Usa solo los ingredientes mencionados más ingredientes básicos de cocina.`;

        this.http
          .post<any>(getApiUrl('/api/receta'), { 
            prompt: prompt, 
            condicionMedica: this.condicionMedica 
          })
          .subscribe({
            next: (res) => {
              this.loadingStep = 90;
              this.loadingMessage = 'Receta generada, mostrando resultado...';
              setTimeout(() => {
                this.cargando = false;
                this.receta = res.receta;
                this.recetaGenerada = res.receta;
                this.mostrarLoading = false;
                this.loadingStep = 100;
                this.mostrarModalReceta = true;
              }, 700);
            },
            error: (err) => {
              this.loadingStep = 90;
              this.loadingMessage = 'Ocurrió un error, mostrando mensaje...';
              setTimeout(() => {
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
                this.mostrarLoading = false;
                this.loadingStep = 100;
                this.mostrarModalReceta = true;
              }, 700);
            }
          });
      }, 900);
    }, 700);
  }

  cerrarModalReceta() {
    this.mostrarModalReceta = false;
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

  copiarReceta() {
    if (!this.receta) return;
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(this.receta).then(() => {
        alert('¡Receta copiada al portapapeles!');
      }, () => {
        alert('No se pudo copiar la receta.');
      });
    } else {
      // Fallback para navegadores antiguos
      const textarea = document.createElement('textarea');
      textarea.value = this.receta;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert('¡Receta copiada al portapapeles!');
      } catch (err) {
        alert('No se pudo copiar la receta.');
      }
      document.body.removeChild(textarea);
    }
  }
}
