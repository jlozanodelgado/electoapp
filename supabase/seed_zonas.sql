-- ==============================================================================
-- POBLAR TABLA ZONAS con datos iniciales
-- Ejecutar DESPUÉS de supabase/create_zonas_table.sql
-- Es idempotente: usa ON CONFLICT (id) DO NOT EXISTS
-- ==============================================================================

-- Zonas de Tuluá (Valle del Cauca)
INSERT INTO public.zonas (id, municipio_id, nombre, codigo, censo, lat, lng) VALUES
  ('zona-tulua-1', 'tulua', 'Comuna 1 (Victoria / Prados)', 'COM1', NULL, 4.0847, -76.1954),
  ('zona-tulua-2', 'tulua', 'Comuna 2 (Maracaibo / Panamericano)', 'COM2', NULL, 4.0800, -76.1900),
  ('zona-tulua-3', 'tulua', 'Comuna 3 (Centro / Céspedes)', 'COM3', NULL, 4.0880, -76.1980),
  ('zona-tulua-4', 'tulua', 'Comuna 4 (Occidente / Rubén Cruz)', 'COM4', NULL, 4.0750, -76.2050),
  ('zona-tulua-5', 'tulua', 'Comuna 5 (Oriente / Fátima)', 'COM5', NULL, 4.0950, -76.1850),
  ('zona-tulua-6', 'tulua', 'Corregimiento Aguaclara', 'COR1', NULL, 4.1200, -76.2200),
  ('zona-tulua-7', 'tulua', 'Corregimiento Nariño', 'COR2', NULL, 4.0500, -76.1500),
  ('zona-tulua-8', 'tulua', 'Corregimiento La Marina (Rural)', 'COR3', NULL, 4.1500, -76.2500)
ON CONFLICT (id) DO NOTHING;

-- Zonas de Buga (Valle del Cauca)
INSERT INTO public.zonas (id, municipio_id, nombre, codigo, censo, lat, lng) VALUES
  ('zona-buga-1', 'buga', 'Zona Centro', 'ZC1', NULL, 3.9009, -76.2978),
  ('zona-buga-2', 'buga', 'Zona Norte', 'ZC2', NULL, 3.9100, -76.2900),
  ('zona-buga-3', 'buga', 'Zona Sur', 'ZC3', NULL, 3.8900, -76.3050)
ON CONFLICT (id) DO NOTHING;

-- Zonas de Cali (Valle del Cauca)
INSERT INTO public.zonas (id, municipio_id, nombre, codigo, censo, lat, lng) VALUES
  ('zona-cali-1', 'cali', 'Granada/Menga', 'ZC1', NULL, 3.4350, -76.5300),
  ('zona-cali-2', 'cali', 'San Fernando', 'ZC2', NULL, 3.4500, -76.5200),
  ('zona-cali-3', 'cali', 'Meléndez/Univalle', 'ZC3', NULL, 3.4400, -76.5400),
  ('zona-cali-4', 'cali', 'El Poblado II', 'ZC4', NULL, 3.4200, -76.5100),
  ('zona-cali-5', 'cali', 'Ciudad de Cali', 'ZC5', NULL, 3.4600, -76.5500)
ON CONFLICT (id) DO NOTHING;

-- Verificación: cuántas zonas hay por municipio
SELECT m.nombre AS municipio, COUNT(z.id) AS total_zonas
FROM public.municipios m
LEFT JOIN public.zonas z ON z.municipio_id = m.id
GROUP BY m.id, m.nombre
ORDER BY m.nombre;

-- Verificación: listar todas las zonas
SELECT id, municipio_id, nombre, codigo, censo, lat, lng, creado_en
FROM public.zonas
ORDER BY municipio_id, nombre;
