-- ==========================================================
-- Migración: sección Liquidaciones (stock que cae, por mayor y por unidad)
-- ==========================================================

ALTER TABLE perfumes
  ADD COLUMN IF NOT EXISTS es_liquidacion BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS precio_liquidacion DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS liquidacion_unidad_minima INT DEFAULT 1;

ALTER TABLE perfumes
  DROP CONSTRAINT IF EXISTS chk_liquidacion_precio_valor;
ALTER TABLE perfumes
  ADD CONSTRAINT chk_liquidacion_precio_valor CHECK (precio_liquidacion IS NULL OR precio_liquidacion > 0);

ALTER TABLE perfumes
  DROP CONSTRAINT IF EXISTS chk_liquidacion_unidad_minima;
ALTER TABLE perfumes
  ADD CONSTRAINT chk_liquidacion_unidad_minima CHECK (liquidacion_unidad_minima >= 1);

ALTER TABLE perfumes
  DROP CONSTRAINT IF EXISTS chk_liquidacion_precio;
ALTER TABLE perfumes
  ADD CONSTRAINT chk_liquidacion_precio CHECK (es_liquidacion = FALSE OR precio_liquidacion IS NOT NULL);
