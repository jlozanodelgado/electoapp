export interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

export interface CuadranteTactico {
  id: string;
  nombre: string;
  color: string;
  coordenadas: [number, number][]; // [lat, lng][]
  puestosCapturados: number;
  censoTotalCapturado: number;
}

export type TipoBasemap = 'dark' | 'satellite' | 'light';
