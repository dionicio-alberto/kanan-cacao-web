import { processScaleReceptionByRole } from '@/services/blindScaleAndTracesService';

describe('Bolt 2 — Báscula Ciega (HU-06), Bloqueo CUSTF (HU-05) y Firma EPCIS 2.0 (HU-07)', () => {
  it('oculta la alerta de Yield Cap (> 650 kg/ha) al operador de báscula pero la muestra a Admin ASTRA', () => {
    const baseInput = {
      parcelId: 'parcel-01',
      producerId: 'prod-01',
      areaHectares: 2.0,
      previousCumulativeDryKg: 1150,
      deliveredDryEquivalentKg: 250, // Total = 1400 kg -> 700 kg/ha (> 650 kg/ha)
      readPointId: 'urn:epc:id:sgln:7500000.00001.0',
      isBlockedByCustf: false,
      eventTimeIso: '2026-11-12T18:30:00Z',
    };

    const blindReceipt = processScaleReceptionByRole(baseInput, 'acopiador');
    expect('triggeredYieldCapAlert' in blindReceipt).toBe(false);
    expect('cumulativeKgPerHa' in blindReceipt).toBe(false);
    expect(blindReceipt.epcisEvent.payloadSha256).toHaveLength(64);

    const adminAudit = processScaleReceptionByRole(baseInput, 'admin_astra');
    expect('triggeredYieldCapAlert' in adminAudit && adminAudit.triggeredYieldCapAlert).toBe(true);
    expect('cumulativeKgPerHa' in adminAudit && adminAudit.cumulativeKgPerHa).toBe(700);
  });

  it('impide la recepción en báscula si el productor está bloqueado por CUSTF (HU-05)', () => {
    expect(() =>
      processScaleReceptionByRole(
        {
          parcelId: 'parcel-01',
          producerId: 'prod-bloqueado',
          areaHectares: 2.0,
          previousCumulativeDryKg: 0,
          deliveredDryEquivalentKg: 100,
          readPointId: 'urn:epc:id:sgln:7500000.00001.0',
          isBlockedByCustf: true,
        },
        'acopiador',
      ),
    ).toThrow(/CUSTF/);
  });
});
