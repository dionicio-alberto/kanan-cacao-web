import {
  EudrStatus,
  HistoricalParcelSnapshot,
  NdviAlertLevel,
  ParcelAdminOverview,
  ParcelLegalDocument,
} from '@/services/sustainabilityAdminService';

const rawGeoEngineUrl =
  process.env.NEXT_PUBLIC_GEO_ENGINE_API_URL ||
  process.env.NEXT_PUBLIC_GEO_ENGINE_URL ||
  'https://kanan-cacao-geo-engine-production.up.railway.app';

export const GEO_ENGINE_BASE_URL = rawGeoEngineUrl.replace(/\/+$/, '');

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
  parcel_name?: string;
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
  coordinates?: number[][];
  extent_bbox?: [number, number, number, number];
  registered_at_iso?: string;
  documents?: ParcelLegalDocument[];
  historical_snapshots?: HistoricalParcelSnapshot[];
}

export interface PersistedParcelsWithMeta {
  storageEngine: string;
  parcels: ParcelAdminOverview[];
}

export interface LiveSentinel2SceneResponse {
  parcel_id: string;
  source_mode: 'live_stac' | 'fallback_cache';
  collection: string;
  latest_scene_id: string;
  captured_at_iso: string;
  cloud_cover_pct: number;
  platform: string;
  mgrs_tile: string;
  sentinel_preview_url: string | null;
  stac_item_url: string | null;
  satellite_ortho_url: string;
  bbox: [number, number, number, number];
  area_hectares: number;
}

export type GeoBboxTuple = [number, number, number, number];

