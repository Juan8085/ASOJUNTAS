-- =========================================================================
-- ConectaJAC: PostgreSQL Row-Level Security (RLS) Policies
-- Multi-Tenant Data Isolation by jac_id (tenant_id)
-- =========================================================================

-- 1. Helper Function: Obtener el contexto de Tenant y Rol de la sesión actual
-- Estas variables de sesión son inyectadas en cada conexión/transacción por el backend de NestJS
-- mediante: SET LOCAL app.current_tenant_id = 'xxx'; SET LOCAL app.is_super_admin = 'true|false';
CREATE OR REPLACE FUNCTION current_app_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(current_setting('app.is_super_admin', true) = 'true', false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Habilitar RLS en tablas aisladas por JAC
ALTER TABLE jac_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fee_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE minga_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE pqrsd_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_vote_records ENABLE ROW LEVEL SECURITY;

-- 3. Definir Políticas de Aislamiento para Miembros (Libro de Afiliados)
CREATE POLICY jac_memberships_tenant_isolation ON jac_memberships
  FOR ALL
  USING (
    is_super_admin() OR jac_id = current_app_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR jac_id = current_app_tenant_id()
  );

-- 4. Certificados
CREATE POLICY certificates_tenant_isolation ON certificates
  FOR ALL
  USING (
    is_super_admin() OR jac_id = current_app_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR jac_id = current_app_tenant_id()
  );

-- 5. Tesorería, Cuentas y Movimientos
CREATE POLICY treasury_accounts_tenant_isolation ON treasury_accounts
  FOR ALL
  USING (
    is_super_admin() OR jac_id = current_app_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR jac_id = current_app_tenant_id()
  );

CREATE POLICY treasury_transactions_tenant_isolation ON treasury_transactions
  FOR ALL
  USING (
    is_super_admin() OR jac_id = current_app_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR jac_id = current_app_tenant_id()
  );

-- 6. Transacciones de Pago y Cuotas
CREATE POLICY fee_configurations_tenant_isolation ON fee_configurations
  FOR ALL
  USING (
    is_super_admin() OR jac_id = current_app_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR jac_id = current_app_tenant_id()
  );

CREATE POLICY user_fee_obligations_tenant_isolation ON user_fee_obligations
  FOR ALL
  USING (
    is_super_admin() OR jac_id = current_app_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR jac_id = current_app_tenant_id()
  );

CREATE POLICY payment_transactions_tenant_isolation ON payment_transactions
  FOR ALL
  USING (
    is_super_admin() OR jac_id = current_app_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR jac_id = current_app_tenant_id()
  );

-- 7. PQRSD y Asambleas
CREATE POLICY pqrsd_tickets_tenant_isolation ON pqrsd_tickets
  FOR ALL
  USING (
    is_super_admin() OR jac_id = current_app_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR jac_id = current_app_tenant_id()
  );

CREATE POLICY assemblies_tenant_isolation ON assemblies
  FOR ALL
  USING (
    is_super_admin() OR jac_id = current_app_tenant_id()
  );

-- 8. TABLAS PÚBLICAS / MUNICIPALES (NO restringidas por tenant_id en lectura)
-- "Mercado Campesino": Catálogo público municipal abierto para cualquier habitante o comprador
ALTER TABLE market_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY market_products_public_read ON market_products
  FOR SELECT
  USING (true);

CREATE POLICY market_products_producer_write ON market_products
  FOR ALL
  USING (
    is_super_admin() OR jac_id = current_app_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR jac_id = current_app_tenant_id()
  );

-- Noticias / Muro Segmentado: Visibles si son públicas municipales o pertenecen a la JAC
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY posts_segmented_read ON posts
  FOR SELECT
  USING (
    scope = 'MUNICIPAL_ASOJUNTAS' OR is_super_admin() OR jac_id = current_app_tenant_id()
  );

CREATE POLICY posts_author_write ON posts
  FOR ALL
  USING (
    is_super_admin() OR jac_id = current_app_tenant_id()
  )
  WITH CHECK (
    is_super_admin() OR jac_id = current_app_tenant_id()
  );
