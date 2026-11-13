import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';

/** Datos de demostración (no reales) de parcelas en la Chontalpa, Tabasco. */
export const INITIAL_PARCELS: ParcelAdminOverview[] = [
  {
    parcelId: 'PAR-CHONTALPA-01',
    producerId: 'PROD-MATEO-01',
    producerName: 'Don Mateo Hernández (Comalcalco)',
    municipality: 'Comalcalco',
    areaHectares: 3.4,
    eudrStatus: 'VERDE',
    ndviAlertLevel: 'VIGOR_AGROFORESTAL_OPTIMO',
    meanNdvi: 0.78,
    shadeTreeCount: 120,
    acahualRemovalPost2020: false,
    hasVerifiedCustfPermit: false,
  },
  {
    parcelId: 'PAR-PARAISO-02',
    producerId: 'PROD-ELENA-02',
    producerName: 'Doña Elena Córdova (Paraíso)',
    municipality: 'Paraíso',
    areaHectares: 2.8,
    eudrStatus: 'VERDE',
    ndviAlertLevel: 'ESTRES_HIDRICO_TEMPRANO',
    meanNdvi: 0.59,
    shadeTreeCount: 95,
    acahualRemovalPost2020: true,
    hasVerifiedCustfPermit: true,
  },
  {
    parcelId: 'PAR-CUNDUACAN-03',
    producerId: 'PROD-CARLOS-03',
    producerName: 'Carlos Chontal (Cunduacán)',
    municipality: 'Cunduacán',
    areaHectares: 4.6,
    eudrStatus: 'ROJO',
    ndviAlertLevel: 'FOCO_PLAGA_FUNGICA_ALERTA',
    meanNdvi: 0.41,
    shadeTreeCount: 30,
    acahualRemovalPost2020: true,
    hasVerifiedCustfPermit: false,
  },
];