export function computePaddedGeoBbox(
  coordinates: number[][],
  padFactor = 0.45,
  minPadDeg = 0.0025,
): GeoBboxTuple {
  if (!coordinates || coordinates.length === 0) {
    return [-93.29, 18.248, -93.276, 18.258];
  }
  const lngs = coordinates.map((pt) => pt[0]);
  const lats = coordinates.map((pt) => pt[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLng = Math.max(maxLng - minLng, 0.001);
  const spanLat = Math.max(maxLat - minLat, 0.001);
  const padLng = Math.max(spanLng * padFactor, minPadDeg);
  const padLat = Math.max(spanLat * padFactor, minPadDeg);
  return [
    Number((minLng - padLng).toFixed(6)),
    Number((minLat - padLat).toFixed(6)),
    Number((maxLng + padLng).toFixed(6)),
    Number((maxLat + padLat).toFixed(6)),
  ];
}

export function fitBboxToAspectRatio(bbox: GeoBboxTuple, targetAspectRatio: number): GeoBboxTuple {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const spanLng = Math.max(maxLng - minLng, 1e-6);
  const spanLat = Math.max(maxLat - minLat, 1e-6);
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const currentAspect = spanLng / spanLat;

  if (currentAspect < targetAspectRatio) {
    const halfLng = (spanLat * targetAspectRatio) / 2;
    return [
      Number((centerLng - halfLng).toFixed(6)),
      minLat,
      Number((centerLng + halfLng).toFixed(6)),
      maxLat,
    ];
  }

  const halfLat = spanLng / targetAspectRatio / 2;
  return [
    minLng,
    Number((centerLat - halfLat).toFixed(6)),
    maxLng,
    Number((centerLat + halfLat).toFixed(6)),
  ];
}

export function buildSatelliteOrthoExportUrl(
  coordinates: number[][],
  imgWidth = 840,
  imgHeight = 480,
): { orthoUrl: string; extentBbox: GeoBboxTuple } {
  const rawBbox = computePaddedGeoBbox(coordinates);
  const extentBbox = fitBboxToAspectRatio(rawBbox, imgWidth / imgHeight);
  const [minLng, minLat, maxLng, maxLat] = extentBbox;
  const orthoUrl =
    'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export' +
    `?bbox=${minLng},${minLat},${maxLng},${maxLat}` +
    `&bboxSR=4326&imageSR=4326&size=${imgWidth},${imgHeight}&format=jpg&f=image`;
  return { orthoUrl, extentBbox };
}

export function projectCoordinatesToOrthoSvgPoints(
  coordinates: number[][],
  extentBbox: GeoBboxTuple,
  width = 420,
  height = 240,
): Array<{ x: number; y: number }> {
  if (!coordinates || coordinates.length === 0) return [];
  const [minLng, minLat, maxLng, maxLat] = extentBbox;
  const spanLng = Math.max(maxLng - minLng, 1e-9);
  const spanLat = Math.max(maxLat - minLat, 1e-9);

  return coordinates.map(([lng, lat]) => ({
    x: Number((((lng - minLng) / spanLng) * width).toFixed(2)),
    y: Number((((maxLat - lat) / spanLat) * height).toFixed(2)),
  }));
}

export async function fetchPersistedParcelsWithMeta(): Promise<PersistedParcelsWithMeta> {
  const res = await fetch(`${GEO_ENGINE_BASE_URL}/api/v1/parcels`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`No se pudieron leer parcelas desde el geo-engine: HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    storage_engine?: string;
    parcels?: RawPersistedParcel[];
  };
  const parcels = (data.parcels ?? []).map((raw) => ({
    ...mapRawParcelToOverview(raw),
    parcelName: raw.parcel_name,
    coordinates: raw.coordinates,
    extentBbox: raw.extent_bbox,
    registeredAtIso: raw.registered_at_iso,
    documents: raw.documents,
    historicalSnapshots: raw.historical_snapshots,
  }));
  return {
    storageEngine: data.storage_engine || 'sqlite3_local',
    parcels,
  };
}

const HISTORICAL_FALLBACK_SPECS: Array<{
  period_key: string;
  label: string;
  months_ago: number;
  wayback_release: string;
  ref_date: string;
}> = [
  {
    period_key: 'registro_actual',
    label: 'Última foto al registro (02/11/2026)',
    months_ago: 0,
    wayback_release: 'mpc:S2A_MSIL2A_20261102T164701_R126_T15QVA_20261102T231820',
    ref_date: '2026-11-02',
  },
  {
    period_key: 'hace_6_meses',
    label: 'Hace 6 meses (06/05/2026)',
    months_ago: 6,
    wayback_release: 'mpc:S2A_MSIL2A_20260506T164701_R126_T15QVV_20260507T045223',
    ref_date: '2026-05-06',
  },
  {
    period_key: 'hace_1_anio',
    label: 'Hace 1 año (20/11/2025)',
    months_ago: 12,
    wayback_release: 'mpc:S2B_MSIL2A_20251120T164509_R126_T15QVA_20251120T201427',
    ref_date: '2025-11-20',
  },
  {
    period_key: 'hace_2_anios',
    label: 'Hace 2 años (25/11/2024)',
    months_ago: 24,
    wayback_release: 'mpc:S2B_MSIL2A_20241125T164539_R126_T15QVV_20241125T203601',
    ref_date: '2024-11-25',
  },
  {
    period_key: 'hace_3_anios',
    label: 'Hace 3 años (12/10/2023)',
    months_ago: 36,
    wayback_release: 'mpc:S2B_MSIL2A_20231012T164139_R126_T15QVA_20240925T214521',
    ref_date: '2023-10-12',
  },
  {
    period_key: 'hace_4_anios',
    label: 'Hace 4 años (11/11/2022)',
    months_ago: 48,
    wayback_release: 'mpc:S2A_MSIL2A_20221111T164531_R126_T15QVA_20221112T061156',
    ref_date: '2022-11-11',
  },
  {
    period_key: 'hace_5_anios',
    label: 'Hace 5 años (11/12/2021)',
    months_ago: 60,
    wayback_release: 'mpc:S2B_MSIL2A_20211211T164659_R126_T15QVV_20211212T133414',
    ref_date: '2021-12-11',
  },
];

function latLngToWorldPx(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);
  const clampedLat = Math.max(-85.051128, Math.min(85.051128, lat));
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function latLngToWebMercatorTile(
  lat: number,
  lng: number,
  zoom = 16,
): { row: number; col: number } {
  const n = Math.pow(2, zoom);
  const col = Math.floor(((lng + 180) / 360) * n);
  const latRad = (Math.max(-85.051128, Math.min(85.051128, lat)) * Math.PI) / 180;
  const row = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  return { row, col };
}

export function computeCenteredWaybackViewport(
  coordinates: number[][],
  viewW = 760,
  viewH = 420,
): { centerLat: number; centerLng: number; zoom: number } {
  if (!coordinates || coordinates.length === 0) {
    return { centerLat: 18.2545, centerLng: -93.2825, zoom: 16 };
  }
  const lngs = coordinates.map((pt) => pt[0]);
  const lats = coordinates.map((pt) => pt[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  for (let z = 17; z >= 14; z -= 1) {
    const tl = latLngToWorldPx(maxLat, minLng, z);
    const br = latLngToWorldPx(minLat, maxLng, z);
    if (Math.abs(br.x - tl.x) <= viewW * 0.52 && Math.abs(br.y - tl.y) <= viewH * 0.52) {
      return { centerLat, centerLng, zoom: z };
    }
  }
  return { centerLat, centerLng, zoom: 14 };
}

export function computeWaybackTileLayout(
  coordinates: number[][],
  waybackRelease: string,
  viewW = 760,
  viewH = 420,
): Array<{
  key: string;
  url: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}> {
  const tileSize = 256;
  const { centerLat, centerLng, zoom } = computeCenteredWaybackViewport(coordinates, viewW, viewH);
  const centerWorld = latLngToWorldPx(centerLat, centerLng, zoom);
  const topLeftX = centerWorld.x - viewW / 2;
  const topLeftY = centerWorld.y - viewH / 2;
  const maxTile = Math.pow(2, zoom) - 1;

  const minTx = Math.max(0, Math.floor(topLeftX / tileSize));
  const maxTx = Math.min(maxTile, Math.floor((topLeftX + viewW) / tileSize));
  const minTy = Math.max(0, Math.floor(topLeftY / tileSize));
  const maxTy = Math.min(maxTile, Math.floor((topLeftY + viewH) / tileSize));

  const tiles: Array<{
    key: string;
    url: string;
    leftPct: number;
    topPct: number;
    widthPct: number;
    heightPct: number;
  }> = [];

  for (let tx = minTx; tx <= maxTx; tx += 1) {
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      const tileUrl = waybackRelease.startsWith('mpc:')
        ? `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/${zoom}/${tx}/${ty}.png?collection=sentinel-2-l2a&item=${encodeURIComponent(waybackRelease.slice(4))}&assets=visual&asset_bidx=visual%7C1,2,3`
        : waybackRelease.startsWith('s2cloudless-')
          ? `https://tiles.maps.eox.at/wmts/1.0.0/${waybackRelease}/default/g/${zoom}/${ty}/${tx}.jpg`
          : `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${waybackRelease}/${zoom}/${ty}/${tx}`;
      tiles.push({
        key: `${waybackRelease}-${zoom}-${tx}-${ty}`,
        url: tileUrl,
        leftPct: ((tx * tileSize - topLeftX) / viewW) * 100,
        topPct: ((ty * tileSize - topLeftY) / viewH) * 100,
        widthPct: (tileSize / viewW) * 100,
        heightPct: (tileSize / viewH) * 100,
      });
    }
  }
  return tiles;
}

export async function preloadParcelHistoricalTiles(
  coordinates: number[][],
  snapshots: HistoricalParcelSnapshot[],
  onProgress?: (doneCount: number, totalCount: number) => void,
): Promise<void> {
  if (typeof window === 'undefined' || !snapshots || snapshots.length === 0) {
    return;
  }

  const total = snapshots.length;
  let completed = 0;

  const preloadSingleSnapshot = (snap: HistoricalParcelSnapshot) => {
    const urls = snap.cached_image_url
      ? [snap.cached_image_url]
      : computeWaybackTileLayout(coordinates, snap.wayback_release || '43291', 760, 420).map(
          (t) => t.url,
        );
    return Promise.all(
      urls.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new window.Image();
            const timer = window.setTimeout(() => resolve(), 4000);
            img.onload = () => {
              window.clearTimeout(timer);
              resolve();
            };
            img.onerror = () => {
              window.clearTimeout(timer);
              resolve();
            };
            img.src = src;
          }),
      ),
    ).then(() => {
      completed += 1;
      if (onProgress) {
        onProgress(completed, total);
      }
    });
  };

  await Promise.all(snapshots.map(preloadSingleSnapshot));
}

