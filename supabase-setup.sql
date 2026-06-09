-- =============================================
-- ARKA FINANCE — Supabase SQL Setup
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Tabla de ingresos
CREATE TABLE IF NOT EXISTS ingresos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  descripcion text NOT NULL,
  fecha date NOT NULL,
  remitente text NOT NULL,
  tipo_cotizacion text NOT NULL CHECK (tipo_cotizacion IN ('obligatorio', 'completo')),
  porcentaje_cotizacion numeric NOT NULL DEFAULT 28,
  ibc numeric,
  ss_pension numeric,
  ss_salud numeric,
  ss_arl numeric DEFAULT 0,
  ss_caja numeric DEFAULT 0,
  ss_total numeric,
  neto_estimado numeric,
  archivos text[],
  created_at timestamptz DEFAULT now()
);

-- Tabla de egresos
CREATE TABLE IF NOT EXISTS egresos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  descripcion text NOT NULL,
  fecha date NOT NULL,
  proveedor text NOT NULL,
  categoria text NOT NULL,
  factura_url text,
  notas text,
  created_at timestamptz DEFAULT now()
);

-- Tabla de configuración de usuario
CREATE TABLE IF NOT EXISTS user_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  porcentaje_default numeric DEFAULT 28,
  tipo_cotizacion_default text DEFAULT 'obligatorio' CHECK (tipo_cotizacion_default IN ('obligatorio', 'completo')),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE egresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;

-- Políticas para ingresos
CREATE POLICY "Users can view own ingresos"
  ON ingresos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ingresos"
  ON ingresos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ingresos"
  ON ingresos FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ingresos"
  ON ingresos FOR DELETE USING (auth.uid() = user_id);

-- Políticas para egresos
CREATE POLICY "Users can view own egresos"
  ON egresos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own egresos"
  ON egresos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own egresos"
  ON egresos FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own egresos"
  ON egresos FOR DELETE USING (auth.uid() = user_id);

-- Políticas para user_config
CREATE POLICY "Users can view own config"
  ON user_config FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config"
  ON user_config FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
  ON user_config FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- Storage bucket para adjuntos
-- =============================================
-- Ejecutar en Supabase Storage (o desde el dashboard):
-- 1. Crear bucket llamado "adjuntos" (public: true)
-- 2. Agregar política de storage:

INSERT INTO storage.buckets (id, name, public)
VALUES ('adjuntos', 'adjuntos', true)
ON CONFLICT DO NOTHING;

-- Políticas de storage
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'adjuntos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can view own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'adjuntos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view adjuntos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'adjuntos');

CREATE POLICY "Authenticated users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'adjuntos' AND auth.uid()::text = (storage.foldername(name))[1]);
