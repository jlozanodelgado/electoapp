# 🗳️ ElectoApp — VotoMap.com Clone & Intelligence OS

**ElectoApp** es una plataforma web completa de inteligencia electoral, analítica cartográfica (GIS) y gestión integral de campañas para los niveles **Nacional**, **Departamental/Estatal** y **Municipal/Local**. Inspirada en la estética y capacidades de **Votomap.com**, Palantir y Mapbox Studio.

---

## 🚀 Arquitectura Técnica

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Cartografía y GIS:** Leaflet con teselas tácticas oscuras de alta resolución (CartoDB Dark Matter), capas vectoriales coropléticas GeoJSON de departamentos y municipios, buffer de influencia espacial (*PostGIS ST_DWithin simulation*) y capa de calor (*Heatmap*).
- **Gráficos y Analítica:** Recharts para curvas históricas de 3 elecciones, distribución de fuerzas y asignación de curules.
- **Estado Global:** Zustand con soporte reactivo y sincronización automática.
- **Backend / Persistencia:** Servicio Mock completo compatible con Supabase (PostgreSQL + PostGIS) y persistencia en `localStorage`.
- **Motor de Exportación:** 1-Click download en **CSV**, **Excel (.xls estructurado)** y **GeoJSON**.

---

## 🗺️ Módulos Principales

### 1. Visor Cartográfico e Inteligencia Electoral (Core)
- **Mapa coroplético interactivo multi-métrica:** Alterna en vivo entre *Partido Ganador*, *% Participación*, *% Abstención*, *Margen de Victoria*, *Censo Electoral* y *Cobertura de Testigos*.
- **Puestos de votación georreferenciados:** Marcadores clusterizados con distintivos de estado prioritario (*Crítico*, *Estratégico*, *Consolidado*, *Normal*).
- **Drawer analítico contextual (35% de pantalla):** Al hacer clic en un puesto, despliega dirección, censo, histórico de votos de las últimas 3 elecciones (2018, 2022, 2026 proyectado), meta vs. proyección y testigos acreditados.
- **Buffer de Radio de Influencia:** Control deslizante de 1 a 10 km que simula una consulta PostGIS `ST_DWithin` para cuadrantes comunitarios.
- **Buscador Rápido:** Autocompletado instantáneo por puesto, barrio o comuna con zoom cinemático (*flyTo*).

### 2. Centro de Comando de Campaña (CRM Electoral y Metas)
- **Gestión de Testigos Electorales:** Monitoreo en tiempo real del % de mesas cubiertas. Padrón con estados (*Confirmado*, *Pendiente*, *Ausente*), llamadas y enlaces directos a WhatsApp.
- **Control de Votantes Identificados (CRM):** Semáforo de intención (*Voto Duro*, *Voto Blando*, *Indeciso*, *Opositor*), líder barrial responsable, requerimiento de transporte y marcado del voto en el Día D.

### 3. Día D (Escrutinio y Transmisión en Vivo)
- **Tablero en vivo de escrutinio:** Barra de progreso en tiempo real de mesas informadas con simulador de recepción de actas minuto a minuto.
- **Digitalización de Formato E-14:** Interfaz que replica el acta oficial de escrutinio, con desglose de votos por partido, votos en blanco, nulos y no marcados.
- **Motor Antifraude en Tiempo Real:** Detección inmediata de inconsistencias aritméticas (votos por candidato vs. total sufragantes en urna) y picos anormales de votos nulos (>12%).

### 4. Dashboard Ejecutivo y Exportación
- **KPIs Estratégicos:** Votación esperada, umbral legal estimado, cifra repartidora / cociente electoral y mesas aseguradas.
- **Modelación de Curules (Sistema D'Hondt):** Proyección del reparto de escaños en corporaciones públicas.
- **Centro de Exportación:** Descarga instantánea de puestos, testigos y CRM en `.csv`, `.xls` y `.geojson`.

---

## 🛠️ Instalación y Ejecución

En la carpeta del proyecto (`c:\Users\carme\Proyectos Antigravity\electoapp`):

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo en http://localhost:3000
npm run dev

# 3. Compilar para producción
npm run build
```
