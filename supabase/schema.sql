-- ==============================================================================
-- ELECTOAPP / VOTOMAP — ESQUEMA PILOTO TULUÁ (VALLE DEL CAUCA)
-- PostgreSQL + Extensión PostGIS + Supabase Realtime
-- ==============================================================================

-- 1. HABILITAR EXTENSIONES POSTGIS Y UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. TABLA DE DEPARTAMENTOS
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

-- 3. TABLA DE MUNICIPIOS
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

-- 4. TABLA DE PUESTOS DE VOTACIÓN (CON COLUMNA GEOMETRÍA POSTGIS)
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

-- Índice espacial GIST para consultas geográficas ultra-rápidas
CREATE INDEX IF NOT EXISTS idx_puestos_votacion_geom ON public.puestos_votacion USING GIST (geom);

-- Trigger para autocomputar el campo geom a partir de latitud y longitud
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

-- 5. TABLA DE HISTÓRICO ELECTORAL (3 ELECCIONES POR PUESTO)
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

-- 9. TABLA DE ALERTAS DE FRAUDE Y DISCREPANCIAS
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

-- 10. FUNCIÓN POSTGIS: BÚSQUEDA ESPACIAL POR RADIO (BUFFER EN KM)
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

-- 11. HABILITAR SUPABASE REALTIME (WebSockets para Transmisión en Vivo Día D)
ALTER PUBLICATION supabase_realtime ADD TABLE public.actas_e14;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas_fraude;
ALTER PUBLICATION supabase_realtime ADD TABLE public.testigos_electorales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votantes_crm;

-- 12. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puestos_votacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_electoral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testigos_electorales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votantes_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actas_e14 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_fraude ENABLE ROW LEVEL SECURITY;

-- General read policies (keep permissive for demo)
CREATE POLICY "Permitir lectura general" ON public.departamentos FOR ALL USING (true);
CREATE POLICY "Permitir lectura general" ON public.municipios FOR ALL USING (true);
CREATE POLICY "Permitir lectura general" ON public.puestos_votacion FOR ALL USING (true);
CREATE POLICY "Permitir lectura general" ON public.historico_electoral FOR ALL USING (true);
CREATE POLICY "Permitir lectura y mutaciones" ON public.testigos_electorales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y mutaciones" ON public.votantes_crm FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y mutaciones" ON public.actas_e14 FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y mutaciones" ON public.alertas_fraude FOR ALL USING (true) WITH CHECK (true);

-- 13. SECURITY ACTORS TABLE ---------------------------------------------------
CREATE TYPE public.actor_role AS ENUM (
  'totalSupervisor',
  'candidateSupervisor',
  'leader',
  'witness',
  'voter'
);
CREATE TYPE public.scope_level AS ENUM (
  'national',
  'department',
  'municipality'
);

CREATE TABLE IF NOT EXISTS public.actors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  role actor_role NOT NULL,
  candidato_id UUID NULL,
  scope_level scope_level NULL,
  scope_id TEXT NULL,
  leader_id UUID NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional foreign keys (candidates table may not exist yet, comment if undefined)
-- ALTER TABLE public.actors ADD CONSTRAINT fk_candidate FOREIGN KEY (candidato_id) REFERENCES public.candidatos(id) ON DELETE SET NULL;
ALTER TABLE public.actors ADD CONSTRAINT fk_leader FOREIGN KEY (leader_id) REFERENCES public.actors(id) ON DELETE SET NULL;

-- Row‑level security for actors
ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;
CREATE POLICY actor_total_supervisor_all ON public.actors FOR ALL USING (auth.role() = 'totalSupervisor');
CREATE POLICY actor_candidate_supervisor ON public.actors FOR ALL USING (auth.role() = 'candidateSupervisor' AND candidato_id = auth.uid());
CREATE POLICY actor_leader_manage ON public.actors FOR ALL USING (auth.role() = 'leader' AND leader_id = auth.uid());

-- ==============================================================================
-- 13. SEMILLAS DEPARTAMENTOS Y MUNICIPIOS (FOCO: TULUÁ, VALLE DEL CAUCA)
-- ==============================================================================
INSERT INTO public.departamentos (id, nombre, codigo, censo, curules, lat, lng, zoom, partido_dominante, participacion_pct)
VALUES
('valle', 'Valle del Cauca', '76', 3780000, 13, 4.0847, -76.1954, 11, 'coalicion', 59.4),
('cundinamarca', 'Cundinamarca / Bogotá D.C.', '25', 8450000, 18, 4.6500, -74.0833, 11, 'coalicion', 62.4),
('antioquia', 'Antioquia', '05', 5120000, 17, 6.2442, -75.5812, 11, 'alianza', 58.7)
ON CONFLICT (id) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng;

