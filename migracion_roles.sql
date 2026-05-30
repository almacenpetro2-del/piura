-- ============================================================
-- MIGRACION: Sistema de 3 Roles
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Actualizar CHECK constraint de perfiles.rol
ALTER TABLE public.perfiles
  DROP CONSTRAINT IF EXISTS perfiles_rol_check;

ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('admin', 'supervisor', 'operario'));

-- 2. Cambiar default a 'operario'
ALTER TABLE public.perfiles
  ALTER COLUMN rol SET DEFAULT 'operario';

-- 3. Migrar usuarios existentes: 'usuario' -> 'operario'
UPDATE public.perfiles SET rol = 'operario' WHERE rol = 'usuario';
UPDATE public.perfiles SET rol = 'supervisor' WHERE rol NOT IN ('admin', 'supervisor', 'operario');

-- 4. Actualizar el trigger handle_new_user para que el default sea 'operario'
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
      ELSE 'operario'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
