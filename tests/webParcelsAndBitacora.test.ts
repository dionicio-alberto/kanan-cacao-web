import { INITIAL_PARCELS } from '@/services/demoParcels';
import {
  buildClosedPolygonFromCenter,
  createFieldLogEntry,
  FIELD_ACTIVITY_LABELS,
  FieldActivityType,
  FieldLogEntry,
  INITIAL_FIELD_LOGS,
  parseCoordinatePairsText,
} from '@/services/producerLogbookService';

describe('Web Test Suite: Parcelas y Georreferencia', () => {
  it('garantiza la estructura requerida de parcelas con linderos cerrados', () => {
    expect(INITIAL_PARCELS.length).toBeGreaterThanOrEqual(2);
    for (const parcel of INITIAL_PARCELS) {
      expect(parcel.parcelId).toBeTruthy();
      expect(parcel.producerName).toBeTruthy();
      expect(parcel.areaHectares).toBeGreaterThan(0);
      expect(parcel.coordinates).toBeDefined();
      const coords = parcel.coordinates!;
      expect(coords.length).toBeGreaterThanOrEqual(4);

      // El polígono debe estar cerrado (primer vértice igual al último)
      const first = coords[0];
      const last = coords[coords.length - 1];
      expect(first[0]).toBe(last[0]);
      expect(first[1]).toBe(last[1]);
    }
  });

  it('calcula polígonos cerrados a partir de centroide y superficie', () => {
    const polygon = buildClosedPolygonFromCenter(18.26, -93.22, 4.5);
    expect(polygon.length).toBe(5);
    expect(polygon[0][0]).toBe(polygon[4][0]);
    expect(polygon[0][1]).toBe(polygon[4][1]);
  });

  it('procesa texto de coordenadas manuales y auto-cierra el anillo WGS84', () => {
    const rawCoords = `
      -93.220000, 18.260000
      -93.210000, 18.260000
      -93.210000, 18.270000
      -93.220000, 18.270000
    `;
    const parsed = parseCoordinatePairsText(rawCoords);
    expect(parsed.length).toBe(5);
    expect(parsed[0]).toEqual(parsed[4]);
  });
});