INSERT INTO public.municipios (id, departamento_id, nombre, codigo, censo, curules, lat, lng, zoom, zonas, partido_dominante, participacion_pct)
VALUES
('tulua', 'valle', 'Tuluá (Corazón del Valle)', '76834', 178500, 17, 4.0847, -76.1954, 13, 
 ARRAY[
   'Comuna 1 (Victoria / Prados)', 
   'Comuna 2 (Maracaibo / Panamericano)', 
   'Comuna 3 (Centro / Céspedes)', 
   'Comuna 4 (Occidente / Rubén Cruz)', 
   'Comuna 5 (Oriente / Fátima)', 
   'Corregimiento Aguaclara', 
   'Corregimiento Nariño', 
   'Corregimiento La Marina (Rural)'
 ], 
 'coalicion', 61.2),
('buga', 'valle', 'Guadalajara de Buga', '76111', 105000, 17, 3.9009, -76.2978, 13, ARRAY['Zona Centro', 'Zona Norte', 'Zona Sur'], 'coalicion', 58.5)
ON CONFLICT (id) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    censo = EXCLUDED.censo,
    curules = EXCLUDED.curules,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    zonas = EXCLUDED.zonas;

-- ==============================================================================
-- 14. SEMILLAS PUESTOS DE VOTACIÓN EN TULUÁ (COBERTURA COMPLETA)
-- ==============================================================================
INSERT INTO public.puestos_votacion (
    id, nombre, municipio_id, departamento_id, zona, comuna_barrio, direccion,
    lat, lng, censo_electoral, mesas_habilitadas, meta_votos_campana, votos_proyectados,
    estado_prioridad, partido_dominante, margen_victoria_pct, participacion_historica_pct,
    abstencionismo_pct, cobertura_testigos_pct
) VALUES
-- COMUNA 3: CENTRO / CÉSPEDES
('puesto-tul-01', 'I.E. Gimnasio del Pacífico', 'tulua', 'valle', 'Comuna 3 (Centro / Céspedes)', 'Centro / Céspedes', 'Calle 27 # 36-39', 4.0852, -76.1985, 16800, 44, 6800, 7150, 'estrategico', 'coalicion', 18.4, 64.2, 35.8, 100.0),
('puesto-tul-02', 'I.E. Julia Restrepo (Sede Principal)', 'tulua', 'valle', 'Comuna 3 (Centro / Céspedes)', 'Centro', 'Calle 27 # 24-42', 4.0825, -76.1940, 14200, 38, 5400, 5650, 'consolidado', 'coalicion', 22.1, 66.8, 33.2, 97.0),
('puesto-tul-03', 'I.E. Corazón del Valle', 'tulua', 'valle', 'Comuna 3 (Centro / Céspedes)', 'El Carmen', 'Cra 23 # 24-52', 4.0810, -76.1920, 12500, 33, 4900, 5100, 'normal', 'coalicion', 15.6, 62.0, 38.0, 94.0),
('puesto-tul-04', 'I.E. San Pedro Claver', 'tulua', 'valle', 'Comuna 3 (Centro / Céspedes)', 'Céspedes', 'Carrera 28 # 20-35', 4.0815, -76.2010, 9800, 26, 3800, 3950, 'normal', 'coalicion', 12.8, 60.5, 39.5, 92.0),

-- COMUNA 1: VICTORIA / PRADOS DEL NORTE
('puesto-tul-05', 'I.E. Juan María Céspedes - Sede Victoria', 'tulua', 'valle', 'Comuna 1 (Victoria / Prados)', 'Barrio Victoria', 'Calle 34 # 25-50', 4.0780, -76.1990, 13500, 35, 5800, 6100, 'estrategico', 'coalicion', 24.5, 63.8, 36.2, 100.0),
('puesto-tul-06', 'I.E. Alfonso López Pumarejo (Prados del Norte)', 'tulua', 'valle', 'Comuna 1 (Victoria / Prados)', 'Prados del Norte', 'Carrera 40 # 27-20', 4.0750, -76.2050, 11200, 30, 4600, 4800, 'normal', 'coalicion', 19.0, 61.5, 38.5, 93.0),
('puesto-tul-07', 'Coliseo de Ferias Manuel Victoria Sánchez', 'tulua', 'valle', 'Comuna 1 (Victoria / Prados)', 'San Antonio', 'Transversal 12 # 24-00', 4.0730, -76.2080, 8900, 24, 3600, 3450, 'critico', 'alianza', 8.5, 59.0, 41.0, 88.0),

