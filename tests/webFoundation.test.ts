import { NATURISTA_WEB_THEME } from '@/theme/naturistaWebTheme';
import { WEB_DOMAIN_CONSTANTS } from '@/types/adminDomain';

describe('Bolt 0 — Web Admin Cimentación y Estándares Light Mode Naturista', () => {
  it('verifica las constantes EUDR, Yield Caps de Tabasco y tema Light Mode', () => {
    expect(NATURISTA_WEB_THEME.mode).toBe('light');
    expect(WEB_DOMAIN_CONSTANTS.EUDR_CUTOFF_DATE_ISO).toBe('2020-12-31');
    expect(WEB_DOMAIN_CONSTANTS.TABASCO_YIELD_CAP_MIN_KG_HA).toBe(450);
    expect(WEB_DOMAIN_CONSTANTS.TABASCO_YIELD_CAP_MAX_KG_HA).toBe(650);
    expect(WEB_DOMAIN_CONSTANTS.CARBON_SMALLHOLDER_MAX_HA).toBe(5.0);
  });
});
