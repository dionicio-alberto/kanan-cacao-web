import {
  EudrStatus,
  NdviAlertLevel,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';

export const GEO_ENGINE_BASE_URL =
  process.env.NEXT_PUBLIC_GEO_ENGINE_API_URL ?? 'http://127.0.0.1:8080';

export type PresetPolygonKey = 'CLEAN_COMALCALCO' | 'SELF_INTERSECTING_BOWTIE';

export const PRESET_POLYGONS: Record<
  PresetPolygonKey,
  { label: string; description: string; coordinates: number[][] }
> = {
  SELF_INTERSECTING_BOWTIE: {
    label: 'Polígono con líneas cruzadas (figura en 8 y anillo abierto)',
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
    label: 'Polígono regular (finca Comalcalco mayor a 4 ha)',
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

interface RawPersistedParcel {
  parcel_id: string;
  producer_id: string;
  producer_name: string;
  municipality: string;
  area_hectares: number;
  eudr_status: EudrStatus;
  ndvi_alert_level: NdviAlertLevel;
  mean_ndvi: number;
  shade_tree_count: number;
  acahual_removal_post_2020: boolean;
  has_verified_custf_permit: boolean;
}

function mapRawParcelToOverview(raw: RawPersistedParcel): ParcelAdminOverview {
  return {
    parcelId: raw.parcel_id,
    producerId: raw.producer_id,
    producerName: raw.producer_name,
    municipality: raw.municipality,
    areaHectares: Number(raw.area_hectares),
    eudrStatus: raw.eudr_status,
    ndviAlertLevel: raw.ndvi_alert_level,
    meanNdvi: Number(raw.mean_ndvi),
    shadeTreeCount: Number(raw.shade_tree_count),
    acahualRemovalPost2020: Boolean(raw.acahual_removal_post_2020),
    hasVerifiedCustfPermit: Boolean(raw.has_verified_custf_permit),
  };
}

export async function fetchPersistedParcelsLive(): Promise<ParcelAdminOverview[]> {
  const res = await fetch(`${GEO_ENGINE_BASE_URL}/api/v1/parcels`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status} al consultar base SQLite local`);
  }
  const data = (await res.json()) as { parcels: RawPersistedParcel[] };
  return (data.parcels ?? []).map(mapRawParcelToOverview);
}

export async function toggleParcelCustfLive(parcelId: string): Promise<ParcelAdminOverview> {
  const res = await fetch(
    `${GEO_ENGINE_BASE_URL}/api/v1/parcels/${encodeURIComponent(parcelId)}/custf`,
    {
      method: 'PATCH',
      headers: { Accept: 'application/json' },
    },
  );
  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status} al actualizar CUSTF en SQLite`);
  }
  const data = (await res.json()) as { parcel: RawPersistedParcel };
  return mapRawParcelToOverview(data.parcel);
}

export async function syncFieldParcelToSqliteLive(params: {
  parcelId: string;
  producerName: string;
  municipality: string;
  areaHectares: number;
  shadeTreeCount: number;
}): Promise<ParcelAdminOverview[]> {
  const res = await fetch(`${GEO_ENGINE_BASE_URL}/api/v1/parcels/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      last_pulled_at_ms: null,
      pushed_parcels: [
        {
          parcel_id: params.parcelId,
          producer_id: `PROD-${params.parcelId}`,
          producer_name: params.producerName,
          municipality: params.municipality,
          area_hectares: params.areaHectares,
          eudr_status: 'VERDE',
          ndvi_alert_level: 'VIGOR_AGROFORESTAL_OPTIMO',
          mean_ndvi: 0.81,
          shade_tree_count: params.shadeTreeCount,
          acahual_removal_post_2020: false,
          has_verified_custf_permit: false,
          coordinates: [
            [-93.39, 17.85],
            [-93.386, 17.85],
            [-93.386, 17.8465],
            [-93.39, 17.8465],
          ],
          updated_at_ms: Date.now(),
        },
      ],
    }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail ?? `Error HTTP ${res.status} al sincronizar parcela`);
  }
  const data = (await res.json()) as { remote_changed_parcels: RawPersistedParcel[] };
  return (data.remote_changed_parcels ?? []).map(mapRawParcelToOverview);
}
