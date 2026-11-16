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
});
