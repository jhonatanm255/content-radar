-- Content Radar — Panel de Superadmin
-- Funciones y políticas para que admin@contentradar.tech pueda:
--   1. Listar todos los usuarios registrados (auth.users, normalmente oculta)
--   2. Ver todos los canales vinculados por cualquier usuario
--   3. Creación del usuario admin (idempotente, con verificación de correo omitida)

-- ═══════════════════════════════════════════════════════════════
-- 1) Helper: ¿el usuario autenticado es el superadmin?
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email = 'admin@contentradar.tech'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 2) Función: listar usuarios registrados (solo para el admin)
--    SECURITY DEFINER: la función corre como su owner (postgres),
--    lo que le permite leer auth.users a pesar del RLS.
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id::uuid,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'full_name', '')::text,
    u.created_at::timestamptz,
    u.last_sign_in_at::timestamptz
  FROM auth.users u
  WHERE public.is_admin()
  ORDER BY u.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 3) RLS: el admin puede leer TODOS los canales de la plataforma
--    (la política existente "users_select_own_channels" se suma a esta)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_select_all_channels" ON public.channels;
CREATE POLICY "admin_select_all_channels" ON public.channels
  FOR SELECT USING (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- 4) Crear el usuario admin (ejecutar UNA sola vez)
--    Es idempotente: si el usuario ya existe, no hace nada.
--    `email_confirmed_at = now()` omite la verificación por correo.
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
  admin_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@contentradar.tech') THEN
    admin_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      -- GoTrue exige estos campos como string no-NULL al hacer login
      -- (ver supabase/auth#1940: "Database error querying schema")
      confirmation_token, email_change, email_change_token_new,
      email_change_token_current, recovery_token,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@contentradar.tech',
      crypt('Isabela04.', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      now(),
      now(),
      '', '', '', '', '', '', '', ''
    );

    -- El registro en auth.identities es requerido por GoTrue para
    -- el login con email + contraseña
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      admin_id,
      admin_id,
      jsonb_build_object(
        'sub', admin_id::text,
        'email', 'admin@contentradar.tech',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      admin_id::text,
      now(), now(), now()
    );
  END IF;
END $$;