export function buildHistoricalSnapshotsFallback(
  parcelId: string,
  coordinates: number[][],
): HistoricalParcelSnapshot[] {
  const { extentBbox } = buildSatelliteOrthoExportUrl(coordinates, 840, 480);
  const centerLng = (extentBbox[0] + extentBbox[2]) / 2;
  const centerLat = (extentBbox[1] + extentBbox[3]) / 2;
  const { row, col } = latLngToWebMercatorTile(centerLat, centerLng, 16);

  return HISTORICAL_FALLBACK_SPECS.map((spec) => ({
    period_key: spec.period_key,
    label: spec.label,
    months_ago: spec.months_ago,
    wayback_release: spec.wayback_release,
    capture_source: 'real_src_date',
    cloud_cover_pct: 0,
    captured_date_iso: spec.ref_date,
    extent_bbox: extentBbox,
    direct_ortho_url:
      `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/` +
      `WMTS/1.0.0/default028mm/MapServer/tile/${spec.wayback_release}/16/${row}/${col}`,
    server_cached_image_path: `/api/v1/parcels/${encodeURIComponent(parcelId)}/historical-image/${spec.period_key}`,
  }));
}

export function getSnapshotImageSrc(snapshot: HistoricalParcelSnapshot): string {
  if (snapshot.cached_image_url) {
    return snapshot.cached_image_url;
  }
  if (snapshot.server_cached_image_path) {
    const q = snapshot.wayback_release
      ? `?wayback_release=${encodeURIComponent(snapshot.wayback_release)}`
      : '';
    return `${GEO_ENGINE_BASE_URL}${snapshot.server_cached_image_path}${q}`;
  }
  return snapshot.direct_ortho_url;
}

