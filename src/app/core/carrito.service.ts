import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class CarritoService {

  constructor(
    private supabaseService: SupabaseService,
    private alertController: AlertController
  ) {}

  /**
   * Detecta si el stock está agotado y muestra alerta para agregar a lista de deseos
   * @param productoDespensaId ID del registro en producto_despensa
   * @param stock Stock actual del producto
   * @param despensaId ID de la despensa
   * @param productoId ID del producto
   * @param nombreProducto Nombre del producto para mostrar en la alerta
   */
  async verificarStockAgotado(
    productoDespensaId: string, 
    stock: number, 
    despensaId: string, 
    productoId: string, 
    nombreProducto: string
  ): Promise<boolean> {
    if (stock <= 0) {
      return await this.mostrarAlertaStockAgotado(despensaId, productoId, nombreProducto);
    }
    return false;
  }
  /**
   * Muestra alerta cuando el stock se agota y permite agregar a lista de deseos
   */
  private async mostrarAlertaStockAgotado(
    despensaId: string, 
    productoId: string, 
    nombreProducto: string
  ): Promise<boolean> {
    const alert = await this.alertController.create({
      header: '🛒 Producto Agotado',
      message: `El producto <strong>"${nombreProducto}"</strong> se ha agotado completamente. ¿Te gustaría agregarlo a tu lista de deseos para recordar recomprarlo?`,
      cssClass: 'alert-stock-agotado',
      buttons: [
        {
          text: 'No, gracias',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: '✨ Sí, agregar a deseos',
          cssClass: 'primary',
          handler: async () => {
            try {
              await this.agregarAListaDeseos(despensaId, productoId);
              await this.mostrarConfirmacionAgregado(nombreProducto);
              return true;
            } catch (error: any) {
              await this.mostrarErrorAlAgregar(error.message);
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role !== 'cancel';
  }

  /**
   * Agrega un producto a la tabla carrito (lista de deseos)
   */
  async agregarAListaDeseos(despensaId: string, productoId: string, cantidad: number = 1): Promise<void> {
    try {
      // Verificar si el usuario está autenticado
      const user = await this.supabaseService.getUser();
      if (!user.data.user) {
        throw new Error('Usuario no autenticado');
      }

      const userId = user.data.user.id;

      // Verificar si el producto ya existe en la lista de deseos
      const { data: existente, error: errorConsulta } = await this.supabaseService.client
        .from('carrito')
        .select('*')
        .eq('usuario_id', userId)
        .eq('despensa_id', despensaId)
        .eq('producto_id', productoId)
        .maybeSingle();

      if (errorConsulta) {
        throw errorConsulta;
      }

      if (existente) {        // Si ya existe, actualizar la cantidad
        const { error: errorUpdate } = await this.supabaseService.client
          .from('carrito')
          .update({ 
            cantidad: existente.cantidad + cantidad
          })
          .eq('id', existente.id);

        if (errorUpdate) {
          throw errorUpdate;
        }
      } else {
        // Si no existe, crear nuevo registro
        const { error: errorInsert } = await this.supabaseService.client
          .from('carrito')
          .insert({
            usuario_id: userId,
            despensa_id: despensaId,
            producto_id: productoId,
            cantidad: cantidad
          });

        if (errorInsert) {
          throw errorInsert;
        }
      }
    } catch (error: any) {
      console.error('Error al agregar producto a lista de deseos:', error);
      throw error;
    }
  }
  /**
   * Muestra confirmación de que el producto fue agregado exitosamente
   */
  private async mostrarConfirmacionAgregado(nombreProducto: string): Promise<void> {
    const alert = await this.alertController.create({
      header: '✅ ¡Agregado Exitosamente!',
      message: `<strong>"${nombreProducto}"</strong> ha sido agregado a tu lista de deseos. Podrás verlo en la sección correspondiente.`,
      buttons: [
        {
          text: 'Entendido',
          cssClass: 'primary'
        }
      ],
      cssClass: 'alert-success'
    });

    await alert.present();
  }

  /**
   * Muestra error al intentar agregar a lista de deseos
   */
  private async mostrarErrorAlAgregar(mensaje: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Error',
      message: `No se pudo agregar el producto a la lista de deseos: ${mensaje}`,
      buttons: ['Entendido'],
      cssClass: 'alert-error'
    });

    await alert.present();
  }

  /**
   * Obtiene todos los productos en la lista de deseos del usuario
   */
  async obtenerListaDeseos(): Promise<any[]> {
    try {
      const user = await this.supabaseService.getUser();
      if (!user.data.user) {
        throw new Error('Usuario no autenticado');
      }      const { data, error } = await this.supabaseService.client
        .from('carrito')
        .select(`
          id,
          cantidad,
          created_at,
          despensas (
            id,
            nombre
          ),
          productos (
            id,
            nombre,
            categoria,
            origen
          )
        `)
        .eq('usuario_id', user.data.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('Error al obtener lista de deseos:', error);
      throw error;
    }
  }

  /**
   * Elimina un producto de la lista de deseos
   */
  async eliminarDeListaDeseos(carritoId: string): Promise<void> {
    try {
      const { error } = await this.supabaseService.client
        .from('carrito')
        .delete()
        .eq('id', carritoId);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error al eliminar de lista de deseos:', error);
      throw error;
    }
  }

  /**
   * Actualiza la cantidad de un producto en la lista de deseos
   */
  async actualizarCantidadEnListaDeseos(carritoId: string, nuevaCantidad: number): Promise<void> {
    try {
      if (nuevaCantidad <= 0) {
        await this.eliminarDeListaDeseos(carritoId);
        return;
      }      const { error } = await this.supabaseService.client
        .from('carrito')
        .update({ 
          cantidad: nuevaCantidad
        })
        .eq('id', carritoId);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error al actualizar cantidad en lista de deseos:', error);
      throw error;
    }
  }
}
