import {
  buildClosedPolygonFromCenter,
  createFieldLogEntry,
  getProducerFriendlyParcelStatus,
  parseCoordinatePairsText,
} from '@/services/producerLogbookService';
import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';

describe('Portal centrado en el productor — Lenguaje accesible, bitácora y georreferencia', () => {
  const sampleParcel: ParcelAdminOverview = {
    parcelId: 'parcel-tab-01',
    parcelName: 'Finca La Joya',
    producerId: 'prod-1',
    producerName: 'Don Mateo Hernández',
    municipality: 'Comalcalco',
    areaHectares: 3.4,
    eudrStatus: 'VERDE',
    ndviAlertLevel: 'VIGOR_AGROFORESTAL_OPTIMO',
    meanNdvi: 0.76,
    shadeTreeCount: 110,
    acahualRemovalPost2020: false,
    hasVerifiedCustfPermit: true,
  };

  it('traduce los estados de parcela a lenguaje cotidiano sin siglas técnicas', () => {
    const friendly = getProducerFriendlyParcelStatus(sampleParcel);
    const combinedText = [
      friendly.forestStatusLabel,
      friendly.canopyHealthLabel,
      friendly.canopyHealthHint,
      friendly.papersStatusLabel,
    ].join(' ');

    expect(friendly.forestStatusTone).toBe('verde');
    expect(friendly.papersAreClear).toBe(true);
    expect(combinedText).not.toMatch(/EUDR|NDVI|CUSTF|EPCIS/i);
  });

  it('crea registros en bitácora con fecha de fertilización, fecha de cosecha y evidencias fotográficas', () => {
    const log = createFieldLogEntry({
      parcelId: sampleParcel.parcelId,
      parcelName: sampleParcel.parcelName!,
      activityType: 'FERTILIZACION',
      performedDate: '2026-11-15',
      fertilizationDate: '2026-11-15',
      expectedHarvestDate: '2026-12-20',
      inputUsed: 'Composta orgánica de cacao',
      notes: 'Abonado en todo el bloque norte tras limpia.',
      photos: [
        {
          id: 'foto-1',
          fileName: 'cacaotal_abonado.jpg',
          previewDataUrl: 'data:image/jpeg;base64,ZmFrZQ==',
          capturedAtIso: '2026-11-15T12:00:00Z',
        },
      ],
    });

    expect(log.fertilizationDate).toBe('2026-11-15');
    expect(log.expectedHarvestDate).toBe('2026-12-20');
    expect(log.photos).toHaveLength(1);
  });

  it('exige fecha de fertilización cuando la actividad registrada es fertilización', () => {
    expect(() =>
      createFieldLogEntry({
        parcelId: sampleParcel.parcelId,
        parcelName: sampleParcel.parcelName!,
        activityType: 'FERTILIZACION',
        performedDate: '2026-11-15',
        notes: 'Aplicación sin fecha explícita',
        photos: [],
      }),
    ).toThrow(/fecha de fertilización/i);
  });

  it('construye un polígono cerrado válido desde el punto GPS central y parsea esquinas', () => {
    const polygon = buildClosedPolygonFromCenter(18.25, -93.26, 4.0);
    expect(polygon).toHaveLength(5);
    expect(polygon[0]).toEqual(polygon[4]);

    const parsed = parseCoordinatePairsText('-93.26, 18.25\n-93.25, 18.25\n-93.25, 18.24');
    expect(parsed).toHaveLength(4);
    expect(parsed[0]).toEqual(parsed[3]);
  });
});

it('calcula coordenadas desde clics en mapa Web Mercator y área en hectáreas', async () => {
  const { latLngToScreenPoint, screenClickToLatLng, estimatePolygonHectares } =
    await import('@/services/producerLogbookService');

  const centerLat = 18.2545;
  const centerLng = -93.2825;
  const pickedCenter = screenClickToLatLng(380, 210, 760, 420, centerLat, centerLng, 16);
  expect(pickedCenter.lat).toBeCloseTo(centerLat, 4);
  expect(pickedCenter.lng).toBeCloseTo(centerLng, 4);

  const screenPt = latLngToScreenPoint(centerLat, centerLng, 760, 420, centerLat, centerLng, 16);
  expect(screenPt.x).toBeCloseTo(380, 1);
  expect(screenPt.y).toBeCloseTo(210, 1);

  const rectCoords = [
    [-93.2845, 18.256],
    [-93.281, 18.256],
    [-93.281, 18.2525],
    [-93.2845, 18.2525],
    [-93.2845, 18.256],
  ];
  const ha = estimatePolygonHectares(rectCoords);
  expect(ha).toBeGreaterThan(10);
  expect(ha).toBeLessThan(20);
});

it('genera exactamente 7 momentos históricos centrados desde registro hasta 5 años atrás', async () => {
  const { buildHistoricalSnapshotsFallback, computeWaybackTileLayout } =
    await import('@/services/geoEngineLiveClient');
  const { estimatePolygonHectares } = await import('@/services/producerLogbookService');

  const coords = [
    [-93.2845, 18.256],
    [-93.281, 18.256],
    [-93.281, 18.2525],
    [-93.2845, 18.2525],
    [-93.2845, 18.256],
  ];
  const snapshots = buildHistoricalSnapshotsFallback('PAR-TEST-5Y', coords);
  expect(snapshots).toHaveLength(7);
  expect(snapshots.map((s) => s.period_key)).toEqual([
    'registro_actual',
    'hace_6_meses',
    'hace_1_anio',
    'hace_2_anios',
    'hace_3_anios',
    'hace_4_anios',
    'hace_5_anios',
  ]);
  const releases = snapshots.map((s) => s.wayback_release);
  const dates = snapshots.map((s) => s.captured_date_iso);
  expect(new Set(releases).size).toBe(7);
  expect(new Set(dates).size).toBe(7);
  expect(snapshots.every((s) => s.capture_source === 'real_src_date')).toBe(true);
  expect(computeWaybackTileLayout(coords, '43291').length).toBeGreaterThan(0);

  const tinyPolygon = [
    [-93.2845, 18.256],
    [-93.2833, 18.256],
    [-93.2833, 18.2549],
    [-93.2845, 18.2549],
  ];
  const haRounded = estimatePolygonHectares(tinyPolygon);
  expect(Number(haRounded.toFixed(2))).toBe(haRounded);

  const { getParcelDocumentDownloadUrl, getSnapshotImageSrc } =
    await import('@/services/geoEngineLiveClient');
  expect(
    getSnapshotImageSrc({
      ...snapshots[0],
      cached_image_url: 'https://cdn.example/storage/v1/object/public/parcel-satellite-maps/ok.jpg',
    }),
  ).toBe('https://cdn.example/storage/v1/object/public/parcel-satellite-maps/ok.jpg');
  expect(computeWaybackTileLayout(coords, 's2cloudless-2024_3857')[0].url).toContain(
    'tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857',
  );
  expect(getParcelDocumentDownloadUrl('PAR-TEST-5Y', 'doc-1')).toContain(
    '/api/v1/parcels/PAR-TEST-5Y/documents/doc-1/file',
  );
});
