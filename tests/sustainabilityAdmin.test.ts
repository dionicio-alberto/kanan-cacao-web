import {
  consolidateCarbonClusterWeb,
  evaluateCustfAdminCompliance,
  ParcelAdminOverview,
} from '@/services/sustainabilityAdminService';
import { WEB_DOMAIN_CONSTANTS } from '@/types/adminDomain';

describe('Bolt 1 — Auditoría EUDR/NDVI (HU-03, HU-04), CUSTF (HU-05) y Consolidación Carbono (HU-09)', () => {
  const sampleParcels: ParcelAdminOverview[] = [
    {
      parcelId: 'p-comalcalco-1',
      producerId: 'prod-1',
      producerName: 'Don Mateo Chontal',
      municipality: 'Comalcalco',
      areaHectares: 3.4,
      eudrStatus: 'VERDE',
      ndviAlertLevel: 'VIGOR_AGROFORESTAL_OPTIMO',
      meanNdvi: 0.78,
      shadeTreeCount: 110,
      acahualRemovalPost2020: false,
      hasVerifiedCustfPermit: false,
    },
    {
      parcelId: 'p-paraiso-2',
      producerId: 'prod-2',
      producerName: 'Doña Elena Cacao',
      municipality: 'Paraíso',
      areaHectares: 2.8,
      eudrStatus: 'VERDE',
      ndviAlertLevel: 'VIGOR_AGROFORESTAL_OPTIMO',
      meanNdvi: 0.75,
      shadeTreeCount: 95,
      acahualRemovalPost2020: true,
      hasVerifiedCustfPermit: true,
    },
    {
      parcelId: 'p-bloqueada-custf',
      producerId: 'prod-3',
      producerName: 'Productor Sin CUSTF',
      municipality: 'Cunduacán',
      areaHectares: 2.1,
      eudrStatus: 'VERDE',
      ndviAlertLevel: 'ESTRES_HIDRICO_TEMPRANO',
      meanNdvi: 0.58,
      shadeTreeCount: 40,
      acahualRemovalPost2020: true,
      hasVerifiedCustfPermit: false,
    },
  ];

  it('bloquea automáticamente al productor con remoción de acahuales sin CUSTF (HU-05)', () => {
    const blocked = evaluateCustfAdminCompliance(sampleParcels[2]);
    expect(blocked.isProducerBlocked).toBe(true);
    expect(blocked.blockReason).toContain('CUSTF de SEMARNAT');

    const compliantWithPermit = evaluateCustfAdminCompliance(sampleParcels[1]);
    expect(compliantWithPermit.isProducerBlocked).toBe(false);
  });

  it('consolida minifundios < 5 ha con estatus VERDE excluyendo productores bloqueados por CUSTF (HU-09)', () => {
    const cluster = consolidateCarbonClusterWeb({
      clusterId: 'cluster-chontalpa-01',
      clusterName: 'Cluster Carbono Chontalpa',
      parcels: sampleParcels,
      minimumRequiredHectares: 6.0,
    });

    expect(cluster.acceptedParcelIds).toEqual(['p-comalcalco-1', 'p-paraiso-2']);
    expect(cluster.rejectedParcelIds).toEqual(['p-bloqueada-custf']);
    expect(cluster.totalHectares).toBe(6.2);
    expect(cluster.meetsMinimumVolume).toBe(true);
    expect(cluster.eudrLegalDisclaimer).toBe(WEB_DOMAIN_CONSTANTS.EUDR_LEGAL_DISCLAIMER);
  });
});
