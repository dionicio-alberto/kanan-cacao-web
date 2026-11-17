import { PRESET_POLYGONS, projectCoordinatesToSvgPoints } from '@/services/geoEngineLiveClient';

describe('Bolt 3 — Cliente en vivo del Geo-Engine y proyección SVG', () => {
  it('proyecta coordenadas WGS84 dentro del lienzo SVG respetando el margen', () => {
    const points = projectCoordinatesToSvgPoints(
      PRESET_POLYGONS.CLEAN_COMALCALCO.coordinates,
      320,
      200,
      24,
    )
      .split(' ')
      .map((p) => p.split(',').map(Number));

    expect(points).toHaveLength(4);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(24);
      expect(x).toBeLessThanOrEqual(296);
      expect(y).toBeGreaterThanOrEqual(24);
      expect(y).toBeLessThanOrEqual(176);
    }
  });

  it('el preset con auto-intersección viene sin cerrar para demostrar el linter', () => {
    const coords = PRESET_POLYGONS.SELF_INTERSECTING_BOWTIE.coordinates;
    expect(coords[0]).not.toEqual(coords[coords.length - 1]);
  });

  it('devuelve cadena vacía si no hay coordenadas', () => {
    expect(projectCoordinatesToSvgPoints([])).toBe('');
  });
});

describe('Satélite Esri World Imagery y proyección ortogonal', () => {
  it('ajusta el bbox al aspect ratio 1.75 igual que ArcGIS World_Imagery', async () => {
    const {
      computePaddedGeoBbox,
      fitBboxToAspectRatio,
      buildSatelliteOrthoExportUrl,
      projectCoordinatesToOrthoSvgPoints,
    } = await import('@/services/geoEngineLiveClient');

    const squareCoords = [
      [-93.225, 18.215],
      [-93.221, 18.215],
      [-93.221, 18.211],
      [-93.225, 18.211],
      [-93.225, 18.215],
    ];
    const padded = computePaddedGeoBbox(squareCoords);
    expect(padded).toEqual([-93.2275, 18.2085, -93.2185, 18.2175]);

    const fitted = fitBboxToAspectRatio(padded, 420 / 240);
    expect(fitted[0]).toBeCloseTo(-93.230875, 5);
    expect(fitted[1]).toBe(18.2085);
    expect(fitted[2]).toBeCloseTo(-93.215125, 5);
    expect(fitted[3]).toBe(18.2175);

    const { orthoUrl, extentBbox } = buildSatelliteOrthoExportUrl(squareCoords);
    expect(orthoUrl).toContain('World_Imagery/MapServer/export');
    expect(orthoUrl).toContain('size=840,480');

    const svgPts = projectCoordinatesToOrthoSvgPoints(squareCoords, extentBbox, 420, 240);
    expect(svgPts).toHaveLength(5);
    expect(svgPts[0].x).toBeGreaterThan(0);
    expect(svgPts[0].x).toBeLessThan(420);
    expect(svgPts[0].y).toBeGreaterThan(0);
    expect(svgPts[0].y).toBeLessThan(240);
  });

  it('genera mosaico 6x5 con proyección y nitidez HD idéntica a cacao-track', async () => {
    const { computeCacaoTrackTileGrid, buildWaybackTileUrl } =
      await import('@/services/geoEngineLiveClient');
    const coords = [
      [-93.2845, 18.256],
      [-93.281, 18.256],
      [-93.281, 18.2525],
      [-93.2845, 18.2525],
    ];
    const grid = computeCacaoTrackTileGrid(coords, 6, 5);
    expect(grid.tiles).toHaveLength(30);
    expect(grid.zoom).toBeGreaterThanOrEqual(15);
    expect(grid.zoom).toBeLessThanOrEqual(17);
    expect(grid.viewBoxStr).toMatch(/^\d+\.\d \d+\.\d \d+\.\d \d+\.\d$/);
    expect(grid.projectedPts).toHaveLength(4);
    expect(grid.polygonPointsStr.split(' ')).toHaveLength(4);

    const liveUrl = buildWaybackTileUrl('live', 16, 100, 200);
    expect(liveUrl).toContain(
      'server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/16/200/100',
    );

    const waybackUrl = buildWaybackTileUrl('49059', 16, 100, 200);
    expect(waybackUrl).toContain(
      'wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/49059/16/200/100',
    );
  });

  it('calcula las 7 capturas de forma variable y dinámica según la fecha de registro', async () => {
    const { matchWaybackCapturesToHorizons, VERIFIED_WAYBACK_CATALOG } =
      await import('@/services/geoEngineLiveClient');

    // Caso 1: Parcela registrada en Noviembre 2026
    const snaps2026 = matchWaybackCapturesToHorizons('2026-11-09T00:00:00Z');
    expect(snaps2026).toHaveLength(7);
    expect(new Set(snaps2026.map((s) => s.period_key)).size).toBe(7);
    expect(new Set(snaps2026.map((s) => s.captured_date_iso)).size).toBe(7);
    expect(new Set(snaps2026.map((s) => s.wayback_release)).size).toBe(7);
    expect(snaps2026[0].captured_date_iso).toBe('2026-10-29');

    // Para registro en 2026: hace 5 años (~2021) coincide con la Línea Base EUDR (15212, Dic 2020)
    const snap5y_2026 = snaps2026.find((s) => s.period_key === 'hace_5_anios');
    expect(snap5y_2026?.wayback_release).toBe('15212');

    // Caso 2: Parcela registrada en el futuro (p. ej. Noviembre 2027 con vuelo 2027 disponible)
    // Para registro en 2027: hace 5 años (~2022) NO es 15212 (2020), sino 4383 (2022)
    const catalog2027 = [
      {
        release: '60001',
        captureDate: '2027-10-20',
        sensor: 'Maxar WorldView-3',
        resolution: '0.30m HD',
      },
      ...VERIFIED_WAYBACK_CATALOG,
    ];
    const snaps2027 = matchWaybackCapturesToHorizons('2027-11-09T00:00:00Z', catalog2027);
    const snap5y_2027 = snaps2027.find((s) => s.period_key === 'hace_5_anios');
    expect(snap5y_2027?.wayback_release).not.toBe('15212');
    expect(snap5y_2027?.wayback_release).toBe('4383'); // Nov 2022
    expect(snap5y_2027?.captured_date_iso).toBe('2022-11-21');

    // Caso 3: Parcela registrada en el pasado (p. ej. Mayo 2024)
    // Para registro en 2024: hace 5 años (~2019) NO es 15212 (2020), sino 48376 (2019)
    const snaps2024 = matchWaybackCapturesToHorizons('2024-05-15T00:00:00Z');
    const snap5y_2024 = snaps2024.find((s) => s.period_key === 'hace_5_anios');
    expect(snap5y_2024?.wayback_release).not.toBe('15212');
    expect(snap5y_2024?.wayback_release).toBe('48376'); // Feb 2019
    expect(new Date(snaps2024[0].captured_date_iso).getFullYear()).toBeLessThanOrEqual(2024);
  });
});
