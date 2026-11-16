import {
  evaluateCustfAdminCompliance,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';

export type ProducerNavSection = 'inicio' | 'parcelas' | 'bitacora' | 'cosecha' | 'carbono';

export type FieldActivityType =
  | 'FERTILIZACION'
  | 'PODA'
  | 'CHAPEO_LIMPIEZA'
  | 'CONTROL_PLAGAS'
  | 'COSECHA_CORTE'
  | 'RIEGO_RESIEMBRA';

export interface FieldEvidencePhoto {
  id: string;
  fileName: string;
  previewDataUrl: string;
  capturedAtIso: string;
}

export interface FieldLogEntry {
  id: string;
  parcelId: string;
  parcelName: string;
  activityType: FieldActivityType;
  activityLabel: string;
  performedDate: string;
  fertilizationDate?: string;
  expectedHarvestDate?: string;
  inputUsed?: string;
  notes: string;
  photos: FieldEvidencePhoto[];
  createdAtIso: string;
}

export interface HarvestAcopioEntry {
  id: string;
  parcelId: string;
  parcelName: string;
  harvestDate: string;
  podCount: number;
  wetWeightKg: number;
  fermentationMethod: 'CAJONES_MADERA' | 'COSTALES';
  fermentationDays: number;
  dryingDays: number;
  dryDeliveredKg?: number;
  deliveryFolio?: string;
}

export interface NewParcelGeorefDraft {
  parcelName: string;
  producerName: string;
  municipality: string;
  areaHectares: number;
  shadeTreeCount: number;
  centerLat: number;
  centerLng: number;
  customCoordsText?: string;
}

export interface ProducerFriendlyParcelSummary {
  forestStatusLabel: string;
  forestStatusTone: 'verde' | 'revision' | 'alerta';
  canopyHealthLabel: string;
  canopyHealthHint: string;
  papersStatusLabel: string;
  papersAreClear: boolean;
  needsPaperCheck: boolean;
}

export const FIELD_ACTIVITY_LABELS: Record<FieldActivityType, string> = {
  FERTILIZACION: 'Fertilización y abono orgánico',
  PODA: 'Poda de formación y sombra',
  CHAPEO_LIMPIEZA: 'Chapeo y limpieza del terreno',
  CONTROL_PLAGAS: 'Control preventivo de plagas',
  COSECHA_CORTE: 'Corte y quiebra de mazorcas',
  RIEGO_RESIEMBRA: 'Riego y resiembra de plantas',
};

export function getProducerFriendlyParcelStatus(
  parcel: ParcelAdminOverview,
): ProducerFriendlyParcelSummary {
  const compliance = evaluateCustfAdminCompliance(parcel);

  let forestStatusLabel = 'Monte y parcela al día (Sin tala reciente)';
  let forestStatusTone: 'verde' | 'revision' | 'alerta' = 'verde';
  if (parcel.eudrStatus === 'PENDIENTE_REVISION') {
    forestStatusLabel = 'Por revisar linderos y papeles';
    forestStatusTone = 'revision';
  } else if (parcel.eudrStatus === 'ROJO') {
    forestStatusLabel = 'Requiere revisión de arbolado reciente';
    forestStatusTone = 'alerta';
  }

  let canopyHealthLabel = 'Cacaotal sano y frondoso';
  let canopyHealthHint = 'Follaje con buen vigor y cobertura verde estable.';
  if (parcel.ndviAlertLevel === 'ESTRES_HIDRICO_TEMPRANO') {
    canopyHealthLabel = 'Falta de humedad en suelo';
    canopyHealthHint = 'Conviene revisar riego, acolchado y sombra en temporada seca.';
  } else if (parcel.ndviAlertLevel === 'FOCO_PLAGA_FUNGICA_ALERTA') {
    canopyHealthLabel = 'Posible foco de mancha o plaga';
    canopyHealthHint =
      'Recomendable recorrer el lote para poda sanitaria y recolección de mazorca dañada.';
  }

  const papersAreClear = !compliance.isProducerBlocked;
  const papersStatusLabel = papersAreClear
    ? 'Papeles y constancia de terreno en regla'
    : 'Falta constancia de limpieza de acahual para liberar entregas';

  return {
    forestStatusLabel,
    forestStatusTone,
    canopyHealthLabel,
    canopyHealthHint,
    papersStatusLabel,
    papersAreClear,
    needsPaperCheck: parcel.acahualRemovalPost2020,
  };
}

export function buildClosedPolygonFromCenter(
  centerLat: number,
  centerLng: number,
  areaHectares: number,
): number[][] {
  const safeHectares = Math.max(0.25, Math.min(200, Number(areaHectares) || 2.0));
  const areaSqMeters = safeHectares * 10000;
  const sideMeters = Math.sqrt(areaSqMeters);
  const metersPerDegLat = 111320;
  const metersPerDegLng = Math.max(40000, 111320 * Math.cos((centerLat * Math.PI) / 180));
  const halfLat = sideMeters / 2 / metersPerDegLat;
  const halfLng = sideMeters / 2 / metersPerDegLng;

  const minLng = Number((centerLng - halfLng).toFixed(6));
  const maxLng = Number((centerLng + halfLng).toFixed(6));
  const minLat = Number((centerLat - halfLat).toFixed(6));
  const maxLat = Number((centerLat + halfLat).toFixed(6));

  return [
    [minLng, maxLat],
    [maxLng, maxLat],
    [maxLng, minLat],
    [minLng, minLat],
    [minLng, maxLat],
  ];
}

export function parseCoordinatePairsText(rawText: string): number[][] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const coords: number[][] = [];
  for (const line of lines) {
    const parts = line.split(/[,\s;]+/).map((p) => Number(p.trim()));
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      coords.push([Number(parts[0].toFixed(6)), Number(parts[1].toFixed(6))]);
    }
  }

  if (coords.length < 3) {
    throw new Error('Ingresa al menos 3 esquinas válidas en formato longitud, latitud.');
  }

  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push([first[0], first[1]]);
  }
  return coords;
}

