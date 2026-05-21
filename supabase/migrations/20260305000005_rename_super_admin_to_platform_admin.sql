-- Rename super_admin to platform_admin in app_role enum

ALTER TYPE app_role RENAME VALUE 'super_admin' TO 'platform_admin';

-- Update helper function
CREATE OR REPLACE FUNCTION is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = 'platform_admin'
  );
$$;

-- Update has_role so platform_admin still passes admin checks
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR role = 'platform_admin'
      )
  );
$$;
