import { Injectable } from '@angular/core';
import { createClient, SupabaseClient  } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'https://qiatmsfnhjqfdbxfokig.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXRtc2ZuaGpxZmRieGZva2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NjAzODMsImV4cCI6MjA2MjMzNjM4M30.O5g4ovc0N-XYecog0bsJJP2EmNYi2iTtqT_c0odMBng'
    );
  }

  async login(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }  async signUp(email: string, password: string, nombre: string) {
    const { data, error } = await this.supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?verified=true`,
        data: {
          nombre: nombre
        }
      }
    });

    if (error) {
      // Manejo específico para diferentes tipos de errores
      if (error.message.includes('User already registered')) {
        throw new Error('Este correo electrónico ya está registrado');
      } else if (error.message.includes('Invalid email')) {
        throw new Error('El formato del correo electrónico no es válido');
      } else if (error.message.includes('Password should be at least')) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      } else if (error.message.includes('Unable to validate email address')) {
        throw new Error('No se pudo validar el correo electrónico. Verifica que sea correcto');
      } else if (error.message.includes('For security purposes')) {
        throw new Error('Por seguridad, debes esperar antes de intentar registrarte nuevamente');
      }
      throw error;
    }

    const userId = data.user?.id;
    if (!userId) throw new Error('No se pudo obtener el ID del usuario');

    // Solo insertar en la tabla usuarios si el usuario fue creado exitosamente
    if (data.user) {
      const { error: insertError } = await this.supabase
        .from('usuarios')
        .insert({ id: userId, email, nombre });

      if (insertError) {
        console.warn('Error al insertar usuario en tabla personalizada:', insertError);
        // No lanzar error aquí para no bloquear el registro
      }
    }

    return data;
  }
  async resendConfirmation(email: string) {
    const { data, error } = await this.supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/login?verified=true`
      }
    });

    if (error) {
      if (error.message.includes('For security purposes')) {
        throw new Error('Por seguridad, debes esperar antes de solicitar otro correo');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('El correo aún no ha sido confirmado');
      } else if (error.message.includes('Invalid email')) {
        throw new Error('Correo electrónico no válido');
      }
      throw error;
    }

    return data;
  }

  // Nuevo método para verificar el estado del email
  async checkEmailVerificationStatus(email: string) {
    try {
      const { data, error } = await this.supabase.auth.getUser();
      if (error) throw error;
      
      return {
        isVerified: data.user?.email_confirmed_at !== null,
        email: data.user?.email,
        lastSignInAt: data.user?.last_sign_in_at
      };
    } catch (error) {
      console.error('Error checking verification status:', error);
      return { isVerified: false, email: null, lastSignInAt: null };
    }
  }

  // Método para configurar email redirect URL dinámicamente
  private getEmailRedirectUrl(): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/login?verified=true`;
  }

  async logout() {
    return this.supabase.auth.signOut();
  }

  getUser() {
    return this.supabase.auth.getUser();
  }
  async isLoggedIn(): Promise<boolean> {
    const { data } = await this.supabase.auth.getSession();
    return !!data.session;
  }
  get client() {
    return this.supabase;
  }
  
  async crearDespensa(nombre: string) {
    const user = await this.supabase.auth.getUser();
    if (!user.data.user) throw new Error('No autenticado');

    // 1. Crear la despensa
    const { data: despensa, error: errorDespensa } = await this.supabase
      .from('despensas')
      .insert({
        nombre,
        propietario_id: user.data.user.id
      })
      .select()
      .single();

    if (errorDespensa) throw errorDespensa;

    // 2. Insertar acceso del usuario como propietario
    const { error: errorAcceso } = await this.supabase
      .from('accesos_despensa')
      .insert({
        usuario_id: user.data.user.id,
        despensa_id: despensa.id,
        rol: 'propietario' // o 'dueño' según lo que prefieras
      });

    if (errorAcceso) throw errorAcceso;

    return despensa;
  }  async obtenerDespensasUsuario() {
    const user = await this.supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) throw new Error('No autenticado');

    const { data, error } = await this.supabase
      .from('accesos_despensa')
      .select(`
        rol,
        despensas (
          id,
          nombre,
          created_at
        )
      `)
      .eq('usuario_id', userId)
      .order('created_at', { foreignTable: 'despensas', ascending: false });

    if (error) throw error;

    // Obtener el conteo de productos para cada despensa
    const despensasConConteo = await Promise.all(
      (data || []).map(async (item: any) => {
        if (!item.despensas) return item;
        
        const { count, error: errorConteo } = await this.supabase
          .from('producto_despensa')
          .select('*', { count: 'exact', head: true })
          .eq('despensa_id', item.despensas.id)
          .gt('stock', 0); // Solo contar productos con stock > 0

        if (errorConteo) {
          console.warn('Error al contar productos para despensa', item.despensas.id, errorConteo);
        }

        return {
          ...item,
          despensas: {
            ...item.despensas,
            cantidadProductos: count || 0
          }
        };
      })
    );

    return despensasConConteo;
  }
  async agregarProductoADespensa(despensaId: string, datos: {
    nombre: string;
    categoria?: string;
    origen?: string;
    fecha_vencimiento?: string;
    stock?: number;
  }) {
    // 1. Insertar producto
    const { data: producto, error: errorProd } = await this.supabase
      .from('productos')
      .insert({
        nombre: datos.nombre,
        categoria: datos.categoria || null,
        origen: datos.origen || null,
        fecha_ingreso: new Date().toISOString()
      })
      .select()
      .single();

    if (errorProd) throw errorProd;

    // 2. Asociar a despensa
    const { error: errorAsoc, data: dataAsoc } = await this.supabase
      .from('producto_despensa')
      .insert({
        despensa_id: despensaId,
        producto_id: producto.id,
        stock: datos.stock || 1,
        fecha_vencimiento: datos.fecha_vencimiento || null
      });

    console.log('Resultado de insert en producto_despensa:', dataAsoc, errorAsoc);
  }
  async obtenerProductosDeDespensa(despensaId: string) {
    const { data, error } = await this.supabase
      .from('producto_despensa')
      .select(`
        id,
        stock,
        fecha_vencimiento,
        productos (
          id,
          nombre,
          categoria,
          origen,
          fecha_ingreso
        )
      `)
      .eq('despensa_id', despensaId)
      .order('fecha_vencimiento', { ascending: true });

    if (error) throw error;
    return data;
  }
  async eliminarProductoDeDespensa(productoDespensaId: string) {
    const { error } = await this.supabase
      .from('producto_despensa')
      .delete()
      .eq('id', productoDespensaId);

    if (error) throw error;
  }

  async eliminarDespensa(despensaId: string) {
    // 1. Eliminar productos asociados
    await this.supabase
      .from('producto_despensa')
      .delete()
      .eq('despensa_id', despensaId);

    // 2. Eliminar accesos asociados
    await this.supabase
      .from('accesos_despensa')
      .delete()
      .eq('despensa_id', despensaId);

    // 3. Eliminar la despensa en sí
    const { error } = await this.supabase
      .from('despensas')
      .delete()
      .eq('id', despensaId);

    if (error) throw error;
  }

  async editarDespensa(despensaId: string, datos: { nombre?: string }) {
    const { error } = await this.supabase
      .from('despensas')
      .update({ nombre: datos.nombre })
      .eq('id', despensaId);

    if (error) throw error;
  }

  /**
   * Actualiza el stock de un producto en producto_despensa
   */
  async actualizarStockProducto(productoDespensaId: string, nuevoStock: number) {
    const { error } = await this.supabase
      .from('producto_despensa')
      .update({ stock: nuevoStock })
      .eq('id', productoDespensaId);

    if (error) throw error;
  }
  /**
   * Reduce el stock de un producto y retorna el nuevo stock
   */
  async reducirStockProducto(productoDespensaId: string, cantidadReducir: number): Promise<number> {
    // Primero obtener el stock actual
    const { data: producto, error: errorConsulta } = await this.supabase
      .from('producto_despensa')
      .select('stock')
      .eq('id', productoDespensaId)
      .single();

    if (errorConsulta) throw errorConsulta;

    const nuevoStock = Math.max(0, producto.stock - cantidadReducir);
    
    // Actualizar el stock
    const { error: errorUpdate } = await this.supabase
      .from('producto_despensa')
      .update({ stock: nuevoStock })
      .eq('id', productoDespensaId);

    if (errorUpdate) throw errorUpdate;

    return nuevoStock;
  }

  /**
   * Obtiene productos próximos a vencer de todas las despensas del usuario
   */  async obtenerProductosProximosAVencer(diasLimite: number = 7): Promise<any[]> {
    const user = await this.supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) throw new Error('No autenticado');

    // Calcular fecha límite
    const hoy = new Date();
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(hoy.getDate() + diasLimite);

    const { data, error } = await this.supabase
      .from('producto_despensa')
      .select(`
        id,
        stock,
        fecha_vencimiento,
        productos (
          id,
          nombre,
          categoria,
          origen
        ),
        despensas!inner (
          id,
          nombre,
          accesos_despensa!inner (
            usuario_id
          )
        )
      `)
      .eq('despensas.accesos_despensa.usuario_id', userId)
      .not('fecha_vencimiento', 'is', null)
      .lte('fecha_vencimiento', fechaLimite.toISOString().split('T')[0])
      .gte('fecha_vencimiento', hoy.toISOString().split('T')[0])
      .gt('stock', 0)
      .order('fecha_vencimiento', { ascending: true })
      .limit(10);

    if (error) throw error;
    console.log('Datos de productos próximos a vencer:', data);
    return data || [];
  }

  /**
   * Obtiene estadísticas del usuario (productos totales, despensas, etc.)
   */
  async obtenerEstadisticasUsuario(): Promise<{
    totalProductos: number;
    totalDespensas: number;
    productosVencidos: number;
    productosProximosVencer: number;
  }> {
    const user = await this.supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) throw new Error('No autenticado');

    const hoy = new Date();
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(hoy.getDate() + 7);

    // Obtener productos del usuario
    const { data: productos, error } = await this.supabase
      .from('producto_despensa')
      .select(`
        stock,
        fecha_vencimiento,
        despensas!inner (
          accesos_despensa!inner (
            usuario_id
          )
        )
      `)
      .eq('despensas.accesos_despensa.usuario_id', userId)
      .gt('stock', 0);

    if (error) throw error;

    // Obtener despensas del usuario
    const { data: despensas, error: errorDespensas } = await this.supabase
      .from('accesos_despensa')
      .select('despensa_id')
      .eq('usuario_id', userId);

    if (errorDespensas) throw errorDespensas;

    const totalProductos = productos?.length || 0;
    const totalDespensas = despensas?.length || 0;
    
    let productosVencidos = 0;
    let productosProximosVencer = 0;

    productos?.forEach(p => {
      if (p.fecha_vencimiento) {
        const fechaVenc = new Date(p.fecha_vencimiento);
        if (fechaVenc < hoy) {
          productosVencidos++;
        } else if (fechaVenc <= fechaLimite) {
          productosProximosVencer++;
        }
      }
    });

    return {
      totalProductos,
      totalDespensas,
      productosVencidos,
      productosProximosVencer
    };
  }

  /**
   * Obtiene productos con bajo stock (menos de 3 unidades)
   */  async obtenerProductosBajoStock(limite: number = 3): Promise<any[]> {
    const user = await this.supabase.auth.getUser();
    const userId = user.data.user?.id;
    if (!userId) throw new Error('No autenticado');

    const { data, error } = await this.supabase
      .from('producto_despensa')
      .select(`
        id,
        stock,
        fecha_vencimiento,
        productos (
          id,
          nombre,
          categoria,
          origen
        ),
        despensas!inner (
          id,
          nombre,
          accesos_despensa!inner (
            usuario_id
          )
        )
      `)
      .eq('despensas.accesos_despensa.usuario_id', userId)
      .lte('stock', limite)
      .gt('stock', 0)
      .order('stock', { ascending: true })
      .limit(8);

    if (error) throw error;
    console.log('Datos de productos bajo stock:', data);
    return data || [];
  }
}