export function createFieldLogEntry(input: {
  parcelId: string;
  parcelName: string;
  activityType: FieldActivityType;
  performedDate: string;
  fertilizationDate?: string;
  expectedHarvestDate?: string;
  inputUsed?: string;
  notes: string;
  photos: FieldEvidencePhoto[];
}): FieldLogEntry {
  const trimmedNotes = input.notes.trim();
  if (!input.parcelId) {
    throw new Error('Selecciona una parcela antes de guardar en la bitácora.');
  }
  if (!input.performedDate) {
    throw new Error('Indica la fecha en que se realizó la actividad.');
  }
  if (input.activityType === 'FERTILIZACION' && !input.fertilizationDate) {
    throw new Error('Indica la fecha de fertilización para llevar el control nutricional.');
  }
  if (!trimmedNotes) {
    throw new Error('Describe brevemente la labor realizada en el cacaotal.');
  }

  return {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    parcelId: input.parcelId,
    parcelName: input.parcelName,
    activityType: input.activityType,
    activityLabel: FIELD_ACTIVITY_LABELS[input.activityType],
    performedDate: input.performedDate,
    fertilizationDate: input.fertilizationDate || undefined,
    expectedHarvestDate: input.expectedHarvestDate || undefined,
    inputUsed: input.inputUsed?.trim() || undefined,
    notes: trimmedNotes,
    photos: input.photos,
    createdAtIso: new Date().toISOString(),
  };
}

export const INITIAL_FIELD_LOGS: FieldLogEntry[] = [
  {
    id: 'LOG-INICIAL-01',
    parcelId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    parcelName: 'Finca La Joya de Chontalpa',
    activityType: 'FERTILIZACION',
    activityLabel: FIELD_ACTIVITY_LABELS.FERTILIZACION,
    performedDate: '2026-10-18',
    fertilizationDate: '2026-10-18',
    expectedHarvestDate: '2026-11-28',
    inputUsed: 'Composta de cáscara de cacao + micorrizas (120 kg)',
    notes:
      'Aplicación de abono orgánico alrededor del cajete en 280 árboles de cacao criollo tras lluvias ligeras.',
    photos: [
      {
        id: 'FOTO-DEMO-01',
        fileName: 'fertilizacion_organica_lote_norte.svg',
        previewDataUrl:
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#1E5E36"/><circle cx="160" cy="88" r="46" fill="#4ADE80" opacity="0.75"/><rect x="150" y="105" width="20" height="65" fill="#52321B"/><text x="160" y="185" font-family="sans-serif" font-size="13" fill="#FFFFFF" text-anchor="middle">Abono aplicado en cacaotal</text></svg>',
          ),
        capturedAtIso: '2026-10-18T09:40:00Z',
      },
    ],
    createdAtIso: '2026-10-18T15:10:00Z',
  },
  {
    id: 'LOG-INICIAL-02',
    parcelId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    parcelName: 'Rancho El Cacaotal Sagrado',
    activityType: 'PODA',
    activityLabel: FIELD_ACTIVITY_LABELS.PODA,
    performedDate: '2026-11-04',
    expectedHarvestDate: '2026-12-05',
    inputUsed: 'Pasta cicatrizante natural y sierra podadora',
    notes:
      'Poda sanitaria y deschuponado para mejorar entrada de luz en zonas con exceso de sombra.',
    photos: [],
    createdAtIso: '2026-11-04T16:20:00Z',
  },
];

