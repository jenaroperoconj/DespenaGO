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
  }

  async signUp(email: string, password: string, nombre: string) {
    const { data, error } = await this.supabase.auth.signUp({ email, password });

    if (error) throw error;

    const userId = data.user?.id;
    if (!userId) throw new Error('No se pudo obtener el ID del usuario');

    const { error: insertError } = await this.supabase
      .from('usuarios')
      .insert({ id: userId, email, nombre });

    if (insertError) throw insertError;

    return data;
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
  }
  async obtenerDespensasUsuario() {
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
      .order('created_at', { foreignTable: 'despensas', ascending: false }); // Ordenando por created_at de la tabla despensas

    if (error) throw error;

    // Resultado: [{ rol: 'propietario', despensas: { id, nombre, created_at } }, ...]
    return data;
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
}