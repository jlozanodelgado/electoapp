-- ==============================================================================
-- ELECTOAPP / VOTOMAP — ESQUEMA COMPLETO PARA SUPABASE + POSTGIS
-- Plataforma de Inteligencia Electoral, CRM de Campaña y Transmisión Día D
-- ==============================================================================

-- 1. HABILITAR EXTENSIONES ESENCIALES (UUID y POSTGIS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. TABLA DE DEPARTAMENTOS / ESTADOS
CREATE TABLE IF NOT EXISTS public.departamentos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL,
    censo BIGINT NOT NULL,
    curules INTEGER NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    zoom INTEGER DEFAULT 11,
    partido_dominante TEXT DEFAULT 'coalicion',
    participacion_pct DOUBLE PRECISION DEFAULT 60.0
);

-- 3. TABLA DE MUNICIPIOS / CIUDADES
CREATE TABLE IF NOT EXISTS public.municipios (
    id TEXT PRIMARY KEY,
    departamento_id TEXT NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL,
    censo BIGINT NOT NULL,
    curules INTEGER NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    zoom INTEGER DEFAULT 12,
    zonas TEXT[] DEFAULT '{}',
    partido_dominante TEXT DEFAULT 'coalicion',
    participacion_pct DOUBLE PRECISION DEFAULT 60.0
);

-- 4. TABLA DE PUESTOS DE VOTACIÓN (CON COLUMNA ESPACIAL POSTGIS)
CREATE TABLE IF NOT EXISTS public.puestos_votacion (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    municipio_id TEXT NOT NULL REFERENCES public.municipios(id) ON DELETE CASCADE,
    departamento_id TEXT NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
    zona TEXT NOT NULL,
    comuna_barrio TEXT NOT NULL,
    direccion TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom geometry(Point, 4326),
    censo_electoral INTEGER NOT NULL,
    mesas_habilitadas INTEGER NOT NULL,
    meta_votos_campana INTEGER NOT NULL,
    votos_proyectados INTEGER NOT NULL,
    estado_prioridad TEXT CHECK (estado_prioridad IN ('critico', 'estrategico', 'consolidado', 'normal')) DEFAULT 'normal',
    partido_dominante TEXT CHECK (partido_dominante IN ('coalicion', 'alianza', 'unidad')) DEFAULT 'coalicion',
    margen_victoria_pct DOUBLE PRECISION DEFAULT 15.0,
    participacion_historica_pct DOUBLE PRECISION DEFAULT 60.0,
    abstencionismo_pct DOUBLE PRECISION DEFAULT 40.0,
    cobertura_testigos_pct DOUBLE PRECISION DEFAULT 90.0
);

-- Índice espacial GIST para consultas ultra-rápidas en PostGIS
CREATE INDEX IF NOT EXISTS idx_puestos_votacion_geom ON public.puestos_votacion USING GIST (geom);

-- Trigger para autocomputar el campo geom a partir de lat y lng
CREATE OR REPLACE FUNCTION public.calcular_geom_puesto()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcular_geom_puesto ON public.puestos_votacion;
CREATE TRIGGER trg_calcular_geom_puesto
BEFORE INSERT OR UPDATE OF lat, lng ON public.puestos_votacion
FOR EACH ROW
EXECUTE FUNCTION public.calcular_geom_puesto();