-- COMUNA 2: MARACAIBO / PANAMERICANO
('puesto-tul-08', 'I.E. Técnico Industrial (ITI)', 'tulua', 'valle', 'Comuna 2 (Maracaibo / Panamericano)', 'El Príncipe', 'Carrera 24 # 41-45', 4.0920, -76.1960, 15400, 40, 6200, 6500, 'consolidado', 'coalicion', 26.8, 65.0, 35.0, 100.0),
('puesto-tul-09', 'Coliseo Benicio Echeverry - Doce de Octubre', 'tulua', 'valle', 'Comuna 2 (Maracaibo / Panamericano)', 'Doce de Octubre', 'Carrera 28 # 40-10', 4.0910, -76.2010, 10800, 28, 4200, 4400, 'normal', 'coalicion', 14.5, 61.0, 39.0, 96.0),
('puesto-tul-10', 'I.E. Jovita Santacoloma (Salesiano)', 'tulua', 'valle', 'Comuna 2 (Maracaibo / Panamericano)', 'Salesiano', 'Calle 26 # 38-10', 4.0865, -76.2020, 8500, 22, 3400, 3550, 'normal', 'coalicion', 16.0, 63.0, 37.0, 91.0),

-- COMUNA 4: OCCIDENTE / RUBÉN CRUZ
('puesto-tul-11', 'I.E. Rubén Cruz Vélez', 'tulua', 'valle', 'Comuna 4 (Occidente / Rubén Cruz)', 'Rubén Cruz Vélez', 'Calle 44 # 18-25', 4.0950, -76.2070, 12800, 34, 5600, 5900, 'estrategico', 'coalicion', 29.5, 59.8, 40.2, 100.0),
('puesto-tul-12', 'I.E. Tomás Uribe Uribe (Barrio Popular)', 'tulua', 'valle', 'Comuna 4 (Occidente / Rubén Cruz)', 'Popular', 'Carrera 19 # 35-10', 4.0915, -76.2120, 9600, 25, 4100, 4350, 'consolidado', 'coalicion', 25.0, 58.5, 41.5, 100.0),

-- COMUNA 5: ORIENTE / FÁTIMA / VILLA LILIANA
('puesto-tul-13', 'Universidad del Valle - Sede Tuluá', 'tulua', 'valle', 'Comuna 5 (Oriente / Fátima)', 'Villa Liliana', 'Calle 43 # 43-33', 4.0980, -76.1920, 11500, 30, 5100, 5400, 'consolidado', 'coalicion', 35.0, 67.0, 33.0, 100.0),
('puesto-tul-14', 'I.E. Fátima (Comuna 5)', 'tulua', 'valle', 'Comuna 5 (Oriente / Fátima)', 'Fátima', 'Carrera 20 # 32-14', 4.0880, -76.1880, 8200, 22, 3300, 3500, 'normal', 'coalicion', 20.5, 61.2, 38.8, 95.0),

-- CORREGIMIENTOS Y ZONA RURAL
('puesto-tul-15', 'I.E. Aguaclara (Corregimiento Aguaclara)', 'tulua', 'valle', 'Corregimiento Aguaclara', 'Aguaclara Central', 'Calle principal Aguaclara', 4.0550, -76.1850, 14800, 38, 6100, 6400, 'estrategico', 'coalicion', 32.0, 58.0, 42.0, 100.0),
('puesto-tul-16', 'I.E. Nariño (Corregimiento Nariño)', 'tulua', 'valle', 'Corregimiento Nariño', 'Nariño', 'Frente al Parque Principal Nariño', 4.1120, -76.2150, 6200, 16, 2500, 2650, 'normal', 'coalicion', 18.0, 55.0, 45.0, 94.0),
('puesto-tul-17', 'I.E. La Marina (Cordillera Central)', 'tulua', 'valle', 'Corregimiento La Marina (Rural)', 'La Marina', 'Plaza de Bolívar La Marina', 4.0250, -76.0850, 4800, 13, 1900, 2050, 'critico', 'coalicion', 15.0, 53.0, 47.0, 85.0)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    zona = EXCLUDED.zona,
    comuna_barrio = EXCLUDED.comuna_barrio,
    direccion = EXCLUDED.direccion,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    censo_electoral = EXCLUDED.censo_electoral,
    mesas_habilitadas = EXCLUDED.mesas_habilitadas,
    meta_votos_campana = EXCLUDED.meta_votos_campana,
    votos_proyectados = EXCLUDED.votos_proyectados,
    estado_prioridad = EXCLUDED.estado_prioridad;