describe('Web Test Suite: Sección Bitácora', () => {
  it('inicializa la bitácora con registros semilla válidos', () => {
    expect(INITIAL_FIELD_LOGS.length).toBeGreaterThanOrEqual(2);
    const first = INITIAL_FIELD_LOGS[0];
    expect(first.parcelId).toBeTruthy();
    expect(first.activityType).toBe('FERTILIZACION');
    expect(first.activityLabel).toBe(FIELD_ACTIVITY_LABELS.FERTILIZACION);
    expect(first.notes).toBeTruthy();
  });

  it('permite crear un nuevo registro de labor con fotos adjuntas y productor', () => {
    const newEntry = createFieldLogEntry({
      parcelId: 'PAR-CHONTALPA-01',
      parcelName: 'Finca La Chontalpa Lote 1',
      producerId: 'PROD-MATEO-01',
      producerName: 'Don Mateo Hernández',
      activityType: 'CONTROL_PLAGAS' as FieldActivityType,
      performedDate: '2026-11-17',
      inputUsed: 'Caldo sulfocálcico',
      notes: 'Aspersión focalizada en árboles maduros para control de chinche y monilia.',
      photos: [
        {
          id: 'IMG-TEST-1',
          fileName: 'evidencia_aspersion.jpg',
          previewDataUrl: 'data:image/jpeg;base64,sample',
          capturedAtIso: '2026-11-17T10:00:00Z',
        },
      ],
    });

    expect(newEntry.id).toMatch(/^LOG-/);
    expect(newEntry.parcelId).toBe('PAR-CHONTALPA-01');
    expect(newEntry.producerName).toBe('Don Mateo Hernández');
    expect(newEntry.activityType).toBe('CONTROL_PLAGAS');
    expect(newEntry.activityLabel).toBe(FIELD_ACTIVITY_LABELS.CONTROL_PLAGAS);
    expect(newEntry.photos).toHaveLength(1);
    expect(newEntry.notes).toContain('Aspersión focalizada');
  });

  it('valida campos obligatorios: parcela, fecha y descripción', () => {
    expect(() =>
      createFieldLogEntry({
        parcelId: '',
        parcelName: '',
        activityType: 'PODA',
        performedDate: '2026-11-17',
        notes: 'Poda ligera',
        photos: [],
      }),
    ).toThrow('Selecciona una parcela antes de guardar en la bitácora.');

    expect(() =>
      createFieldLogEntry({
        parcelId: 'PAR-1',
        parcelName: 'Lote 1',
        activityType: 'PODA',
        performedDate: '',
        notes: 'Poda ligera',
        photos: [],
      }),
    ).toThrow('Indica la fecha en que se realizó la actividad.');

    expect(() =>
      createFieldLogEntry({
        parcelId: 'PAR-1',
        parcelName: 'Lote 1',
        activityType: 'PODA',
        performedDate: '2026-11-17',
        notes: '   ',
        photos: [],
      }),
    ).toThrow('Describe brevemente la labor realizada en el cacaotal.');

    expect(() =>
      createFieldLogEntry({
        parcelId: 'PAR-1',
        parcelName: 'Lote 1',
        activityType: 'FERTILIZACION',
        performedDate: '2026-11-17',
        fertilizationDate: '',
        notes: 'Abonado',
        photos: [],
      }),
    ).toThrow('Indica la fecha de fertilización');
  });

  it('filtra registros por parcela, productor y rango de fechas con exactitud', () => {
    const logs: FieldLogEntry[] = [
      {
        id: 'L-1',
        parcelId: 'PAR-1',
        parcelName: 'Finca La Chontalpa',
        producerId: 'PROD-1',
        producerName: 'Don Mateo Hernández',
        activityType: 'FERTILIZACION',
        activityLabel: 'Fertilización',
        performedDate: '2026-10-15',
        notes: 'Fertilización con abono',
        photos: [],
        createdAtIso: '2026-10-15T00:00:00Z',
      },
      {
        id: 'L-2',
        parcelId: 'PAR-2',
        parcelName: 'Rancho Santa Rosalía',
        producerId: 'PROD-2',
        producerName: 'Doña Lucía Méndez',
        activityType: 'PODA',
        activityLabel: 'Poda',
        performedDate: '2026-11-10',
        notes: 'Poda de sombra',
        photos: [],
        createdAtIso: '2026-11-10T00:00:00Z',
      },
      {
        id: 'L-3',
        parcelId: 'PAR-1',
        parcelName: 'Finca La Chontalpa',
        producerId: 'PROD-1',
        producerName: 'Don Mateo Hernández',
        activityType: 'CONTROL_PLAGAS',
        activityLabel: 'Control plagas',
        performedDate: '2026-11-16',
        notes: 'Manejo sanitario',
        photos: [],
        createdAtIso: '2026-11-16T00:00:00Z',
      },
    ];

    // Filtro por Parcela
    const byParcel = logs.filter((l) => l.parcelId === 'PAR-1');
    expect(byParcel).toHaveLength(2);
    expect(byParcel.map((l) => l.id)).toEqual(['L-1', 'L-3']);

    // Filtro por Productor
    const byProducer = logs.filter((l) => l.producerName?.toLowerCase().includes('lucía'));
    expect(byProducer).toHaveLength(1);
    expect(byProducer[0].id).toBe('L-2');

    // Filtro por Rango de Fechas (Noviembre 2026)
    const byDate = logs.filter(
      (l) => l.performedDate >= '2026-11-01' && l.performedDate <= '2026-11-30',
    );
    expect(byDate).toHaveLength(2);
    expect(byDate.map((l) => l.id)).toEqual(['L-2', 'L-3']);
  });
});