-- 5. TABLA DE HISTÓRICO ELECTORAL (Últimas 3 elecciones por puesto)
CREATE TABLE IF NOT EXISTS public.historico_electoral (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    puesto_id TEXT NOT NULL REFERENCES public.puestos_votacion(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    eleccion TEXT NOT NULL,
    participacion_pct DOUBLE PRECISION,
    votos_coalicion INTEGER DEFAULT 0,
    votos_alianza INTEGER DEFAULT 0,
    votos_unidad INTEGER DEFAULT 0,
    votos_otros INTEGER DEFAULT 0,
    votos_blanco INTEGER DEFAULT 0,
    votos_nulos INTEGER DEFAULT 0
);

-- 6. TABLA DE TESTIGOS ELECTORALES Y JURADOS
CREATE TABLE IF NOT EXISTS public.testigos_electorales (
    id TEXT PRIMARY KEY,
    puesto_id TEXT NOT NULL REFERENCES public.puestos_votacion(id) ON DELETE CASCADE,
    puesto_nombre TEXT NOT NULL,
    mesa_numero INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    cedula TEXT NOT NULL,
    telefono TEXT NOT NULL,
    rol TEXT CHECK (rol IN ('testigo_mesa', 'coordinador_puesto', 'abogado_escrutinio', 'remanente')) DEFAULT 'testigo_mesa',
    estado TEXT CHECK (estado IN ('confirmado', 'pendiente', 'ausente')) DEFAULT 'pendiente',
    hora_llegada TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA DE SIMPATIZANTES / CRM DE VOTANTES
CREATE TABLE IF NOT EXISTS public.votantes_crm (
    id TEXT PRIMARY KEY,
    puesto_id TEXT NOT NULL REFERENCES public.puestos_votacion(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    cedula TEXT NOT NULL,
    telefono TEXT NOT NULL,
    direccion TEXT,
    barrio TEXT,
    intencion_voto TEXT CHECK (intencion_voto IN ('voto_duro', 'voto_blando', 'indeciso', 'opositor')) DEFAULT 'voto_duro',
    lider_asignado TEXT,
    contactado BOOLEAN DEFAULT false,
    necesita_transporte BOOLEAN DEFAULT false,
    ya_voto BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA DE DÍA D: ACTAS DE ESCRUTINIO FORMATO E-14
CREATE TABLE IF NOT EXISTS public.actas_e14 (
    id TEXT PRIMARY KEY,
    puesto_id TEXT NOT NULL REFERENCES public.puestos_votacion(id) ON DELETE CASCADE,
    mesa_numero INTEGER NOT NULL,
    hora_reporte TEXT NOT NULL,
    digitalizado_por TEXT NOT NULL,
    votos_coalicion INTEGER NOT NULL DEFAULT 0,
    votos_alianza INTEGER NOT NULL DEFAULT 0,
    votos_unidad INTEGER NOT NULL DEFAULT 0,
    votos_otros INTEGER NOT NULL DEFAULT 0,
    votos_blanco INTEGER NOT NULL DEFAULT 0,
    votos_nulos INTEGER NOT NULL DEFAULT 0,
    votos_no_marcados INTEGER NOT NULL DEFAULT 0,
    total_votos_urna INTEGER NOT NULL DEFAULT 0,
    estado_revision TEXT CHECK (estado_revision IN ('aprobada', 'alerta_discrepancia', 'pendiente_verificacion')) DEFAULT 'aprobada',
    foto_acta_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLA DE ALERTAS DE FRAUDE Y DISCREPANCIAS ESTADÍSTICAS
CREATE TABLE IF NOT EXISTS public.alertas_fraude (
    id TEXT PRIMARY KEY,
    puesto_id TEXT NOT NULL REFERENCES public.puestos_votacion(id) ON DELETE CASCADE,
    puesto_nombre TEXT NOT NULL,
    mesa_numero INTEGER NOT NULL,
    severidad TEXT CHECK (severidad IN ('alta', 'media', 'baja')) DEFAULT 'media',
    tipo TEXT CHECK (tipo IN ('nulos_anormales', 'censo_excedido', 'discrepancia_urna', 'testigo_ausente')) NOT NULL,
    descripcion TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    resuelta BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. FUNCIÓN POSTGIS: BÚSQUEDA ESPACIAL POR RADIO (BUFFER EN KM)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.buscar_puestos_por_radio(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radio_km DOUBLE PRECISION
)
RETURNS SETOF public.puestos_votacion AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.puestos_votacion
    WHERE ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radio_km * 1000
    )
    ORDER BY ST_Distance(
        geom::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    );
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 11. HABILITAR SUPABASE REALTIME (WebSockets para Transmisión en Vivo Día D)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.actas_e14;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas_fraude;
ALTER PUBLICATION supabase_realtime ADD TABLE public.testigos_electorales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votantes_crm;

-- ==============================================================================
-- 12. HABILITAR ROW LEVEL SECURITY (RLS) CON LECTURA PÚBLICA PARA CAMPAÑA
-- ==============================================================================
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puestos_votacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_electoral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testigos_electorales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votantes_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actas_e14 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_fraude ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para anon / authenticated
CREATE POLICY "Permitir lectura general" ON public.departamentos FOR ALL USING (true);
CREATE POLICY "Permitir lectura general" ON public.municipios FOR ALL USING (true);
CREATE POLICY "Permitir lectura general" ON public.puestos_votacion FOR ALL USING (true);
CREATE POLICY "Permitir lectura general" ON public.historico_electoral FOR ALL USING (true);
CREATE POLICY "Permitir lectura y mutaciones" ON public.testigos_electorales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y mutaciones" ON public.votantes_crm FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y mutaciones" ON public.actas_e14 FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y mutaciones" ON public.alertas_fraude FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 13. DATOS INICIALES (SEMILLAS DEPARTAMENTOS Y MUNICIPIOS)
-- ==============================================================================
INSERT INTO public.departamentos (id, nombre, codigo, censo, curules, lat, lng, zoom, partido_dominante, participacion_pct)
VALUES
('cundinamarca', 'Cundinamarca / Bogotá D.C.', '25', 8450000, 18, 4.6500, -74.0833, 11, 'coalicion', 62.4),
('antioquia', 'Antioquia', '05', 5120000, 17, 6.2442, -75.5812, 11, 'alianza', 58.7),
('valle', 'Valle del Cauca', '76', 3780000, 13, 3.4372, -76.5225, 11, 'coalicion', 56.1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.municipios (id, departamento_id, nombre, codigo, censo, curules, lat, lng, zoom, zonas, partido_dominante, participacion_pct)
VALUES
('bogota', 'cundinamarca', 'Bogotá D.C.', '11001', 6150000, 18, 4.6486, -74.0850, 12, ARRAY['Chapinero', 'Usaquén', 'Kennedy', 'Suba', 'Teusaquillo', 'Santa Fe'], 'coalicion', 63.8),
('soacha', 'cundinamarca', 'Soacha', '25754', 580000, 3, 4.5800, -74.2200, 13, ARRAY['Compartir', 'Soacha Central', 'La Despensa'], 'coalicion', 54.2),
('medellin', 'antioquia', 'Medellín', '05001', 1890000, 10, 6.2476, -75.5658, 12, ARRAY['Comuna 1 Popular', 'Comuna 10 La Candelaria', 'Comuna 11 Laureles', 'Comuna 13 San Javier', 'Comuna 14 El Poblado'], 'alianza', 60.5),
('bello', 'antioquia', 'Bello', '05088', 420000, 4, 6.3370, -75.5560, 13, ARRAY['Bello Centro', 'Niquía', 'París'], 'unidad', 53.6),
('cali', 'valle', 'Santiago de Cali', '76001', 1950000, 9, 3.4350, -76.5300, 12, ARRAY['Granada/Menga', 'San Fernando', 'Meléndez/Univalle', 'El Poblado II', 'Ciudad de Cali'], 'coalicion', 57.9)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 14. DATOS INICIALES (PUESTOS DE VOTACIÓN CON COORDENADAS EXACTAS)
-- ==============================================================================
INSERT INTO public.puestos_votacion (
    id, nombre, municipio_id, departamento_id, zona, comuna_barrio, direccion,
    lat, lng, censo_electoral, mesas_habilitadas, meta_votos_campana, votos_proyectados,
    estado_prioridad, partido_dominante, margen_victoria_pct, participacion_historica_pct,
    abstencionismo_pct, cobertura_testigos_pct
) VALUES
-- Bogotá
('puesto-bog-01', 'Corferias - Gran Carpa', 'bogota', 'cundinamarca', 'Teusaquillo', 'Quinta Paredes', 'Cra 37 # 24-67', 4.6292, -74.0903, 42000, 110, 16500, 17200, 'estrategico', 'coalicion', 14.2, 65.4, 34.6, 98.0),
('puesto-bog-02', 'Unicentro Bogotá', 'bogota', 'cundinamarca', 'Usaquén', 'Santa Bárbara', 'Av Cra 15 # 124-30', 4.7015, -74.0418, 28500, 75, 6200, 5800, 'critico', 'alianza', 22.8, 71.0, 29.0, 92.0),
('puesto-bog-03', 'Plaza de las Américas - Carpa Norte', 'bogota', 'cundinamarca', 'Kennedy', 'Mundo Nuevo', 'Transversal 71D # 26-94 Sur', 4.6190, -74.1350, 35000, 92, 15800, 16100, 'consolidado', 'coalicion', 31.4, 58.2, 41.8, 100.0),
('puesto-bog-04', 'Col. Gerardo Paredes - Suba Rincón', 'bogota', 'cundinamarca', 'Suba', 'El Rincón', 'Cra 94 # 129B-04', 4.7431, -74.0864, 31000, 80, 13200, 12900, 'estrategico', 'coalicion', 18.6, 61.3, 38.7, 88.0),
('puesto-bog-05', 'Coliseo El Campín / Movistar Arena', 'bogota', 'cundinamarca', 'Teusaquillo', 'Galerías', 'Diagonal 61C # 26-36', 4.6489, -74.0788, 26000, 68, 10400, 10100, 'normal', 'coalicion', 9.5, 67.2, 32.8, 95.0),
('puesto-bog-06', 'IED Inocencio Chincá - Chapinero', 'bogota', 'cundinamarca', 'Chapinero', 'Lourdes', 'Calle 63 # 11-45', 4.6515, -74.0620, 21000, 55, 8900, 9200, 'consolidado', 'coalicion', 15.0, 68.0, 32.0, 100.0),
('puesto-bog-07', 'Colegio Anglo Colombiano - Cedritos', 'bogota', 'cundinamarca', 'Usaquén', 'Cedritos', 'Cra 19 # 147-30', 4.7291, -74.0321, 22000, 58, 4800, 4500, 'critico', 'alianza', 26.5, 74.5, 25.5, 82.0),
('puesto-bog-08', 'IED OEA - Kennedy Central', 'bogota', 'cundinamarca', 'Kennedy', 'Ciudad Kennedy Oriental', 'Cra 78B # 38C-20 Sur', 4.6295, -74.1521, 38000, 98, 17500, 18100, 'consolidado', 'coalicion', 34.0, 57.0, 43.0, 100.0),

-- Soacha
('puesto-soa-01', 'Polideportivo Compartir', 'soacha', 'cundinamarca', 'Compartir', 'Compartir Sur', 'Calle 30 Sur # 14-22', 4.5684, -74.2389, 21000, 55, 9800, 10400, 'estrategico', 'coalicion', 28.0, 52.8, 47.2, 91.0),
('puesto-soa-02', 'Colegio Bolívar Soacha Central', 'soacha', 'cundinamarca', 'Soacha Central', 'El Dorado', 'Carrera 7 # 12-40', 4.5821, -74.2185, 19500, 50, 8500, 8900, 'consolidado', 'coalicion', 24.5, 54.1, 45.9, 96.0),

-- Medellín
('puesto-med-01', 'Plaza Mayor - Gran Salón', 'medellin', 'antioquia', 'Comuna 10 La Candelaria', 'Alpujarra', 'Calle 41 # 55-80', 6.2423, -75.5752, 36000, 95, 11200, 10800, 'critico', 'alianza', 16.8, 62.4, 37.6, 95.0),
('puesto-med-02', 'INEM José Félix de Restrepo - El Poblado', 'medellin', 'antioquia', 'Comuna 14 El Poblado', 'Astorga / Manila', 'Cra 48 # 1-125', 6.2087, -75.5721, 29000, 76, 5100, 4900, 'critico', 'alianza', 38.5, 73.0, 27.0, 84.0),
('puesto-med-03', 'Col. San Ignacio - Laureles', 'medellin', 'antioquia', 'Comuna 11 Laureles', 'Laureles Estadio', 'Circular 4 # 73-44', 6.2449, -75.5962, 27500, 72, 7800, 7500, 'normal', 'alianza', 18.2, 66.5, 33.5, 90.0),
('puesto-med-04', 'I.E. Eduardo Santos - Comuna 13', 'medellin', 'antioquia', 'Comuna 13 San Javier', 'Eduardo Santos', 'Calle 44 # 118-20', 6.2541, -75.6178, 23000, 60, 11500, 12100, 'estrategico', 'coalicion', 24.1, 57.5, 42.5, 100.0),
('puesto-med-05', 'I.E. María Cano - Popular 1', 'medellin', 'antioquia', 'Comuna 1 Popular', 'Popular 1', 'Cra 42 # 106-25', 6.2891, -75.5452, 25000, 65, 13000, 13400, 'consolidado', 'coalicion', 29.8, 58.1, 41.9, 100.0),

-- Bello
('puesto-bel-01', 'I.E. Fernando Vélez - Bello Central', 'bello', 'antioquia', 'Bello Centro', 'Suárez', 'Calle 52 # 49-21', 6.3354, -75.5581, 26000, 68, 8500, 8100, 'normal', 'unidad', 11.2, 53.0, 47.0, 88.0),
('puesto-bel-02', 'Coliseo Tulio Ospina - Niquía', 'bello', 'antioquia', 'Niquía', 'Niquía Terranova', 'Diagonal 55 # 37-01', 6.3421, -75.5492, 31000, 82, 10800, 11200, 'estrategico', 'coalicion', 15.4, 55.2, 44.8, 93.0),

-- Cali
('puesto-cal-01', 'Coliseo El Pueblo - San Fernando', 'cali', 'valle', 'San Fernando', 'El Cedro / Champagnat', 'Carrera 52 # 2-00', 3.4147, -76.5491, 34000, 88, 15600, 16200, 'consolidado', 'coalicion', 27.5, 61.2, 38.8, 97.0),
('puesto-cal-02', 'Universidad del Valle - Sede Meléndez', 'cali', 'valle', 'Meléndez/Univalle', 'Ciudad Universitaria', 'Calle 13 # 100-00', 3.3742, -76.5333, 29000, 76, 14800, 15500, 'consolidado', 'coalicion', 42.0, 64.0, 36.0, 100.0),
('puesto-cal-03', 'CAM - Torre Alcaldía Cali', 'cali', 'valle', 'Granada/Menga', 'Centenario', 'Av 2 Norte # 10N-70', 3.4542, -76.5350, 22000, 58, 8200, 8000, 'normal', 'alianza', 6.5, 63.5, 36.5, 91.0),
('puesto-cal-04', 'Ciudadela Nuevo Latir - Aguablanca', 'cali', 'valle', 'El Poblado II', 'El Poblado II', 'Calle 76 # 28-20', 3.4190, -76.4950, 36000, 94, 18200, 19100, 'estrategico', 'coalicion', 36.4, 53.0, 47.0, 100.0),
('puesto-cal-05', 'I.E. Eustaquio Palacios - Siloé', 'cali', 'valle', 'San Fernando', 'Siloé / Belisario', 'Cra 52 con Calle 1 Oeste', 3.4289, -76.5512, 25000, 65, 12500, 13000, 'estrategico', 'coalicion', 30.2, 56.4, 43.6, 98.0)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 15. DATOS INICIALES (TESTIGOS ELECTORALES)
-- ==============================================================================
INSERT INTO public.testigos_electorales (id, puesto_id, puesto_nombre, mesa_numero, nombre, cedula, telefono, rol, estado, hora_llegada)
VALUES
('testigo-01', 'puesto-bog-01', 'Corferias - Gran Carpa', 1, 'Camila Andrea Restrepo Gómez', '1.020.450.891', '+57 312 458 9201', 'coordinador_puesto', 'confirmado', '06:45 AM'),
('testigo-02', 'puesto-bog-01', 'Corferias - Gran Carpa', 14, 'Carlos Eduardo Montoya', '79.845.120', '+57 315 889 1243', 'testigo_mesa', 'confirmado', '07:15 AM'),
('testigo-03', 'puesto-bog-01', 'Corferias - Gran Carpa', 15, 'Diana Marcela Torres', '52.934.112', '+57 320 671 9044', 'testigo_mesa', 'pendiente', NULL),
('testigo-04', 'puesto-bog-02', 'Unicentro Bogotá', 3, 'Felipe José Silva Calderón', '80.123.990', '+57 301 234 5678', 'testigo_mesa', 'confirmado', '07:05 AM'),
('testigo-05', 'puesto-bog-02', 'Unicentro Bogotá', 8, 'Natalia Pardo Ortiz', '1.018.776.432', '+57 318 459 0012', 'testigo_mesa', 'ausente', NULL),
('testigo-06', 'puesto-bog-03', 'Plaza de las Américas - Carpa Norte', 1, 'Javier Alonso Peña', '19.456.789', '+57 310 982 3411', 'coordinador_puesto', 'confirmado', '06:30 AM'),
('testigo-07', 'puesto-med-01', 'Plaza Mayor - Gran Salón', 1, 'Alejandro Vélez Londoño', '71.234.890', '+57 300 456 7812', 'coordinador_puesto', 'confirmado', '06:50 AM'),
('testigo-08', 'puesto-med-01', 'Plaza Mayor - Gran Salón', 5, 'Mariana Uribe Saldarriaga', '1.037.665.431', '+57 314 789 0123', 'testigo_mesa', 'pendiente', NULL),
('testigo-09', 'puesto-med-04', 'I.E. Eduardo Santos - Comuna 13', 2, 'Mateo Henao Quintero', '1.152.443.210', '+57 319 887 6543', 'testigo_mesa', 'confirmado', '07:00 AM'),
('testigo-10', 'puesto-cal-01', 'Coliseo El Pueblo - San Fernando', 1, 'Claudia Viviana Mina', '66.890.123', '+57 316 554 4332', 'coordinador_puesto', 'confirmado', '06:40 AM')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 16. DATOS INICIALES (SIMPATIZANTES CRM)
-- ==============================================================================
INSERT INTO public.votantes_crm (id, puesto_id, nombre, cedula, telefono, direccion, barrio, intencion_voto, lider_asignado, contactado, necesita_transporte, ya_voto)
VALUES
('votante-01', 'puesto-bog-01', 'Rodrigo Hernando Bernal', '19.345.890', '+57 310 445 1122', 'Cra 40 # 25-10', 'Quinta Paredes', 'voto_duro', 'Martha Lucía Cárdenas', true, false, true),
('votante-02', 'puesto-bog-01', 'Paola Andrea Rivas', '1.020.789.445', '+57 311 889 0044', 'Calle 24B # 38-12', 'Gran América', 'voto_blando', 'Martha Lucía Cárdenas', true, true, false),
('votante-03', 'puesto-bog-03', 'Luis Fernando Gaitán', '79.332.114', '+57 315 776 5544', 'Cra 71B # 28-30 Sur', 'Mundo Nuevo', 'voto_duro', 'Jorge Iván Mora', true, false, true),
('votante-04', 'puesto-bog-03', 'Yenny Esperanza Parra', '53.112.449', '+57 318 990 1234', 'Calle 35 Sur # 72-15', 'Kennedy Central', 'indeciso', 'Jorge Iván Mora', false, false, false),
('votante-05', 'puesto-med-04', 'Juan Guillermo Serna', '1.037.445.667', '+57 300 223 9988', 'Calle 45 # 119-08', 'Eduardo Santos', 'voto_duro', 'Doña Gloria Inés Mazo', true, false, true),
('votante-06', 'puesto-cal-04', 'Luz Dary Mosquera', '66.908.112', '+57 317 889 0011', 'Calle 78 # 28C-14', 'El Poblado II', 'voto_duro', 'Amilcar Cuero', true, false, true)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 17. DATOS INICIALES (ACTAS E-14 Y ALERTAS DE FRAUDE)
-- ==============================================================================
INSERT INTO public.actas_e14 (id, puesto_id, mesa_numero, hora_reporte, digitalizado_por, votos_coalicion, votos_alianza, votos_unidad, votos_otros, votos_blanco, votos_nulos, votos_no_marcados, total_votos_urna, estado_revision)
VALUES
('acta-e14-01', 'puesto-bog-01', 1, '16:45 PM', 'Camila Restrepo (Coord)', 142, 65, 12, 8, 4, 3, 2, 236, 'aprobada'),
('acta-e14-02', 'puesto-bog-01', 14, '17:10 PM', 'Carlos Montoya (Testigo)', 80, 45, 8, 3, 2, 48, 1, 187, 'alerta_discrepancia'),
('acta-e14-03', 'puesto-bog-03', 1, '16:55 PM', 'Javier Alonso Peña', 178, 42, 9, 4, 3, 2, 1, 239, 'aprobada'),
('acta-e14-04', 'puesto-med-04', 2, '17:05 PM', 'Mateo Henao Quintero', 195, 28, 6, 2, 2, 1, 0, 234, 'aprobada')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.alertas_fraude (id, puesto_id, puesto_nombre, mesa_numero, severidad, tipo, descripcion, timestamp, resuelta)
VALUES
('alerta-01', 'puesto-bog-01', 'Corferias - Gran Carpa', 14, 'alta', 'nulos_anormales', 'Pico anómalo de votos nulos (48 votos nulos = 25.6% del total). Se sospecha tachadura deliberada.', '17:12 PM', false),
('alerta-02', 'puesto-soa-01', 'Polideportivo Compartir', 4, 'alta', 'censo_excedido', 'Discrepancia aritmética crítica en E-14: Total reportado excede el censo máximo por mesa.', '17:32 PM', false),
('alerta-03', 'puesto-bog-02', 'Unicentro Bogotá', 8, 'media', 'testigo_ausente', 'Mesa sin presencia de testigo electoral acreditado durante apertura de urna.', '08:05 AM', false)
ON CONFLICT (id) DO NOTHING;
