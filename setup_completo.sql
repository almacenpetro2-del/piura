--
-- SETUP_COMPLETO.SQL — Esquema completo de Recicladora (Khloe Global)
-- Incluye: maestros, compras, ventas, transformaciones, gastos, stock, etc.
-- Copiá y pegá TODO este archivo en el SQL Editor de Supabase
--

-- ============================================================
-- 1. TABLAS PRINCIPALES
-- ============================================================

CREATE TABLE public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT DEFAULT '',
  rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin','usuario')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.tipos_chatarra (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  unidad_medida TEXT NOT NULL DEFAULT 'kg' CHECK (unidad_medida IN ('kg','tonelada')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.clientes_proveedores (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  tipo TEXT NOT NULL CHECK (tipo IN ('cliente','proveedor')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.compras (
  id BIGSERIAL PRIMARY KEY,
  proveedor_id BIGINT REFERENCES public.clientes_proveedores(id),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.detalle_compras (
  id BIGSERIAL PRIMARY KEY,
  compra_id BIGINT REFERENCES public.compras(id) ON DELETE CASCADE,
  tipo_chatarra_id BIGINT REFERENCES public.tipos_chatarra(id),
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE public.ventas (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT REFERENCES public.clientes_proveedores(id),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ganancia NUMERIC(12,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.detalle_ventas (
  id BIGSERIAL PRIMARY KEY,
  venta_id BIGINT REFERENCES public.ventas(id) ON DELETE CASCADE,
  tipo_chatarra_id BIGINT REFERENCES public.tipos_chatarra(id),
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_unitario NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE public.stock (
  id BIGSERIAL PRIMARY KEY,
  tipo_chatarra_id BIGINT REFERENCES public.tipos_chatarra(id) UNIQUE NOT NULL,
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE public.configuracion (
  id SERIAL PRIMARY KEY,
  nombre_empresa TEXT DEFAULT 'Khloe Global',
  telefono TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  iva_porcentaje NUMERIC(5,2) DEFAULT 21.00
);

INSERT INTO public.configuracion (nombre_empresa, iva_porcentaje)
VALUES ('Khloe Global', 21.00)
ON CONFLICT DO NOTHING;

CREATE TABLE public.historico_precios (
  id BIGSERIAL PRIMARY KEY,
  tipo_chatarra_id BIGINT REFERENCES public.tipos_chatarra(id) ON DELETE CASCADE,
  precio_compra NUMERIC(12,2) DEFAULT 0,
  precio_venta NUMERIC(12,2) DEFAULT 0,
  fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.gastos_adicionales (
  id BIGSERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  categoria TEXT DEFAULT 'Varios',
  cantidad NUMERIC(10,2) DEFAULT 1,
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.transformaciones (
  id BIGSERIAL PRIMARY KEY,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  descripcion TEXT DEFAULT '',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.detalle_transformacion_entrada (
  id BIGSERIAL PRIMARY KEY,
  transformacion_id BIGINT REFERENCES public.transformaciones(id) ON DELETE CASCADE,
  tipo_chatarra_id BIGINT REFERENCES public.tipos_chatarra(id),
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE public.detalle_transformacion_salida (
  id BIGSERIAL PRIMARY KEY,
  transformacion_id BIGINT REFERENCES public.transformaciones(id) ON DELETE CASCADE,
  tipo_chatarra_id BIGINT REFERENCES public.tipos_chatarra(id),
  cantidad NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);


-- ============================================================
-- 2. HABILITAR ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_chatarra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_precios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_adicionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transformaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_transformacion_entrada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_transformacion_salida ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. POLITICAS RLS (usuarios autenticados = acceso total)
-- ============================================================

CREATE POLICY "perfiles_auth" ON public.perfiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tipos_chatarra_auth" ON public.tipos_chatarra FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "clientes_auth" ON public.clientes_proveedores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "compras_auth" ON public.compras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "detalle_compras_auth" ON public.detalle_compras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ventas_auth" ON public.ventas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "detalle_ventas_auth" ON public.detalle_ventas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "stock_auth" ON public.stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "config_auth" ON public.configuracion FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "historico_auth" ON public.historico_precios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "gastos_auth" ON public.gastos_adicionales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "transformaciones_auth" ON public.transformaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "detalle_t_entrada_auth" ON public.detalle_transformacion_entrada FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "detalle_t_salida_auth" ON public.detalle_transformacion_salida FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- 4. TRIGGER: auto-crear perfil al registrarse
--    El primer usuario registrado recibe rol = 'admin'
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', ''),
    CASE
      WHEN (SELECT COUNT(*) FROM public.perfiles) = 0 THEN 'admin'
      ELSE 'usuario'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 5. FUNCION RPC: contar usuarios (llamable sin auth)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM auth.users);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_count() TO anon, authenticated;


-- ============================================================
-- 6. INDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_compras_fecha ON public.compras(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON public.compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON public.ventas(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON public.ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_detalle_compras_compra ON public.detalle_compras(compra_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta ON public.detalle_ventas(venta_id);
CREATE INDEX IF NOT EXISTS idx_stock_tipo ON public.stock(tipo_chatarra_id);
CREATE INDEX IF NOT EXISTS idx_historico_tipo ON public.historico_precios(tipo_chatarra_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON public.gastos_adicionales(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON public.gastos_adicionales(categoria);
CREATE INDEX IF NOT EXISTS idx_transformaciones_fecha ON public.transformaciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_det_transf_entrada ON public.detalle_transformacion_entrada(transformacion_id);
CREATE INDEX IF NOT EXISTS idx_det_transf_salida ON public.detalle_transformacion_salida(transformacion_id);
CREATE INDEX IF NOT EXISTS idx_det_transf_salida_tipo ON public.detalle_transformacion_salida(tipo_chatarra_id);
CREATE INDEX IF NOT EXISTS idx_detalle_compras_tipo ON public.detalle_compras(tipo_chatarra_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_tipo ON public.detalle_ventas(tipo_chatarra_id);