export const INITIAL_HARVEST_ENTRIES: HarvestAcopioEntry[] = [
  {
    id: 'COS-INICIAL-01',
    parcelId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    parcelName: 'Finca La Joya de Chontalpa',
    harvestDate: '2026-11-08',
    podCount: 1850,
    wetWeightKg: 740,
    fermentationMethod: 'CAJONES_MADERA',
    fermentationDays: 6,
    dryingDays: 5,
    dryDeliveredKg: 300,
    deliveryFolio: 'ACO-TAB-2026-001',
  },
];

const TILE_SIZE = 256;

export function latLngToWorldPixel(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const clampedLat = Math.max(-85.051128, Math.min(85.051128, lat));
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const worldX = ((lng + 180) / 360) * scale;
  const worldY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x: worldX, y: worldY };
}

export function worldPixelToLatLng(
  worldX: number,
  worldY: number,
  zoom: number,
): { lat: number; lng: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const lng = (worldX / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * worldY) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

export function screenClickToLatLng(
  clickX: number,
  clickY: number,
  viewportW: number,
  viewportH: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
): { lat: number; lng: number } {
  const centerWorld = latLngToWorldPixel(centerLat, centerLng, zoom);
  const worldX = centerWorld.x - viewportW / 2 + clickX;
  const worldY = centerWorld.y - viewportH / 2 + clickY;
  return worldPixelToLatLng(worldX, worldY, zoom);
}

export function latLngToScreenPoint(
  lat: number,
  lng: number,
  viewportW: number,
  viewportH: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
): { x: number; y: number } {
  const centerWorld = latLngToWorldPixel(centerLat, centerLng, zoom);
  const targetWorld = latLngToWorldPixel(lat, lng, zoom);
  return {
    x: Number((targetWorld.x - (centerWorld.x - viewportW / 2)).toFixed(2)),
    y: Number((targetWorld.y - (centerWorld.y - viewportH / 2)).toFixed(2)),
  };
}

export function estimatePolygonHectares(coordinates: number[][]): number {
  if (!coordinates || coordinates.length < 3) {
    return 0;
  }
  const ring =
    coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
    coordinates[0][1] === coordinates[coordinates.length - 1][1]
      ? coordinates
      : [...coordinates, coordinates[0]];

  const meanLatRad = (ring.reduce((acc, pt) => acc + pt[1], 0) / ring.length) * (Math.PI / 180);
  const metersPerDegLat = 111132.92;
  const metersPerDegLng = Math.max(40000, 111412.84 * Math.cos(meanLatRad));

  let twiceAreaSqMeters = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const x1 = ring[i][0] * metersPerDegLng;
    const y1 = ring[i][1] * metersPerDegLat;
    const x2 = ring[i + 1][0] * metersPerDegLng;
    const y2 = ring[i + 1][1] * metersPerDegLat;
    twiceAreaSqMeters += x1 * y2 - x2 * y1;
  }
  const hectares = Math.abs(twiceAreaSqMeters) / 2 / 10000;
  return Number(hectares.toFixed(2));
}

export type TimelapseDirection = 'forward' | 'backward';

export function getOrderedTimelapsePeriodKeys(
  snapshots: Array<{ period_key: string }>,
  direction: TimelapseDirection,
): string[] {
  const keys = snapshots.map((item) => item.period_key);
  return direction === 'forward' ? [...keys].reverse() : keys;
}

export function getNextTimelapsePeriodKey(
  orderedPeriodKeys: string[],
  currentPeriodKey: string,
): string {
  if (orderedPeriodKeys.length === 0) {
    return currentPeriodKey;
  }
  const idx = orderedPeriodKeys.indexOf(currentPeriodKey);
  const nextIdx = idx === -1 ? 0 : (idx + 1) % orderedPeriodKeys.length;
  return orderedPeriodKeys[nextIdx];
}