-- ==============================================================================
-- 15. HISTÓRICO ELECTORAL DE TULUÁ (ÚLTIMAS 3 ELECCIONES)
-- ==============================================================================
INSERT INTO public.historico_electoral (puesto_id, ano, eleccion, participacion_pct, votos_coalicion, votos_alianza, votos_unidad, votos_otros, votos_blanco, votos_nulos)
VALUES
('puesto-tul-01', 2018, 'Presidencial 2018', 61.0, 4200, 3800, 1400, 450, 320, 80),
('puesto-tul-01', 2022, 'Presidencial 2022', 65.5, 6100, 3400, 920, 280, 190, 70),
('puesto-tul-01', 2026, 'Alcaldía / Concejo 2026 (Proy)', 66.8, 7150, 3100, 650, 190, 140, 50),
('puesto-tul-02', 2022, 'Presidencial 2022', 67.2, 5100, 2900, 810, 190, 130, 40),
('puesto-tul-02', 2026, 'Alcaldía / Concejo 2026 (Proy)', 68.0, 5650, 2750, 580, 140, 90, 30),
('puesto-tul-08', 2022, 'Presidencial 2022', 66.2, 5800, 2800, 720, 160, 95, 25),
('puesto-tul-08', 2026, 'Alcaldía / Concejo 2026 (Proy)', 67.5, 6500, 2500, 510, 110, 70, 20),
('puesto-tul-15', 2022, 'Presidencial 2022', 59.2, 5600, 1900, 480, 110, 65, 20),
('puesto-tul-15', 2026, 'Alcaldía / Concejo 2026 (Proy)', 60.5, 6400, 1650, 350, 80, 45, 15);

