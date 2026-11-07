import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useElectoralStore } from '../../store/electoralStore';
import { DEPARTAMENTOS_GEOJSON, MUNICIPIOS_GEOJSON } from '../../data/geojsonBoundaries';
import { DEPARTAMENTOS, MUNICIPIOS } from '../../data/mockElectoralData';
import { supabaseMock } from '../../services/supabaseMock';

export const ElectoralMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const bufferCircleRef = useRef<L.Circle | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);

  const {
    nivelTerritorial,
    departamentoId,
    municipioId,
    zona,
    capaMetrica,
    selectedPuestoId,
    setSelectedPuestoId,
    puestos,
    mostrarHeatmap,
    radioInfluenciaKm,
    setDepartamentoId,
    setMunicipioId
  } = useElectoralStore();

  // 1. Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centro inicial: Colombia
    const map = L.map(mapContainerRef.current, {
      center: [4.5709, -74.2973],
      zoom: 6,
      zoomControl: false,
      attributionControl: false,
    });

    // Añadir controles de zoom en la esquina inferior derecha
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Basemap CartoDB Dark Matter (tema oscuro táctico GovTech)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: 'abc',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Capa de marcadores
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    // Capa de calor / heatmap
    const heatmapGroup = L.layerGroup().addTo(map);
    heatmapLayerRef.current = heatmapGroup;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Controlar Zoom / FlyTo según nivel territorial y selección
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedPuestoId) {
      const puesto = puestos.find(p => p.id === selectedPuestoId);
      if (puesto) {
        map.flyTo([puesto.lat, puesto.lng], 15, { duration: 1.2 });
        return;
      }
    }

    if (municipioId !== 'todos') {
      const mun = MUNICIPIOS.find(m => m.id === municipioId);
      if (mun) {
        map.flyTo(mun.coordenadas, mun.zoom, { duration: 1.2 });
        return;
      }
    }

    if (departamentoId !== 'todos') {
      const dep = DEPARTAMENTOS.find(d => d.id === departamentoId);
      if (dep) {
        map.flyTo(dep.coordenadas, dep.zoom, { duration: 1.2 });
        return;
      }
    }

    // Nivel nacional
    map.flyTo([4.8, -74.5], 6.5, { duration: 1.2 });
  }, [departamentoId, municipioId, selectedPuestoId]);

  // 3. Renderizar Capa Coroplética GeoJSON
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remover capa previa
    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }

    const isNacional = departamentoId === 'todos';
    const sourceGeojson = isNacional ? DEPARTAMENTOS_GEOJSON : MUNICIPIOS_GEOJSON;

    const getFeatureColor = (props: any) => {
      if (capaMetrica === 'partido_dominante') {
        if (props.partidoDominante === 'coalicion') return '#10b981';
        if (props.partidoDominante === 'alianza') return '#3b82f6';
        if (props.partidoDominante === 'unidad') return '#ef4444';
        return '#f59e0b';
      }
      if (capaMetrica === 'participacion') {
        return props.participacionPct > 60 ? '#10b981' : props.participacionPct > 55 ? '#3b82f6' : '#f59e0b';
      }
      if (capaMetrica === 'abstencionismo') {
        return props.abstencionismoPct > 40 ? '#ef4444' : props.abstencionismoPct > 35 ? '#f59e0b' : '#10b981';
      }
      return '#3b82f6';
    };

    const layer = L.geoJSON(sourceGeojson as any, {
      style: (feature) => {
        const props = feature?.properties || {};
        return {
          fillColor: getFeatureColor(props),
          fillOpacity: 0.18,
          color: getFeatureColor(props),
          weight: 2,
          opacity: 0.8,
          dashArray: '3',
        };
      },
      onEachFeature: (feature, l) => {
        const props = feature.properties;
        l.bindTooltip(`
          <div class="px-2 py-1 text-xs font-sans">
            <strong class="text-white block text-sm">${props.nombre}</strong>
            <span class="text-emerald-400 font-mono font-semibold">Participación: ${props.participacionPct}%</span><br/>
            <span class="text-slate-300">Censo: ${props.censo?.toLocaleString()}</span>
          </div>
        `, {
          className: 'bg-slate-900 border border-slate-700 text-slate-100 rounded-lg shadow-xl',
          sticky: true,
        });

        l.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({
              fillOpacity: 0.35,
              weight: 3,
              color: '#38bdf8',
            });
          },
          mouseout: (e) => {
            layer.resetStyle(e.target);
          },
          click: () => {
            if (isNacional) {
              setDepartamentoId(props.id);
            } else {
              setMunicipioId(props.id);
            }
          }
        });
      }
    });

    layer.addTo(map);
    geojsonLayerRef.current = layer;
  }, [departamentoId, municipioId, capaMetrica]);

  // 4. Renderizar Puestos de Votación (Marcadores SVG Clusterizados)
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    // Filtrar puestos según selector territorial
    let puestosFiltrados = puestos;
    if (departamentoId !== 'todos') {
      puestosFiltrados = puestosFiltrados.filter(p => p.departamentoId === departamentoId);
    }
    if (municipioId !== 'todos') {
      puestosFiltrados = puestosFiltrados.filter(p => p.municipioId === municipioId);
    }
    if (zona !== 'todas') {
      puestosFiltrados = puestosFiltrados.filter(p => p.zona === zona);
    }

    puestosFiltrados.forEach(puesto => {
      const isSelected = selectedPuestoId === puesto.id;

      // Color según métrica o partido
      let markerColor = '#10b981';
      if (puesto.partidoDominante === 'alianza') markerColor = '#3b82f6';
      if (puesto.partidoDominante === 'unidad') markerColor = '#ef4444';

      if (capaMetrica === 'cobertura_testigos') {
        markerColor = puesto.coberturaTestigosPct >= 95 ? '#10b981' : puesto.coberturaTestigosPct >= 80 ? '#f59e0b' : '#ef4444';
      } else if (capaMetrica === 'abstencionismo') {
        markerColor = puesto.abstencionismoPct > 40 ? '#ef4444' : puesto.abstencionismoPct > 35 ? '#f59e0b' : '#10b981';
      }

      const iconHtml = `
        <div class="relative group cursor-pointer">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-125 ${
            isSelected ? 'scale-125 ring-4 ring-white animate-pulse' : ''
          }" style="background-color: ${markerColor}; border: 2px solid #0f172a;">
            <span class="text-[10px] font-extrabold text-slate-950 font-mono">${puesto.mesasHabilitadas}</span>
          </div>
          ${puesto.estadoPrioridad === 'critico' ? `
            <div class="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border border-slate-950 ring-2 ring-rose-400 animate-ping"></div>
          ` : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-electoral-marker',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([puesto.lat, puesto.lng], { icon: customIcon });

      marker.bindTooltip(`
        <div class="p-2 text-xs font-sans max-w-[200px]">
          <strong class="text-white block text-sm font-bold truncate">${puesto.nombre}</strong>
          <span class="text-slate-400">${puesto.comunaBarrio} (${puesto.zona})</span>
          <div class="mt-1 pt-1 border-t border-slate-700 flex justify-between text-[11px]">
            <span class="text-slate-400">Censo: <b class="text-white">${puesto.censoElectoral.toLocaleString()}</b></span>
            <span class="text-blue-400">Testigos: <b>${puesto.coberturaTestigosPct}%</b></span>
          </div>
        </div>
      `, {
        className: 'bg-slate-900 border border-slate-700 text-slate-100 rounded-lg shadow-2xl',
        direction: 'top',
        offset: [0, -16]
      });

      marker.on('click', () => {
        setSelectedPuestoId(puesto.id);
      });

      marker.addTo(markersGroup);
    });
  }, [puestos, departamentoId, municipioId, zona, capaMetrica, selectedPuestoId]);

  // 5. Buffer de Radio de Influencia (Simulación PostGIS ST_DWithin)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (bufferCircleRef.current) {
      map.removeLayer(bufferCircleRef.current);
      bufferCircleRef.current = null;
    }

    if (radioInfluenciaKm && radioInfluenciaKm > 0) {
      // Usar centro del puesto seleccionado o centro actual del mapa
      const puesto = puestos.find(p => p.id === selectedPuestoId);
      const center = puesto ? [puesto.lat, puesto.lng] : [map.getCenter().lat, map.getCenter().lng];

      const circle = L.circle(center as [number, number], {
        radius: radioInfluenciaKm * 1000,
        color: '#38bdf8',
        weight: 2,
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        dashArray: '5, 5',
      }).addTo(map);

      bufferCircleRef.current = circle;
    }
  }, [radioInfluenciaKm, selectedPuestoId]);

  // 6. Capa de Calor (Heatmap density)
  useEffect(() => {
    const heatmapGroup = heatmapLayerRef.current;
    if (!heatmapGroup) return;

    heatmapGroup.clearLayers();

    if (mostrarHeatmap) {
      puestos.forEach(p => {
        const radius = Math.min(2500, Math.max(800, p.censoElectoral / 15));
        const circle = L.circle([p.lat, p.lng], {
          radius: radius,
          stroke: false,
          fillColor: '#f59e0b',
          fillOpacity: 0.35,
        });
        circle.addTo(heatmapGroup);
      });
    }
  }, [mostrarHeatmap, puestos]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950" style={{ minHeight: '400px' }}>
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      
      {/* Leyenda de Mapa Táctica */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 select-none pointer-events-auto">
        <span className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
          Partidos / Tendencia
        </span>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-slate-950" />
          <span className="text-slate-300">Coalición Por el Cambio</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 border border-slate-950" />
          <span className="text-slate-300">Alianza Democrática</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 border border-slate-950" />
          <span className="text-slate-300">Unidad Republicana</span>
        </div>
      </div>
    </div>
  );
};

