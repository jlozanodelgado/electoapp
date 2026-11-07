import { FeatureCollection, Polygon } from 'geojson';

export const DEPARTAMENTOS_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'cundinamarca',
      properties: {
        id: 'cundinamarca',
        nombre: 'Cundinamarca / Bogotá D.C.',
        codigo: '25',
        partidoDominante: 'coalicion',
        participacionPct: 62.4,
        abstencionismoPct: 37.6,
        margenVictoriaPct: 18.4,
        censo: 8450000,
        color: '#10b981',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.90, 5.80],
            [-74.20, 5.75],
            [-73.50, 5.30],
            [-73.40, 4.80],
            [-73.70, 4.20],
            [-74.10, 3.80],
            [-74.60, 4.10],
            [-74.80, 4.50],
            [-74.90, 5.80]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'antioquia',
      properties: {
        id: 'antioquia',
        nombre: 'Antioquia',
        codigo: '05',
        partidoDominante: 'alianza',
        participacionPct: 58.7,
        abstencionismoPct: 41.3,
        margenVictoriaPct: 15.2,
        censo: 5120000,
        color: '#3b82f6',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.80, 8.80],
            [-76.30, 8.50],
            [-75.20, 8.00],
            [-74.60, 7.50],
            [-74.40, 6.80],
            [-74.60, 5.90],
            [-75.60, 5.50],
            [-76.20, 5.70],
            [-76.60, 6.80],
            [-76.80, 8.80]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'valle',
      properties: {
        id: 'valle',
        nombre: 'Valle del Cauca',
        codigo: '76',
        partidoDominante: 'coalicion',
        participacionPct: 56.1,
        abstencionismoPct: 43.9,
        margenVictoriaPct: 22.0,
        censo: 3780000,
        color: '#10b981',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-77.50, 4.90],
            [-76.20, 4.80],
            [-75.80, 4.40],
            [-76.00, 3.20],
            [-76.60, 3.10],
            [-77.30, 3.40],
            [-77.60, 4.10],
            [-77.50, 4.90]
          ]
        ]
      }
    }
  ]
};

export const MUNICIPIOS_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'bogota',
      properties: {
        id: 'bogota',
        departamentoId: 'cundinamarca',
        nombre: 'Bogotá D.C.',
        codigo: '11001',
        partidoDominante: 'coalicion',
        participacionPct: 63.8,
        abstencionismoPct: 36.2,
        margenVictoriaPct: 20.5,
        censo: 6150000,
        color: '#10b981',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.15, 4.82],
            [-74.01, 4.80],
            [-73.98, 4.65],
            [-74.05, 4.50],
            [-74.20, 4.45],
            [-74.24, 4.65],
            [-74.15, 4.82]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'soacha',
      properties: {
        id: 'soacha',
        departamentoId: 'cundinamarca',
        nombre: 'Soacha',
        codigo: '25754',
        partidoDominante: 'coalicion',
        participacionPct: 54.2,
        abstencionismoPct: 45.8,
        margenVictoriaPct: 26.2,
        censo: 580000,
        color: '#10b981',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.28, 4.62],
            [-74.20, 4.62],
            [-74.18, 4.54],
            [-74.26, 4.52],
            [-74.32, 4.58],
            [-74.28, 4.62]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'medellin',
      properties: {
        id: 'medellin',
        departamentoId: 'antioquia',
        nombre: 'Medellín',
        codigo: '05001',
        partidoDominante: 'alianza',
        participacionPct: 60.5,
        abstencionismoPct: 39.5,
        margenVictoriaPct: 16.4,
        censo: 1890000,
        color: '#3b82f6',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-75.63, 6.33],
            [-75.52, 6.32],
            [-75.53, 6.18],
            [-75.62, 6.17],
            [-75.68, 6.25],
            [-75.63, 6.33]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'bello',
      properties: {
        id: 'bello',
        departamentoId: 'antioquia',
        nombre: 'Bello',
        codigo: '05088',
        partidoDominante: 'unidad',
        participacionPct: 53.6,
        abstencionismoPct: 46.4,
        margenVictoriaPct: 11.2,
        censo: 420000,
        color: '#ef4444',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-75.62, 6.38],
            [-75.51, 6.38],
            [-75.52, 6.32],
            [-75.63, 6.33],
            [-75.62, 6.38]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'cali',
      properties: {
        id: 'cali',
        departamentoId: 'valle',
        nombre: 'Santiago de Cali',
        codigo: '76001',
        partidoDominante: 'coalicion',
        participacionPct: 57.9,
        abstencionismoPct: 42.1,
        margenVictoriaPct: 24.8,
        censo: 1950000,
        color: '#10b981',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-76.58, 3.51],
            [-76.47, 3.50],
            [-76.46, 3.33],
            [-76.56, 3.32],
            [-76.60, 3.42],
            [-76.58, 3.51]
          ]
        ]
      }
    }
  ]
};