-- ==============================================================================
-- 16. TESTIGOS ELECTORALES EN TULUÁ
-- ==============================================================================
INSERT INTO public.testigos_electorales (id, puesto_id, puesto_nombre, mesa_numero, nombre, cedula, telefono, rol, estado, hora_llegada)
VALUES
('testigo-tul-01', 'puesto-tul-01', 'I.E. Gimnasio del Pacífico', 1, 'Carlos Alberto Londoño Marín', '14.890.345', '+57 315 456 7890', 'coordinador_puesto', 'confirmado', '06:30 AM'),
('testigo-tul-02', 'puesto-tul-01', 'I.E. Gimnasio del Pacífico', 12, 'Luz Marina Echeverry Gómez', '38.990.123', '+57 318 789 0123', 'testigo_mesa', 'confirmado', '07:05 AM'),
('testigo-tul-03', 'puesto-tul-02', 'I.E. Julia Restrepo (Sede Principal)', 1, 'Diego Fernando Henao', '94.520.110', '+57 312 990 4455', 'coordinador_puesto', 'confirmado', '06:40 AM'),
('testigo-tul-04', 'puesto-tul-02', 'I.E. Julia Restrepo (Sede Principal)', 8, 'Adriana Patricia Cruz', '1.116.445.890', '+57 320 123 4567', 'testigo_mesa', 'pendiente', NULL),
('testigo-tul-05', 'puesto-tul-08', 'I.E. Técnico Industrial (ITI)', 3, 'Juan Guillermo Peláez', '14.789.012', '+57 311 334 5566', 'testigo_mesa', 'confirmado', '07:00 AM'),
('testigo-tul-06', 'puesto-tul-11', 'I.E. Rubén Cruz Vélez', 5, 'Sandra Milena Barreto', '66.908.432', '+57 317 889 1122', 'testigo_mesa', 'confirmado', '06:55 AM'),
('testigo-tul-07', 'puesto-tul-15', 'I.E. Aguaclara (Corregimiento Aguaclara)', 1, 'Héctor Fabio Quintero', '14.654.321', '+57 316 778 9900', 'coordinador_puesto', 'confirmado', '06:35 AM'),
('testigo-tul-08', 'puesto-tul-17', 'I.E. La Marina (Cordillera Central)', 2, 'Gloria Inés Morales', '29.890.123', '+57 314 556 7788', 'testigo_mesa', 'ausente', NULL)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 17. SIMPATIZANTES / CRM DE VOTANTES EN TULUÁ
-- ==============================================================================
INSERT INTO public.votantes_crm (id, puesto_id, nombre, cedula, telefono, direccion, barrio, intencion_voto, lider_asignado, contactado, necesita_transporte, ya_voto)
VALUES
('votante-tul-01', 'puesto-tul-01', 'Alba Lucía Domínguez', '29.345.890', '+57 315 223 4455', 'Cra 35 # 26-14', 'Céspedes', 'voto_duro', 'Carlos Londoño', true, false, true),
('votante-tul-02', 'puesto-tul-05', 'Jhon Jairo Restrepo', '14.990.123', '+57 318 445 6677', 'Calle 32 # 26-30', 'Victoria', 'voto_duro', 'Martha Peláez', true, false, true),
('votante-tul-03', 'puesto-tul-06', 'Beatriz Elena Orozco', '38.456.789', '+57 312 889 0011', 'Calle 28 # 42-10', 'Prados del Norte', 'voto_blando', 'Martha Peláez', true, true, false),
('votante-tul-04', 'puesto-tul-08', 'Andrés Felipe Caicedo', '1.116.789.234', '+57 300 990 1234', 'Cra 26 # 42-18', 'El Príncipe', 'voto_duro', 'Juan Guillermo Peláez', true, false, true),
('votante-tul-05', 'puesto-tul-11', 'Yurani Andrea Valencia', '1.115.890.432', '+57 317 665 4433', 'Calle 45 # 17-20', 'Rubén Cruz Vélez', 'voto_duro', 'Sandra Barreto', true, false, false),
('votante-tul-06', 'puesto-tul-15', 'Humberto Antonio Marmolejo', '14.543.210', '+57 316 443 2211', 'Calle 3 # 4-15', 'Aguaclara Central', 'voto_duro', 'Héctor Fabio Quintero', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 18. ACTAS E-14 Y ALERTAS DE FRAUDE DE MUESTRA EN TULUÁ
-- ==============================================================================
INSERT INTO public.actas_e14 (id, puesto_id, mesa_numero, hora_reporte, digitalizado_por, votos_coalicion, votos_alianza, votos_unidad, votos_otros, votos_blanco, votos_nulos, votos_no_marcados, total_votos_urna, estado_revision)
VALUES
('acta-tul-01', 'puesto-tul-01', 1, '16:45 PM', 'Carlos Londoño (Coord Gimnasio del Pacífico)', 168, 52, 14, 6, 4, 3, 1, 248, 'aprobada'),
('acta-tul-02', 'puesto-tul-01', 12, '17:15 PM', 'Luz Marina Echeverry (Testigo)', 92, 40, 8, 2, 2, 42, 0, 186, 'alerta_discrepancia'),
('acta-tul-03', 'puesto-tul-05', 1, '16:50 PM', 'Diego Henao (Julia Restrepo)', 182, 44, 11, 4, 3, 2, 1, 247, 'aprobada'),
('acta-tul-04', 'puesto-tul-15', 1, '17:00 PM', 'Héctor Fabio Quintero (Aguaclara)', 195, 35, 9, 2, 2, 1, 0, 244, 'aprobada')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.alertas_fraude (id, puesto_id, puesto_nombre, mesa_numero, severidad, tipo, descripcion, timestamp, resuelta)
VALUES
('alerta-tul-01', 'puesto-tul-01', 'I.E. Gimnasio del Pacífico', 12, 'alta', 'nulos_anormales', 'Pico anómalo de votos nulos (42 votos nulos = 22.5% de la mesa). Sospecha de doble marcación deliberada.', '17:16 PM', false),
('alerta-tul-02', 'puesto-tul-17', 'I.E. La Marina (Cordillera Central)', 2, 'media', 'testigo_ausente', 'Mesa rural en La Marina sin presencia de testigo acreditado durante conteo inicial de papeletas.', '16:05 PM', false)
ON CONFLICT (id) DO NOTHING;