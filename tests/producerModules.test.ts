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
      })
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