export async function fetchParcelDocumentsLive(parcelId: string): Promise<ParcelLegalDocument[]> {
  const res = await fetch(
    `${GEO_ENGINE_BASE_URL}/api/v1/parcels/${encodeURIComponent(parcelId)}/documents`,
    { method: 'GET', headers: { Accept: 'application/json' } },
  );
  if (!res.ok) {
    throw new Error(`No se pudo consultar la documentación: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { documents?: ParcelLegalDocument[] };
  return data.documents ?? [];
}

export async function uploadParcelDocumentLive(
  parcelId: string,
  documentType: 'CERTIFICADO_PARCELARIO' | 'TITULO_PROPIEDAD' | 'CUSTF_SEMARNAT',
  file: File,
): Promise<ParcelLegalDocument> {
  const formData = new FormData();
  formData.append('document_type', documentType);
  formData.append('file', file);

  const res = await fetch(
    `${GEO_ENGINE_BASE_URL}/api/v1/parcels/${encodeURIComponent(parcelId)}/documents`,
    { method: 'POST', body: formData },
  );
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail ?? `No se pudo subir el documento: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { document: ParcelLegalDocument };
  return data.document;
}

export function getParcelDocumentDownloadUrl(parcelId: string, docId: string): string {
  return `${GEO_ENGINE_BASE_URL}/api/v1/parcels/${encodeURIComponent(parcelId)}/documents/${encodeURIComponent(docId)}/file`;
}

export async function fetchParcelHistoricalSnapshotsLive(
  parcelId: string,
  referenceDateIso?: string,
): Promise<{
  parcel_id: string;
  persisted_on_server: boolean;
  extent_bbox: GeoBboxTuple;
  snapshots: HistoricalParcelSnapshot[];
}> {
  const query = referenceDateIso
    ? `?reference_date_iso=${encodeURIComponent(referenceDateIso)}`
    : '';
  const res = await fetch(
    `${GEO_ENGINE_BASE_URL}/api/v1/parcels/${encodeURIComponent(parcelId)}/historical-snapshots${query}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
  );
  if (!res.ok) {
    throw new Error(`No se pudieron cargar las fotos históricas: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchLiveSentinel2Scene(
  parcelId: string,
  coordinates: number[][],
): Promise<LiveSentinel2SceneResponse> {
  const res = await fetch(`${GEO_ENGINE_BASE_URL}/api/v1/audits/sentinel2-live`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      parcel_id: parcelId,
      coordinates,
    }),
  });
  if (!res.ok) {
    throw new Error(`No se pudo consultar escena Sentinel-2: HTTP ${res.status}`);
  }
  return (await res.json()) as LiveSentinel2SceneResponse;
}

function mapRawParcelToOverview(raw: RawPersistedParcel): ParcelAdminOverview {
  return {
    parcelId: raw.parcel_id,
    parcelName: raw.parcel_name,
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
    coordinates: raw.coordinates,
    extentBbox: raw.extent_bbox,
    registeredAtIso: raw.registered_at_iso,
    documents: raw.documents,
    historicalSnapshots: raw.historical_snapshots,
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
  parcelName?: string;
  producerId?: string;
  producerName: string;
  municipality: string;
  areaHectares: number;
  shadeTreeCount: number;
  coordinates?: number[][];
}): Promise<ParcelAdminOverview[]> {
  const res = await fetch(`${GEO_ENGINE_BASE_URL}/api/v1/parcels/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      last_pulled_at_ms: null,
      pushed_parcels: [
        {
          parcel_id: params.parcelId,
          parcel_name: params.parcelName ?? params.producerName,
          producer_id: params.producerId ?? '11111111-1111-4111-8111-111111111111',
          producer_name: params.producerName,
          municipality: params.municipality,
          area_hectares: params.areaHectares,
          eudr_status: 'VERDE',
          ndvi_alert_level: 'VIGOR_AGROFORESTAL_OPTIMO',
          mean_ndvi: 0.81,
          shade_tree_count: params.shadeTreeCount,
          acahual_removal_post_2020: false,
          has_verified_custf_permit: false,
          coordinates: params.coordinates ?? [
            [-93.39, 17.85],
            [-93.386, 17.85],
            [-93.386, 17.8465],
            [-93.39, 17.8465],
            [-93.39, 17.85],
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
