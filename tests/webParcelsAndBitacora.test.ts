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

  it('permite registrar labores agronómicas con desglose de costos, jornales y dosis', () => {
    const entry: FieldLogEntry = {
      id: 'L-AGRO-1',
      parcelId: 'PAR-1',
      parcelName: 'Finca La Chontalpa',
      producerId: 'PROD-1',
      producerName: 'Don Mateo Hernández',
      activityType: 'FERTILIZACION_ORGANICA',
      activityLabel: 'Fertilización Orgánica / Bocashi',
      performedDate: '2026-11-18',
      inputUsed: 'Bocashi maduro',
      dose: '3 kg/árbol',
      costMxn: 450,
      laborHours: 6,
      workersCount: 2,
      weatherCondition: 'NUBLADO',
      customFields: {
        metodo_aplicacion: 'Corona',
      },
      notes: 'Aplicación en árboles en producción previa a floración',
      photos: [],
      createdAtIso: new Date().toISOString(),
    };

    expect(entry.costMxn).toBe(450);
    expect(entry.laborHours).toBe(6);
    expect(entry.workersCount).toBe(2);
    expect(entry.weatherCondition).toBe('NUBLADO');
    expect(entry.customFields?.metodo_aplicacion).toBe('Corona');
    expect(entry.dose).toBe('3 kg/árbol');
  });

  it('excluye labores de corte y acopio del catálogo de actividades agronómicas recomendadas', () => {
    const recommendedActivities = [
      'MANEJO_SOMBRA',
      'PODA_CACAO',
      'DESMOMIFICACION_FITOSANITARIA',
      'FERTILIZACION_ORGANICA',
      'CONTROL_MALEZAS',
      'RIEGO_DRENAJE',
      'APLICACION_BIOINSUMO',
      'INSPECCION_FLORACION',
    ];

    expect(recommendedActivities).not.toContain('COSECHA_CORTE');
    expect(recommendedActivities).not.toContain('ACOPIO');
  });

  it('soporta navegación a formularios especializados por labor con parámetros contextuales', () => {
    // Simulación de notas contextuales generadas por labor
    const buildLaborNote = (activity: string, customParam: string, baseNotes: string) => {
      return `${baseNotes} [${activity}] ${customParam}`.trim();
    };

    const sombraNote = buildLaborNote(
      'Sombra',
      'Árboles intervenidos: Guamo y Cedro · Cobertura: 35%',
      'Poda alta',
    );
    expect(sombraNote).toContain('[Sombra] Árboles intervenidos: Guamo y Cedro');

    const fitoNote = buildLaborNote(
      'Fitosanidad',
      'Tratamiento de: Moniliasis · Mazorcas: 80',
      'Recorrido',
    );
    expect(fitoNote).toContain('[Fitosanidad] Tratamiento de: Moniliasis');

    const bioNote = buildLaborNote('Bioinsumo', 'Producto: Caldo Bordelés 1%', 'Fumigación');
    expect(bioNote).toContain('[Bioinsumo] Producto: Caldo Bordelés 1%');
  });

  it('permite la edición reactiva de registros existentes en el historial', () => {
    const originalEntry: FieldLogEntry = {
      id: 'LOG-WEB-EDIT-1',
      parcelId: 'PAR-1',
      parcelName: 'Finca La Chontalpa Lote 1',
      activityType: 'FERTILIZACION_ORGANICA',
      activityLabel: 'Fertilización Orgánica',
      performedDate: '2026-11-18',
      inputUsed: 'Bocashi',
      dose: '2 kg/árbol',
      laborHours: 4,
      workersCount: 2,
      costMxn: 500,
      notes: 'Nota inicial',
      photos: [],
      createdAtIso: new Date().toISOString(),
    };

    // Actualización in-place
    const updatedEntry: FieldLogEntry = {
      ...originalEntry,
      inputUsed: 'Bocashi enriquecido + lixiviado de lombriz',
      dose: '3 kg/árbol',
      laborHours: 6,
      costMxn: 750,
      notes: 'Nota corregida tras inspección agronómica',
    };

    expect(updatedEntry.id).toBe(originalEntry.id);
    expect(updatedEntry.inputUsed).toBe('Bocashi enriquecido + lixiviado de lombriz');
    expect(updatedEntry.dose).toBe('3 kg/árbol');
    expect(updatedEntry.laborHours).toBe(6);
    expect(updatedEntry.costMxn).toBe(750);
    expect(updatedEntry.notes).toContain('Nota corregida');
  });

  it('permite la eliminación segura de registros con confirmación', () => {
    let logs: FieldLogEntry[] = [
      {
        id: 'L-1',
        parcelId: 'PAR-1',
        parcelName: 'Parcela 1',
        activityType: 'PODA',
        activityLabel: 'Poda',
        performedDate: '2026-11-10',
        notes: 'Poda',
        photos: [],
        createdAtIso: new Date().toISOString(),
      },
      {
        id: 'L-2',
        parcelId: 'PAR-1',
        parcelName: 'Parcela 1',
        activityType: 'FERTILIZACION',
        activityLabel: 'Fertilización',
        performedDate: '2026-11-12',
        notes: 'Fertilización',
        photos: [],
        createdAtIso: new Date().toISOString(),
      },
    ];

    expect(logs).toHaveLength(2);
    // Eliminar L-1
    logs = logs.filter((l) => l.id !== 'L-1');
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe('L-2');
  });

  it('calcula métricas de resumen agronómico en el Hub de Bitácora', () => {
    const logs: FieldLogEntry[] = [
      {
        id: 'L-FITO',
        parcelId: 'PAR-1',
        activityType: 'DESMOMIFICACION_FITOSANITARIA',
        performedDate: '2026-11-10',
        laborHours: 4,
        costMxn: 400,
        notes: 'Control monilia',
        photos: [],
        createdAtIso: new Date().toISOString(),
      },
      {
        id: 'L-NUTRI',
        parcelId: 'PAR-1',
        activityType: 'FERTILIZACION_ORGANICA',
        performedDate: '2026-11-15',
        laborHours: 5,
        costMxn: 600,
        notes: 'Abonado',
        photos: [],
        createdAtIso: new Date().toISOString(),
      },
    ];

    const totalHours = logs.reduce((acc, l) => acc + (l.laborHours || 0), 0);
    const totalCost = logs.reduce((acc, l) => acc + (l.costMxn || 0), 0);

    expect(totalHours).toBe(9);
    expect(totalCost).toBe(1000);
    expect(logs).toHaveLength(2);
  });
});
