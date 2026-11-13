export const GEO_ENGINE_BASE_URL =
  process.env.NEXT_PUBLIC_GEO_ENGINE_API_URL ?? 'http://127.0.0.1:8080';

export type PresetPolygonKey = 'CLEAN_COMALCALCO' | 'SELF_INTERSECTING_BOWTIE';

export const PRESET_POLYGONS: Record<
  PresetPolygonKey,
  { label: string; description: string; coordinates: number[][] }
> = {
  SELF_INTERSECTING_BOWTIE: {
    label: '⚠️ Polígono con Líneas Cruzadas (Figura en 8 / Anillo Abierto)',
    description:
      'Simula un error común en campo: el técnico cruzó su propio camino formando un moño y olvidó cerrar el vértice final.',
    coordinates: [
      [-93.23, 18.26],
      [-93.22, 18.27],
      [-93.22, 18.26],
      [-93.23, 18.27],
    ],
  },
  CLEAN_COMALCALCO: {
    label: '✅ Polígono Regular (Finca Comalcalco > 4 ha)',
    description: 'Perímetro cuadrangular capturado en Comalcalco sin auto-intersecciones.',
    coordinates: [
      [-93.225, 18.265],
      [-93.221, 18.265],
      [-93.221, 18.269],
      [-93.225, 18.269],
    ],
  },
};

export interface TopologyValidationResponse {
  parcel_id: string;
  polygon: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  area_hectares: number;
  vertex_count: number;
  byte_size: number;
  was_ring_auto_closed: boolean;
  duplicate_vertices_removed: number;
  was_self_intersection_repaired: boolean;
  is_topology_valid: boolean;
  requires_mandatory_polygon_eudr: boolean;
}

/**
 * Convierte una lista de coordenadas WGS84 [lng, lat] en una cadena de puntos SVG "x,y ..."
 * escalada dentro de un lienzo (width x height) con margen de padding.
 */
export function projectCoordinatesToSvgPoints(
  coordinates: number[][],
  width = 320,
  height = 200,
  padding = 24,
): string {
  if (!coordinates || coordinates.length === 0) {
    return '';
  }

  const lngs = coordinates.map((c) => c[0]);
  const lats = coordinates.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const lngSpan = maxLng - minLng || 0.001;
  const latSpan = maxLat - minLat || 0.001;

  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  return coordinates
    .map(([lng, lat]) => {
      const x = Number((padding + ((lng - minLng) / lngSpan) * usableW).toFixed(1));
      const y = Number((height - padding - ((lat - minLat) / latSpan) * usableH).toFixed(1));
      return `${x},${y}`;
    })
    .join(' ');
}

export async function validateTopologyLive(
  parcelId: string,
  coordinates: number[][],
): Promise<TopologyValidationResponse> {
  const res = await fetch(`${GEO_ENGINE_BASE_URL}/api/v1/topology/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parcel_id: parcelId, coordinates }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail ?? `Error HTTP ${res.status} en Geo-Engine`);
  }

  return res.json();
}

export async function requestTracesNtExportLive(params: {
  parcelId: string;
  producerId: string;
  municipality: string;
  coordinates: number[][];
  eudrStatus: string;
  acahualRemovalPost2020: boolean;
  hasVerifiedCustfPermit: boolean;
  deliveredDryEquivalentKg: number;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${GEO_ENGINE_BASE_URL}/api/v1/exports/traces-nt-package`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parcel_id: params.parcelId,
      producer_id: params.producerId,
      municipality: params.municipality,
      coordinates: params.coordinates,
      eudr_status: params.eudrStatus,
      acahual_removal_post_2020: params.acahualRemovalPost2020,
      has_verified_custf_permit: params.hasVerifiedCustfPermit,
      delivered_dry_equivalent_kg: params.deliveredDryEquivalentKg,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail ?? `Error HTTP ${res.status} al exportar TRACES NT`);
  }

  return res.json();
}
