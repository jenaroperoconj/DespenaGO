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
   * Actualiza el stock de un producto in producto_despensa
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
  }  /**
   * Busca un usuario por email para invitarlo a colaborar
   * Maneja las políticas RLS usando una función Supabase
   */
  async buscarUsuarioPorEmail(email: string): Promise<any> {
    // Normalizar el email (quitar espacios y convertir a minúsculas)
    const emailNormalizado = email.trim().toLowerCase();
    
    console.log('🔍 Buscando usuario con email (RLS-aware):', emailNormalizado);

    try {
      // Intentar primero con una función RPC que puede tener permisos elevados
      const { data: rpcResult, error: rpcError } = await this.supabase
        .rpc('buscar_usuario_por_email', { email_busqueda: emailNormalizado });

      if (!rpcError && rpcResult && rpcResult.length > 0) {
        console.log('✅ Usuario encontrado via RPC:', rpcResult[0]);
        return rpcResult[0];
      }

      console.log('⚠️ RPC no disponible o sin resultados, intentando consulta directa...');

      // Fallback: intentar búsqueda directa
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('id, nombre, email')
        .ilike('email', emailNormalizado)
        .maybeSingle();

      console.log('📊 Resultado búsqueda directa:', { data, error });

      if (error) {
        // Si el error es por RLS, intentar un enfoque diferente
        if (error.message.includes('RLS') || error.message.includes('permission') || error.message.includes('policy')) {
          console.log('🔒 Error de RLS detectado, intentando invitación por email...');
          
          // Crear una entrada temporal o usar el email como ID temporal
          return {
            id: `temp_${emailNormalizado.replace(/[^a-zA-Z0-9]/g, '_')}`,
            email: emailNormalizado,
            nombre: emailNormalizado.split('@')[0],
            temporal: true
          };
        }
        throw error;
      }

      if (!data) {
        console.log('❌ Usuario no encontrado en tabla usuarios');
        throw new Error(`No se encontró un usuario registrado con el correo: ${emailNormalizado}. Asegúrate de que el usuario se haya registrado en la aplicación.`);
      }

      return data;

    } catch (error: any) {
      console.error('💥 Error en búsqueda de usuario:', error);
      throw error;
    }
  }

  /**
   * Método auxiliar para sincronizar usuario de auth a tabla usuarios
   */
  private async sincronizarUsuarioDesdeAuth(email: string): Promise<any | null> {
    try {
      // Este método requeriría permisos de admin para listar usuarios
      // Por ahora, retornamos null
      console.log('Sincronización de usuario desde auth no disponible sin permisos de admin');
      return null;
    } catch (error) {
      console.error('Error al sincronizar usuario desde auth:', error);
      return null;
    }
  }

  /**
   * Método de debugging para verificar la estructura de la tabla usuarios
   */
  async verificarTablaUsuarios(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .limit(5);
      
      console.log('Estructura de tabla usuarios (primeros 5 registros):', data);
      if (error) {
        console.error('Error al verificar tabla usuarios:', error);
      }
    } catch (error) {
      console.error('Error en verificación de tabla:', error);
    }
  }
  /**
   * Método mejorado para buscar usuario que incluye verificación y sugerencias
   * Maneja políticas RLS apropiadamente
   */
  async buscarUsuarioConVerificacion(email: string): Promise<any> {
    const emailNormalizado = email.trim().toLowerCase();
    
    console.log('🔍 Iniciando búsqueda completa de usuario (RLS-aware):', emailNormalizado);

    try {
      // 1. Intentar con función RPC primero (bypass RLS)
      const { data: rpcResult, error: rpcError } = await this.supabase
        .rpc('buscar_usuario_por_email', { email_busqueda: emailNormalizado });

      if (!rpcError && rpcResult && rpcResult.length > 0) {
        console.log('✅ Usuario encontrado via RPC (bypass RLS)');
        return rpcResult[0];
      }

      // 2. Fallback: Buscar en tabla usuarios con manejo de RLS
      const { data: usuarioTabla, error: errorTabla } = await this.supabase
        .from('usuarios')
        .select('id, nombre, email')
        .ilike('email', emailNormalizado)
        .maybeSingle();

      console.log('📊 Resultado búsqueda en tabla usuarios:', { usuarioTabla, errorTabla });

      // 3. Manejar errores de RLS específicamente
      if (errorTabla) {
        if (errorTabla.message.includes('RLS') || errorTabla.message.includes('permission') || errorTabla.message.includes('policy')) {
          console.log('🔒 Error de RLS detectado. Esto es normal si las políticas están activas.');
          console.log('💡 Sugerencia: El usuario debe estar registrado pero las políticas RLS impiden la búsqueda directa.');
          
          // Intentar crear una invitación basada en email sin verificar existencia
          const toast = `⚠️ No se puede verificar si el usuario existe debido a las políticas de seguridad de la base de datos. La invitación se enviará al correo especificado.`;
          
          return {
            id: `email_${emailNormalizado.replace(/[^a-zA-Z0-9]/g, '_')}`,
            email: emailNormalizado,
            nombre: emailNormalizado.split('@')[0],
            rls_blocked: true,
            mensaje: toast
          };
        }
        throw errorTabla;
      }

      if (usuarioTabla) {
        console.log('✅ Usuario encontrado en tabla usuarios');
        return usuarioTabla;
      }

      // 4. Si no se encuentra, buscar variaciones del email (si RLS lo permite)
      console.log('🔄 Buscando variaciones del email...');
      
      const { data: variaciones, error: errorVariaciones } = await this.supabase
        .from('usuarios')
        .select('id, nombre, email')
        .or(`email.ilike.%${emailNormalizado}%,email.ilike.%${email}%`)
        .limit(5);

      if (!errorVariaciones && variaciones && variaciones.length > 0) {
        console.log('🎯 Usuarios similares encontrados:', variaciones);
        throw new Error(`No se encontró exactamente "${emailNormalizado}", pero hay usuarios similares. Verifica la ortografía del correo.`);
      }

      // 5. Información final si no se encuentra nada
      throw new Error(`El usuario con correo "${emailNormalizado}" no está registrado en la aplicación. Asegúrate de que se haya registrado correctamente.`);

    } catch (error: any) {
      console.error('❌ Error en búsqueda de usuario:', error);
      throw error;
    }
  }
  /**
   * Invita a un usuario a colaborar en una despensa
   * Maneja casos donde RLS impide la búsqueda directa de usuarios
   */
  async invitarColaboradorADespensa(despensaId: string, usuarioEmail: string, rol: string = 'editor'): Promise<void> {
    try {
      console.log('🚀 Iniciando proceso de invitación:', { despensaId, usuarioEmail, rol });

      // 1. Buscar al usuario por email con verificación completa
      const usuario = await this.buscarUsuarioConVerificacion(usuarioEmail);
      
      // 2. Manejar caso especial donde RLS bloqueó la búsqueda
      if (usuario.rls_blocked) {
        console.log('🔒 RLS detectado, intentando invitación directa...');
        
        // Intentar crear invitación usando función RPC o método alternativo
        const { data: invitacionResult, error: invitacionError } = await this.supabase
          .rpc('invitar_colaborador_por_email', {
            p_despensa_id: despensaId,
            p_email: usuarioEmail.trim().toLowerCase(),
            p_rol: rol
          });

        if (invitacionError) {
          // Si la función RPC no existe, intentar inserción directa
          console.log('⚠️ Función RPC no disponible, intentando inserción directa...');
          throw new Error(`No se pudo invitar al usuario debido a las políticas de seguridad. El usuario debe registrarse primero en la aplicación con el correo: ${usuarioEmail}`);
        }

        if (invitacionResult) {
          console.log('✅ Invitación creada via RPC');
          return;
        }
      }

      // 3. Verificar que el usuario no sea el propietario
      const { data: despensa, error: errorDespensa } = await this.supabase
        .from('despensas')
        .select('propietario_id, nombre')
        .eq('id', despensaId)
        .single();

      if (errorDespensa) {
        console.error('❌ Error al obtener información de despensa:', errorDespensa);
        throw errorDespensa;
      }

      console.log('📋 Información de despensa:', despensa);

      if (despensa.propietario_id === usuario.id) {
        throw new Error('No puedes invitarte a ti mismo a tu propia despensa');
      }

      // 4. Verificar que el usuario no esté ya invitado
      const { data: accesoExistente } = await this.supabase
        .from('accesos_despensa')
        .select('id, rol')
        .eq('usuario_id', usuario.id)
        .eq('despensa_id', despensaId)
        .single();

      if (accesoExistente) {
        throw new Error(`Este usuario ya tiene acceso a la despensa como ${accesoExistente.rol}`);
      }

      // 5. Crear el acceso para el colaborador
      const { error: errorAcceso } = await this.supabase
        .from('accesos_despensa')
        .insert({
          usuario_id: usuario.id,
          despensa_id: despensaId,
          rol: rol
        });

      if (errorAcceso) {
        console.error('❌ Error al crear acceso:', errorAcceso);
        throw errorAcceso;
      }

      console.log('✅ Acceso creado exitosamente');

      // 6. Marcar la despensa como compartida
      const { error: errorUpdate } = await this.supabase
        .from('despensas')
        .update({ compartida: true })
        .eq('id', despensaId);

      if (errorUpdate) {
        console.error('⚠️ Advertencia: Error al marcar despensa como compartida:', errorUpdate);
        // No lanzar error aquí, ya que la invitación fue exitosa
      }

      console.log('🎉 Proceso de invitación completado exitosamente');

    } catch (error: any) {
      console.error('💥 Error en proceso de invitación:', error);
      throw error;
    }
  }
  /**
   * Obtiene la lista de colaboradores de una despensa
   */  async obtenerColaboradoresDespensa(despensaId: string): Promise<any[]> {
    try {
      console.log('🔍 Obteniendo colaboradores para despensa:', despensaId);
      
      // Intentar con RPC primero (más confiable, bypasses RLS)
      try {
        const colaboradoresRPC = await this.obtenerColaboradoresRPC(despensaId);
        if (colaboradoresRPC && colaboradoresRPC.length > 0) {
          console.log('✅ Colaboradores obtenidos exitosamente vía RPC');
          return colaboradoresRPC;
        }
      } catch (rpcError) {
        console.log('⚠️ Error con RPC, intentando con método directo:', rpcError);
      }
      
      // Intentar con join directo si RPC falla
      const { data, error } = await this.supabase
        .from('accesos_despensa')
        .select(`
          rol,
          usuario_id,
          usuarios (
            id,
            nombre,
            email
          )
        `)
        .eq('despensa_id', despensaId)
        .order('rol', { ascending: false }); // Propietarios primero

      if (error) {
        console.error('❌ Error con join directo:', error);
        
        // Si hay error RLS, usar fallback sin join
        console.log('🔄 Intentando obtener colaboradores sin join...');
        return await this.obtenerColaboradoresSinJoin(despensaId);
      }      // Proceso de normalización para asegurar que siempre tenemos datos consistentes      // Usar type assertion para evitar problemas de tipado
      const colaboradoresNormalizados = (data || []).map(col => {
        // Siempre crear un objeto usuarios normalizado independientemente de lo que venga
        const usuariosNormalizados = {
          id: col.usuario_id || 'id-desconocido',
          nombre: 'Usuario no disponible',
          email: 'Email no disponible'
        };
        
        // Intentar extraer datos si están disponibles
        try {
          // Confirmar que usuarios existe antes de intentar acceder
          const usuarios = col.usuarios as any; // Type assertion para evitar errores TS
          
          if (usuarios) {
            if (Array.isArray(usuarios) && usuarios.length > 0) {
              // Si es un array, tomar el primer elemento
              const primerUsuario = usuarios[0];
              if (primerUsuario) {
                if (primerUsuario.nombre) {
                  usuariosNormalizados.nombre = primerUsuario.nombre;
                }
                if (primerUsuario.email) {
                  usuariosNormalizados.email = primerUsuario.email;
                }
              }
            } else if (typeof usuarios === 'object') {
              // Si es un objeto directo
              if (usuarios.nombre) {
                usuariosNormalizados.nombre = usuarios.nombre;
              }
              if (usuarios.email) {
                usuariosNormalizados.email = usuarios.email;
              }
            }
          }
        } catch (error) {
          console.warn('Error normalizando datos de usuario:', error);
        }
        
        return {
          ...col,
          usuarios: usuariosNormalizados
        };
      });

      console.log('✅ Colaboradores obtenidos exitosamente:', colaboradoresNormalizados);
      return colaboradoresNormalizados;
      
    } catch (error: any) {
      console.error('💥 Error obteniendo colaboradores:', error);
      
      // Fallback sin join como último recurso
      return await this.obtenerColaboradoresSinJoin(despensaId);
    }
  }

  /**
   * Método fallback para obtener colaboradores sin join (para casos de RLS)
   */
  private async obtenerColaboradoresSinJoin(despensaId: string): Promise<any[]> {
    try {
      console.log('🔄 Usando método fallback para obtener colaboradores...');
      
      // 1. Obtener solo los accesos
      const { data: accesos, error: errorAccesos } = await this.supabase
        .from('accesos_despensa')
        .select('rol, usuario_id')
        .eq('despensa_id', despensaId)
        .order('rol', { ascending: false });

      if (errorAccesos) {
        console.error('❌ Error obteniendo accesos:', errorAccesos);
        throw errorAccesos;
      }

      // 2. Para cada acceso, intentar obtener datos del usuario
      const colaboradoresConDatos = await Promise.all(
        (accesos || []).map(async (acceso) => {
          try {
            // Intentar obtener datos del usuario
            const { data: usuario, error: errorUsuario } = await this.supabase
              .from('usuarios')
              .select('id, nombre, email')
              .eq('id', acceso.usuario_id)
              .single();

            if (errorUsuario || !usuario) {
              console.warn(`⚠️ No se pudo obtener datos del usuario ${acceso.usuario_id}:`, errorUsuario);
              
              // Retornar con datos mínimos si no se puede obtener el usuario
              return {
                rol: acceso.rol,
                usuario_id: acceso.usuario_id,
                usuarios: {
                  id: acceso.usuario_id,
                  nombre: 'Usuario no disponible',
                  email: 'Email no disponible'
                }
              };
            }

            return {
              rol: acceso.rol,
              usuario_id: acceso.usuario_id,
              usuarios: usuario
            };

          } catch (error) {
            console.warn(`⚠️ Error obteniendo usuario ${acceso.usuario_id}:`, error);
            
            // Retornar con datos mínimos en caso de error
            return {
              rol: acceso.rol,
              usuario_id: acceso.usuario_id,
              usuarios: {
                id: acceso.usuario_id,
                nombre: 'Usuario no disponible',
                email: 'Email no disponible'
              }
            };
          }
        })
      );

      console.log('✅ Colaboradores obtenidos con método fallback:', colaboradoresConDatos);
      return colaboradoresConDatos;

    } catch (error: any) {
      console.error('💥 Error en método fallback:', error);
      
      // En caso de error total, retornar array vacío
      console.log('⚠️ Retornando lista vacía de colaboradores');
      return [];
    }
  }

  /**
   * Obtiene los colaboradores mediante la función RPC (bypassing RLS)
   */  private async obtenerColaboradoresRPC(despensaId: string): Promise<any[]> {
    try {
      console.log('🔄 Usando RPC para obtener colaboradores...');
      
      const { data: rpcResult, error: rpcError } = await this.supabase
        .rpc('obtener_colaboradores_despensa', { p_despensa_id: despensaId });
        
      if (rpcError) {
        console.error('❌ Error obteniendo colaboradores via RPC:', rpcError);
        throw rpcError;
      }
      
      if (!rpcResult || !Array.isArray(rpcResult) || rpcResult.length === 0) {
        console.log('⚠️ No se encontraron colaboradores via RPC');
        return [];
      }
      
      console.log('✅ Colaboradores obtenidos vía RPC:', rpcResult);
      
      // Diagnóstico de datos recibidos
      if (rpcResult.length > 0) {
        console.log('🔍 Estructura de datos RPC:', Object.keys(rpcResult[0]).join(', '));
        console.log('🔍 Muestra de un elemento:', JSON.stringify(rpcResult[0], null, 2));
      }
      
      // Transformar al formato esperado por el frontend con mejor manejo de valores nulos
      return rpcResult.map(col => {
        // Verificar explícitamente el nombre y email
        if (!col.usuario_nombre || col.usuario_nombre.trim() === '') {
          console.warn('⚠️ Nombre de usuario no disponible para ID:', col.usuario_id);
        }
        
        if (!col.usuario_email || col.usuario_email.trim() === '') {
          console.warn('⚠️ Email de usuario no disponible para ID:', col.usuario_id);
        }
        
        return {
          rol: col.rol,
          usuario_id: col.usuario_id,
          usuarios: {
            id: col.usuario_id,
            nombre: col.usuario_nombre && col.usuario_nombre.trim() !== '' 
              ? col.usuario_nombre 
              : 'Usuario no disponible',
            email: col.usuario_email && col.usuario_email.trim() !== '' 
              ? col.usuario_email 
              : 'Email no disponible'
          }
        };
      });
    } catch (error: any) {
      console.error('💥 Error en método RPC:', error);
      return [];
    }
  }

  /**
   * Elimina un colaborador de una despensa
   */
  async eliminarColaboradorDespensa(despensaId: string, usuarioId: string): Promise<void> {
    // Verificar que no sea el propietario
    const { data: despensa, error: errorDespensa } = await this.supabase
      .from('despensas')
      .select('propietario_id')
      .eq('id', despensaId)
      .single();

    if (errorDespensa) throw errorDespensa;

    if (despensa.propietario_id === usuarioId) {
      throw new Error('No puedes eliminar al propietario de la despensa');
    }

    const { error } = await this.supabase
      .from('accesos_despensa')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('despensa_id', despensaId);

    if (error) throw error;
  }

  /**
   * Actualiza el rol de un colaborador en una despensa
   */
  async actualizarRolColaborador(despensaId: string, usuarioId: string, nuevoRol: string): Promise<void> {
    const { error } = await this.supabase
      .from('accesos_despensa')
      .update({ rol: nuevoRol })
      .eq('usuario_id', usuarioId)
      .eq('despensa_id', despensaId);

    if (error) throw error;
  }
  /**
   * Verifica si el usuario actual es propietario de una despensa
   */
  async esPropietarioDespensa(despensaId: string): Promise<boolean> {
    try {
      const user = await this.supabase.auth.getUser();
      const userId = user.data.user?.id;
      if (!userId) {
        console.log('❌ No hay usuario autenticado');
        return false;
      }

      console.log('🔍 Verificando si usuario es propietario:', { userId, despensaId });

      const { data, error } = await this.supabase
        .from('despensas')
        .select('propietario_id')
        .eq('id', despensaId)
        .single();

      if (error) {
        console.error('❌ Error verificando propietario:', error);
        
        // Fallback: verificar en accesos_despensa
        console.log('🔄 Intentando fallback con accesos_despensa...');
        const { data: acceso, error: errorAcceso } = await this.supabase
          .from('accesos_despensa')
          .select('rol')
          .eq('usuario_id', userId)
          .eq('despensa_id', despensaId)
          .eq('rol', 'propietario')
          .single();

        if (errorAcceso) {
          console.error('❌ Error en fallback:', errorAcceso);
          return false;
        }

        return acceso !== null;
      }

      const esPropietario = data.propietario_id === userId;
      console.log('✅ Resultado verificación propietario:', esPropietario);
      return esPropietario;

    } catch (error: any) {
      console.error('💥 Error verificando propietario:', error);
      return false;
    }
  }
  /**
   * Obtiene el rol del usuario actual en una despensa
   */
  async obtenerRolEnDespensa(despensaId: string): Promise<string | null> {
    try {
      const user = await this.supabase.auth.getUser();
      const userId = user.data.user?.id;
      if (!userId) {
        console.log('❌ No hay usuario autenticado');
        return null;
      }

      console.log('🔍 Obteniendo rol del usuario:', { userId, despensaId });

      const { data, error } = await this.supabase
        .from('accesos_despensa')
        .select('rol')
        .eq('usuario_id', userId)
        .eq('despensa_id', despensaId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo rol:', error);
        
        // Si hay error, intentar verificar si es propietario directo
        console.log('🔄 Verificando si es propietario directo...');
        const { data: despensa, error: errorDespensa } = await this.supabase
          .from('despensas')
          .select('propietario_id')
          .eq('id', despensaId)
          .single();

        if (!errorDespensa && despensa && despensa.propietario_id === userId) {
          console.log('✅ Usuario es propietario directo');
          return 'propietario';
        }

        console.log('❌ No se pudo determinar el rol');
        return null;
      }

      console.log('✅ Rol obtenido:', data.rol);
      return data.rol;

    } catch (error: any) {
      console.error('💥 Error obteniendo rol:', error);
      return null;
    }
  }

  /**
   * Método para diagnosticar problemas de sincronización de usuarios
   * Útil cuando un usuario existe en auth pero no en la tabla usuarios
   */
  async diagnosticarProblemasUsuarios(): Promise<{
    totalUsuarios: number;
    ejemplosUsuarios: any[];
    sugerencias: string[];
  }> {
    try {
      console.log('🔬 Iniciando diagnóstico de usuarios...');

      // 1. Contar usuarios en la tabla
      const { count, error: errorCount } = await this.supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true });

      // 2. Obtener algunos ejemplos de usuarios
      const { data: ejemplos, error: errorEjemplos } = await this.supabase
        .from('usuarios')
        .select('id, nombre, email, created_at')
        .limit(5);

      const sugerencias = [
        'Verifica que el usuario se haya registrado correctamente en la aplicación',
        'Asegúrate de que el proceso de registro incluya la inserción en la tabla usuarios',
        'Revisa si hay diferencias de mayúsculas/minúsculas en el email',
        'Confirma que no hay espacios en blanco al inicio o final del email'
      ];

      if (count === 0) {
        sugerencias.push('⚠️ No hay usuarios en la tabla. Revisa el proceso de registro.');
      }

      console.log('📊 Diagnóstico completado:', {
        totalUsuarios: count,
        ejemplosUsuarios: ejemplos,
        sugerencias
      });

      return {
        totalUsuarios: count || 0,
        ejemplosUsuarios: ejemplos || [],
        sugerencias
      };

    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      return {
        totalUsuarios: 0,
        ejemplosUsuarios: [],
        sugerencias: ['Error al acceder a la base de datos. Verifica la conexión.']
      };
    }
  }

  /**
   * Método de diagnóstico para verificar conectividad y políticas RLS
   */
  async diagnosticarConectividadRLS(): Promise<any> {
    console.log('🔧 Iniciando diagnóstico de conectividad y RLS...');
    
    try {
      const resultados = {
        auth: false,
        tablaUsuarios: false,
        tablaAccesos: false,
        funcionesRPC: false,
        rlsActivo: false,
        errores: [] as string[]
      };

      // 1. Verificar autenticación
      const { data: authData, error: authError } = await this.supabase.auth.getUser();
      if (authError || !authData.user) {
        resultados.errores.push('❌ Error de autenticación: ' + (authError?.message || 'Sin usuario'));
      } else {
        resultados.auth = true;
        console.log('✅ Usuario autenticado:', authData.user.email);
      }

      // 2. Verificar tabla usuarios
      try {
        const { data, error } = await this.supabase
          .from('usuarios')
          .select('id')
          .limit(1);
        
        if (error) {
          resultados.errores.push('❌ Error acceso tabla usuarios: ' + error.message);
          if (error.message.includes('RLS') || error.message.includes('policy')) {
            resultados.rlsActivo = true;
          }
        } else {
          resultados.tablaUsuarios = true;
          console.log('✅ Acceso a tabla usuarios OK');
        }
      } catch (e: any) {
        resultados.errores.push('❌ Excepción tabla usuarios: ' + e.message);
      }

      // 3. Verificar tabla accesos_despensa
      try {
        const { data, error } = await this.supabase
          .from('accesos_despensa')
          .select('id')
          .limit(1);
        
        if (error) {
          resultados.errores.push('❌ Error acceso tabla accesos: ' + error.message);
          if (error.message.includes('RLS') || error.message.includes('policy')) {
            resultados.rlsActivo = true;
          }
        } else {
          resultados.tablaAccesos = true;
          console.log('✅ Acceso a tabla accesos_despensa OK');
        }
      } catch (e: any) {
        resultados.errores.push('❌ Excepción tabla accesos: ' + e.message);
      }

      // 4. Verificar funciones RPC
      try {
        const { data, error } = await this.supabase
          .rpc('buscar_usuario_por_email', { email_busqueda: 'test@test.com' });
        
        if (error) {
          if (error.message.includes('does not exist') || error.message.includes('404')) {
            resultados.errores.push('❌ Función RPC no existe - requiere despliegue SQL');
          } else {
            resultados.errores.push('❌ Error función RPC: ' + error.message);
          }
        } else {
          resultados.funcionesRPC = true;
          console.log('✅ Funciones RPC disponibles');
        }
      } catch (e: any) {
        resultados.errores.push('❌ Excepción función RPC: ' + e.message);
      }

      console.log('📊 Resultados diagnóstico:', resultados);
      return resultados;
      
    } catch (error: any) {
      console.error('💥 Error en diagnóstico:', error);
      return {
        auth: false,
        tablaUsuarios: false,
        tablaAccesos: false,
        funcionesRPC: false,
        rlsActivo: false,
        errores: ['Error general: ' + error.message]
      };
    }
  }

  /**
   * SISTEMA DE INVITACIONES EN LA APP (sin email)
   */

  /**
   * Crea una invitación para colaborar (sin envío de email)
   */
  async crearInvitacionColaborador(despensaId: string, emailInvitado: string, rol: string = 'editor', mensaje?: string): Promise<void> {
    try {
      console.log('📨 Creando invitación para colaborador:', { despensaId, emailInvitado, rol });

      // 1. Verificar que el usuario actual es propietario
      const esPropietario = await this.esPropietarioDespensa(despensaId);
      if (!esPropietario) {
        throw new Error('Solo el propietario puede enviar invitaciones');
      }

      // 2. Obtener ID del propietario
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // 3. Verificar si ya existe una invitación pendiente
      const { data: invitacionExistente, error: errorVerificacion } = await this.supabase
        .from('invitaciones_despensa')
        .select('id, estado')
        .eq('despensa_id', despensaId)
        .eq('email_invitado', emailInvitado.toLowerCase())
        .eq('estado', 'pendiente')
        .single();

      if (invitacionExistente) {
        throw new Error('Ya existe una invitación pendiente para este usuario');
      }

      // 4. Intentar obtener el usuario_id si el usuario ya está registrado
      let usuarioInvitadoId = null;
      try {
        const { data: usuarioExistente } = await this.supabase
          .from('usuarios')
          .select('id')
          .eq('email', emailInvitado.toLowerCase())
          .single();
        
        if (usuarioExistente) {
          usuarioInvitadoId = usuarioExistente.id;
        }
      } catch (e) {
        // No hay problema si no encontramos el usuario, se registrará después
        console.log('👤 Usuario no registrado aún, invitación por email:', emailInvitado);
      }

      // 5. Crear la invitación
      const { error: errorInvitacion } = await this.supabase
        .from('invitaciones_despensa')
        .insert({
          despensa_id: despensaId,
          email_invitado: emailInvitado.toLowerCase(),
          usuario_invitado_id: usuarioInvitadoId,
          propietario_id: user.id,
          rol: rol,
          mensaje: mensaje || `Te han invitado a colaborar en una despensa como ${rol}`
        });

      if (errorInvitacion) {
        console.error('❌ Error creando invitación:', errorInvitacion);
        throw errorInvitacion;
      }

      console.log('✅ Invitación creada exitosamente');

    } catch (error: any) {
      console.error('💥 Error en crearInvitacionColaborador:', error);
      throw error;
    }
  }
  /**
   * Obtiene las invitaciones pendientes para el usuario actual
   */  async obtenerInvitacionesPendientes(): Promise<any[]> {
    try {
      console.log('📥 Obteniendo invitaciones pendientes...');

      // Usar función RPC si está disponible
      try {
        const { data: rpcResult, error: rpcError } = await this.supabase
          .rpc('obtener_invitaciones_pendientes');

        if (!rpcError && rpcResult) {
          console.log('✅ Invitaciones obtenidas via RPC:', rpcResult);
          
          // Diagnosticar la estructura de datos que viene de la función RPC
          if (rpcResult && rpcResult.length > 0) {
            console.log('🔍 Estructura de invitación RPC:', Object.keys(rpcResult[0]).join(', '));
          }
          
          // Asegúrese de que cada elemento tenga un campo 'id'
          return rpcResult.map((inv: any) => {
            // Crear una copia para no mutar la original
            const normalizedInv = { ...inv };
            
            // Aseguramos que todos los campos requeridos existan para evitar errores
            if (!normalizedInv.id && normalizedInv.invitacion_id) {
              normalizedInv.id = normalizedInv.invitacion_id;
              console.log('✅ Copiando invitacion_id a id:', normalizedInv.id);
            }
            
            // Asegurar que el ID sea accesible
            if (!normalizedInv.id) {
              console.warn('⚠️ Invitación sin ID, creando ID temporal para referencia local');
              // UUID v4 generado con Date.now() y Math.random() como fallback
              const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = (Date.now() + Math.random()*16)%16 | 0;
                return (c === 'x' ? r : (r&0x3|0x8)).toString(16);
              });
              normalizedInv.id = uuid;
              normalizedInv._generatedId = true; // Marcar para saber que es generado
            }
            
            // Normalizar nombres para la interfaz
            if (!normalizedInv.despensa_nombre && normalizedInv.nombre_despensa) {
              normalizedInv.despensa_nombre = normalizedInv.nombre_despensa;
            }
            
            // Verificar y asignar propietario_nombre
            if (!normalizedInv.propietario_nombre) {
              if (normalizedInv.nombre_propietario) {
                normalizedInv.propietario_nombre = normalizedInv.nombre_propietario;
                console.log('✅ Usando nombre_propietario de RPC:', normalizedInv.propietario_nombre);
              } else if (normalizedInv.usuarios?.nombre) {
                normalizedInv.propietario_nombre = normalizedInv.usuarios.nombre;
                console.log('✅ Usando usuarios.nombre:', normalizedInv.propietario_nombre);
              } else if (normalizedInv.propietario_email) {
                // Si solo tenemos el email como fallback
                normalizedInv.propietario_nombre = normalizedInv.propietario_email.split('@')[0]; 
                console.log('⚠️ Generando nombre desde email:', normalizedInv.propietario_nombre);
              } else {
                normalizedInv.propietario_nombre = 'Usuario no disponible';
                console.warn('❌ No se pudo determinar propietario_nombre');
              }
            }

            // Asegurar que siempre tengamos el email del propietario
            if (!normalizedInv.propietario_email) {
              if (normalizedInv.usuarios?.email) {
                normalizedInv.propietario_email = normalizedInv.usuarios.email;
                console.log('✅ Usando usuarios.email:', normalizedInv.propietario_email);
              } else {
                normalizedInv.propietario_email = 'Email no disponible';
                console.warn('❌ No se encontró propietario_email');
              }
            }
            
            // Log para depuración
            console.log('📋 Invitación normalizada:', {
              id: normalizedInv.id,
              despensa: normalizedInv.despensa_nombre,
              propietario: normalizedInv.propietario_nombre,
              email: normalizedInv.propietario_email,
            });
            
            return normalizedInv;
          });
        }
      } catch (e) {
        console.log('⚠️ Función RPC no disponible, usando fallback:', e);
      }

      // Fallback: consulta directa
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await this.supabase
        .from('invitaciones_despensa')
        .select(`
          id,
          despensa_id,
          rol,
          mensaje,
          fecha_invitacion,
          despensas (
            nombre
          ),
          usuarios:propietario_id (
            nombre,
            email
          )
        `)
        .eq('estado', 'pendiente')
        .or(`email_invitado.eq.${user.email},usuario_invitado_id.eq.${user.id}`)
        .order('fecha_invitacion', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo invitaciones:', error);
        throw error;
      }

      console.log('✅ Invitaciones obtenidas:', data);
      return data || [];

    } catch (error: any) {
      console.error('💥 Error en obtenerInvitacionesPendientes:', error);
      throw error;
    }
  }

  /**
   * Acepta una invitación de colaboración
   */  async aceptarInvitacion(invitacionId: string): Promise<any> {
    try {
      console.log('✅ Aceptando invitación:', invitacionId);

      // Verificar que el ID sea un UUID válido
      if (!invitacionId || typeof invitacionId !== 'string') {
        throw new Error('ID de invitación inválido o no proporcionado');
      }

      // Verificar formato UUID válido
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(invitacionId)) {
        console.warn('⚠️ ID de invitación no tiene formato UUID válido:', invitacionId);
        throw new Error('ID de invitación no tiene formato válido');
      }

      // Intentar primero vía método directo (más confiable)
      try {
        console.log('🔄 Intentando aceptación manual de invitación...');
        const { data: invData, error: selectError } = await this.supabase
          .from('invitaciones_despensa')
          .select('*')
          .eq('id', invitacionId)
          .single();
          
        if (selectError) {
          console.error('❌ Error consultando invitación:', selectError);
          throw selectError;
        }
          
        if (!invData) {
          throw new Error('No se encontró la invitación');
        }
        
        console.log('📋 Datos de invitación encontrados:', invData);
        
        const userId = (await this.supabase.auth.getUser()).data.user?.id;
        if (!userId) {
          throw new Error('Usuario no autenticado');
        }
        
        // Insertar acceso manualmente
        const { error: errorAcceso } = await this.supabase
          .from('accesos_despensa')
          .insert({
            usuario_id: userId,
            despensa_id: invData.despensa_id,
            rol: invData.rol
          });
          
        if (errorAcceso) throw errorAcceso;
        
        // Actualizar la invitación como aceptada
        const { error: errorUpdate } = await this.supabase
          .from('invitaciones_despensa')
          .update({ 
            estado: 'aceptada',
            fecha_respuesta: new Date().toISOString(),
            usuario_invitado_id: userId
          })
          .eq('id', invitacionId);
          
        if (errorUpdate) throw errorUpdate;
        
        // Actualizar despensa como compartida
        const { error: errorDespensa } = await this.supabase
          .from('despensas')
          .update({ compartida: true })
          .eq('id', invData.despensa_id);
          
        if (errorDespensa) {
          console.warn('⚠️ No se pudo marcar la despensa como compartida:', errorDespensa);
          // No bloqueamos por este error
        }
        
        return {
          success: true,
          message: 'Invitación aceptada exitosamente',
          despensa_id: invData.despensa_id,
          rol: invData.rol
        };
      } catch (directError: any) {
        console.error('❌ Error en método directo:', directError);
        
        // Solo intentamos el método RPC si el directo falla
        console.log('🔄 Fallback: Intentando aceptar invitación vía RPC...');
        
        const { data, error } = await this.supabase
          .rpc('aceptar_invitacion_despensa', { 
            p_invitacion_id: invitacionId 
          });

        if (error) {
          console.error('❌ Error aceptando invitación vía RPC:', error);
          throw new Error(`Error con la función RPC: ${error.message}`);
        }

        if (data && !data.success) {
          throw new Error(data.error || 'Error aceptando invitación');
        }

        console.log('✅ Invitación aceptada exitosamente vía RPC:', data);
        return data;      }
    } catch (error: any) {
      console.error('💥 Error en aceptarInvitacion:', error);
      throw error;
    }
  }

  /**
   * Rechaza una invitación de colaboración
   */
  async rechazarInvitacion(invitacionId: string): Promise<any> {
    try {
      console.log('❌ Rechazando invitación:', invitacionId);

      // Usar función RPC si está disponible
      const { data, error } = await this.supabase
        .rpc('rechazar_invitacion_despensa', { p_invitacion_id: invitacionId });

      if (error) {
        console.error('❌ Error rechazando invitación:', error);
        throw error;
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Error rechazando invitación');
      }

      console.log('✅ Invitación rechazada exitosamente:', data);
      return data;

    } catch (error: any) {
      console.error('💥 Error en rechazarInvitacion:', error);
      throw error;
    }
  }

  /**
   * Obtiene el conteo de invitaciones pendientes
   */
  async contarInvitacionesPendientes(): Promise<number> {
    try {
      const invitaciones = await this.obtenerInvitacionesPendientes();
      return invitaciones.length;
    } catch (error) {
      console.error('Error contando invitaciones:', error);
      return 0;
    }
  }

  /**
   * Permite a un usuario abandonar una despensa sin eliminarla
   * Solo elimina el acceso del usuario actual a la despensa
   */
  async abandonarDespensa(despensaId: string): Promise<{success: boolean, error?: any}> {
    try {
      console.log('🚶‍♂️ Abandonando despensa:', despensaId);
      
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Verificar que no sea el propietario de la despensa
      const { data: despensa, error: errorDespensa } = await this.supabase
        .from('despensas')
        .select('propietario_id')
        .eq('id', despensaId)
        .single();
      
      if (errorDespensa) {
        console.error('❌ Error verificando propietario:', errorDespensa);
        throw errorDespensa;
      }

      if (despensa.propietario_id === user.id) {
        console.error('❌ No puedes abandonar una despensa de la que eres propietario');
        throw new Error('No puedes abandonar una despensa de la que eres propietario');
      }

      // Eliminar el acceso del usuario a la despensa
      const { error } = await this.supabase
        .from('accesos_despensa')
        .delete()
        .eq('despensa_id', despensaId)
        .eq('usuario_id', user.id);

      if (error) {
        console.error('❌ Error abandonando despensa:', error);
        throw error;
      }

      console.log('✅ Has abandonado la despensa exitosamente');
      return { success: true };
    } catch (error: any) {
      console.error('💥 Error en abandonarDespensa:', error);
      return { success: false, error };
    }
  }
}