-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.accesos_despensa (
  usuario_id uuid NOT NULL,
  despensa_id uuid NOT NULL,
  rol text DEFAULT 'editor'::text,
  CONSTRAINT accesos_despensa_pkey PRIMARY KEY (usuario_id, despensa_id),
  CONSTRAINT accesos_despensa_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT accesos_despensa_despensa_id_fkey FOREIGN KEY (despensa_id) REFERENCES public.despensas(id)
);
CREATE TABLE public.alertas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tipo_alerta text,
  fecha_alerta date DEFAULT now(),
  estado text DEFAULT 'activa'::text,
  producto_despensa_id uuid,
  CONSTRAINT alertas_pkey PRIMARY KEY (id),
  CONSTRAINT alertas_producto_despensa_id_fkey FOREIGN KEY (producto_despensa_id) REFERENCES public.producto_despensa(id)
);
CREATE TABLE public.carrito (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  usuario_id uuid,
  despensa_id uuid,
  producto_id uuid,
  cantidad integer CHECK (cantidad > 0),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  notas text,
  fecha_agregado timestamp without time zone DEFAULT now(),
  CONSTRAINT carrito_pkey PRIMARY KEY (id),
  CONSTRAINT carrito_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT carrito_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT carrito_despensa_id_fkey FOREIGN KEY (despensa_id) REFERENCES public.despensas(id)
);
CREATE TABLE public.configuracion_vencimiento (
  id bigint NOT NULL DEFAULT nextval('configuracion_vencimiento_id_seq'::regclass),
  despensa_id uuid NOT NULL,
  categoria text NOT NULL,
  dias_vencimiento integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT configuracion_vencimiento_pkey PRIMARY KEY (id)
);
CREATE TABLE public.despensas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  propietario_id uuid,
  compartida boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT despensas_pkey PRIMARY KEY (id),
  CONSTRAINT despensas_propietario_id_fkey FOREIGN KEY (propietario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.detalle_receta (
  receta_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  cantidad double precision,
  CONSTRAINT detalle_receta_pkey PRIMARY KEY (receta_id, producto_id),
  CONSTRAINT detalle_receta_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES public.recetas(id),
  CONSTRAINT detalle_receta_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);
CREATE TABLE public.invitaciones_despensa (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  despensa_id uuid NOT NULL,
  email_invitado text NOT NULL,
  usuario_invitado_id uuid,
  propietario_id uuid NOT NULL,
  rol text NOT NULL CHECK (rol = ANY (ARRAY['editor'::text, 'viewer'::text])),
  estado text NOT NULL DEFAULT 'pendiente'::text CHECK (estado = ANY (ARRAY['pendiente'::text, 'aceptada'::text, 'rechazada'::text])),
  mensaje text,
  fecha_invitacion timestamp with time zone DEFAULT now(),
  fecha_respuesta timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invitaciones_despensa_pkey PRIMARY KEY (id),
  CONSTRAINT invitaciones_despensa_despensa_id_fkey FOREIGN KEY (despensa_id) REFERENCES public.despensas(id),
  CONSTRAINT invitaciones_despensa_propietario_id_fkey FOREIGN KEY (propietario_id) REFERENCES public.usuarios(id),
  CONSTRAINT invitaciones_despensa_usuario_invitado_id_fkey FOREIGN KEY (usuario_invitado_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.preferencias (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  descripcion text,
  tipo text,
  CONSTRAINT preferencias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.producto_despensa (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  despensa_id uuid,
  producto_id uuid,
  fecha_vencimiento date,
  stock integer,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT producto_despensa_pkey PRIMARY KEY (id),
  CONSTRAINT producto_despensa_producto_id_fkey1 FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT producto_despensa_despensa_id_fkey FOREIGN KEY (despensa_id) REFERENCES public.despensas(id)
);
CREATE TABLE public.productos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  categoria text,
  fecha_ingreso date DEFAULT now(),
  origen text,
  CONSTRAINT productos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.productos_aprendidos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  categoria text,
  codigo_producto text UNIQUE,
  confianza real DEFAULT 1,
  veces_detectado integer DEFAULT 1,
  clasificaciones_correctas integer DEFAULT 0,
  clasificaciones_totales integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT productos_aprendidos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recetas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre text,
  descripcion text,
  tiempo_preparacion integer,
  etiquetas text,
  CONSTRAINT recetas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.usuario_preferencia (
  usuario_id uuid NOT NULL,
  preferencia_id uuid NOT NULL,
  CONSTRAINT usuario_preferencia_pkey PRIMARY KEY (usuario_id, preferencia_id),
  CONSTRAINT usuario_preferencia_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT usuario_preferencia_preferencia_id_fkey FOREIGN KEY (preferencia_id) REFERENCES public.preferencias(id)
);
CREATE TABLE public.usuarios (
  id uuid NOT NULL DEFAULT auth.uid(),
  nombre text,
  email text UNIQUE,
  telefono text,
  pais text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);