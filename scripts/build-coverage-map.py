"""Build the offline vector map, not a trace of a raster screenshot.

Generation only: Python 3, pyproj 3.8.0 and shapely 2.2.0.
Run: python scripts/build-coverage-map.py
Natural Earth sources are pinned and cached outside the checkout. Neither these
packages nor the source datasets are needed to build or run the Next.js site.
"""

import json
import math
from pathlib import Path
import tempfile
from urllib.request import urlopen

from pyproj import Geod, Transformer
from shapely import line_merge, segmentize, transform, union_all
from shapely.geometry import box, shape

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/img/pages'
REVISION = 'ca96624a56bd078437bca8184e78163e5039ad19'
SOURCE = f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{REVISION}/geojson'
CACHE = Path(tempfile.gettempdir()) / 'site-av4-natural-earth' / REVISION
LONGITUDE, LATITUDE = 44.006516, 56.326797
WIDTH, HEIGHT = 568, 186
CENTER_X, CENTER_Y = 400, 96
PIXELS_PER_KM = 0.17
RADIUS_KM, INNER_RADIUS_KM = 500, 250
# Extra city centres from Natural Earth's populated-places dataset at REVISION.
# Kirov is the regional capital, not the city of the same name in Kaluga.
CITIES = [('Москва', 37.6173, 55.7558), ('Казань', 49.1064, 55.7961),
          ('Ярославль', 39.870011, 57.619983), ('Вологда', 39.919982, 59.209989),
          ('Киров', 49.669981, 58.590053), ('Калуга', 36.270024, 54.520379),
          ('Курск', 36.190028, 51.73998), ('Смоленск', 32.047336, 54.782688),
          ('Санкт-Петербург', 30.314074, 59.94096)]
PROJECTION = f'+proj=aeqd +lat_0={LATITUDE} +lon_0={LONGITUDE} +datum=WGS84 +units=m +no_defs'
PROJECT = Transformer.from_crs('EPSG:4326', PROJECTION, always_xy=True)
GEOD = Geod(ellps='WGS84')
# Extend the source vertically for the compact crop, without distorting the map.
EXTENT_Y, EXTENT_HEIGHT = -80, HEIGHT + 160
FRAME = box(0, EXTENT_Y, WIDTH, EXTENT_Y + EXTENT_HEIGHT)
# Exclude the opposite hemisphere before projection; includes the whole frame.
GEOGRAPHIC_FRAME = box(-70, 20, 100, 85)


def project(longitude, latitude, z=None):
    east, north = PROJECT.transform(longitude, latitude)
    return CENTER_X + east * PIXELS_PER_KM / 1000, CENTER_Y - north * PIXELS_PER_KM / 1000


def coordinates(points):
    return ' '.join(f'{x:.1f},{y:.1f}' for x, y in points)


def city_label(name, compact=False):
    # Offsets affect text only: geographic city markers are never shifted.
    if name == 'Курск':
        return {'x': 8, 'y': -6, 'align': 'right'}
    if name == 'Смоленск':
        return {'x': -20 if compact else -8, 'y': -6 if compact else 4,
                'align': 'right' if compact else 'left'}
    if name == 'Ярославль':
        return {'x': -8, 'y': 4, 'align': 'left'}
    return {'x': 8, 'y': 4, 'align': 'right'}


def paths(geometry):
    if geometry.is_empty:
        return []
    if geometry.geom_type == 'Polygon':
        rings = [geometry.exterior, *geometry.interiors]
        return [' '.join(f'M{coordinates(ring.coords)}Z' for ring in rings)]
    if geometry.geom_type in ('LineString', 'LinearRing'):
        return [f'M{coordinates(geometry.coords)}']
    if hasattr(geometry, 'geoms'):
        return [path for part in geometry.geoms for path in paths(part)]
    return []


def layer(dataset, attributes):
    file = CACHE / f'{dataset}.geojson'
    if not file.exists():
        print(f'Downloading {dataset}', flush=True)
        with urlopen(f'{SOURCE}/{dataset}.geojson', timeout=60) as response:
            file.write_bytes(response.read())
    features = json.loads(file.read_text(encoding='utf-8'))['features']
    geometries = []
    for feature in features:
        if feature['geometry'] is None:
            continue
        geographic = shape(feature['geometry'])
        if not geographic.intersects(GEOGRAPHIC_FRAME):
            continue
        geographic = geographic.intersection(GEOGRAPHIC_FRAME)
        # Densification preserves curved parallels/meridians in this projection.
        projected = transform(segmentize(geographic, 0.25), project, interleaved=False)
        if not projected.intersects(FRAME):
            continue
        geometries.append(projected.intersection(FRAME))
    # Join contiguous source segments before simplification, rather than shipping
    # thousands of separate two-point paths that draw the same boundary.
    merged = union_all(geometries, grid_size=0.1)
    if merged.geom_type in ('LineString', 'MultiLineString'):
        merged = line_merge(merged)
    merged = merged.simplify(0.2, preserve_topology=True)
    output = [f'    <path d="{path}"/>' for path in paths(merged)]
    print(f'{dataset}: {len(output)} vector paths', flush=True)
    return f'  <g {attributes}>\n' + '\n'.join(output) + '\n  </g>'


def verify():
    assert project(LONGITUDE, LATITUDE) == (CENTER_X, CENTER_Y)
    # Independent geodesic endpoints must land on the outer SVG circle.
    for radius in (INNER_RADIUS_KM, RADIUS_KM, 1000):
        for bearing in range(0, 360, 5):
            lon, lat, _ = GEOD.fwd(LONGITUDE, LATITUDE, bearing, radius * 1000)
            x, y = project(lon, lat)
            assert abs(math.hypot(x - CENTER_X, y - CENTER_Y) - radius * PIXELS_PER_KM) < 1e-7
    cities = {'Moscow': (37.6173, 55.7558), 'Kazan': (49.1064, 55.7961),
              'Saint Petersburg': (30.3158, 59.9391), 'Perm': (56.2502, 58.0105),
              'Rostov-on-Don': (39.7015, 47.2357)}
    for name, (lon, lat) in cities.items():
        _, _, metres = GEOD.inv(LONGITUDE, LATITUDE, lon, lat)
        x, y = project(lon, lat)
        assert abs(math.hypot(x - CENTER_X, y - CENTER_Y) / PIXELS_PER_KM - metres / 1000) < 1e-6
        print(f'{name}: {metres / 1000:.1f} km, inside = {metres <= RADIUS_KM * 1000}')


if __name__ == '__main__':
    verify()
    CACHE.mkdir(parents=True, exist_ok=True)
    layers = [
        layer('ne_50m_land', 'fill="#e8eaec" stroke="#d3d8dd" stroke-width="0.4" fill-rule="evenodd"'),
        layer('ne_50m_admin_1_states_provinces_lines', 'fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="0.55"'),
        layer('ne_50m_admin_0_boundary_lines_land', 'fill="none" stroke="#fff" stroke-width="0.8"'),
        layer('ne_50m_lakes', 'fill="#adb4bb" fill-rule="evenodd"'),
        layer('ne_50m_rivers_lake_centerlines', 'fill="none" stroke="#adb4bb" stroke-width="0.65" stroke-linecap="round" stroke-linejoin="round"'),
    ]
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{EXTENT_HEIGHT}" viewBox="0 {EXTENT_Y} {WIDTH} {EXTENT_HEIGHT}">
  <title>Map centered on Nizhny Novgorod</title>
  <desc>Natural Earth public-domain vector geodata. WGS84 azimuthal equidistant projection centered at {LATITUDE}, {LONGITUDE}; {PIXELS_PER_KM} SVG units per kilometre. Generated by scripts/build-coverage-map.py.</desc>
  <rect y="{EXTENT_Y}" width="{WIDTH}" height="{EXTENT_HEIGHT}" fill="#adb4bb"/>
{chr(10).join(layers)}
</svg>
'''
    assert '<image' not in svg and 'base64' not in svg
    (OUTPUT / 'about-coverage-map.svg').write_text(svg, encoding='utf-8')
    metadata = {
        'city': 'Нижний Новгород',
        'coordinates': {'longitude': LONGITUDE, 'latitude': LATITUDE},
        'pixel': {'x': CENTER_X, 'y': CENTER_Y},
        'viewport': {'width': WIDTH, 'height': HEIGHT},
        'extent': {'x': 0, 'y': EXTENT_Y, 'width': WIDTH, 'height': EXTENT_HEIGHT},
        'contextRadiusKm': 1000,
        'radiusKm': RADIUS_KM, 'innerRadiusKm': INNER_RADIUS_KM,
        'pixelsPerKm': PIXELS_PER_KM, 'projection': PROJECTION,
        'cities': [
            {'name': name, 'coordinates': {'longitude': lon, 'latitude': lat},
             'pixel': dict(zip(('x', 'y'), project(lon, lat))),
             'label': city_label(name), 'compactLabel': city_label(name, compact=True)}
            for name, lon, lat in CITIES
        ],
        'source': {'name': 'Natural Earth', 'url': 'https://www.naturalearthdata.com/',
                   'revision': REVISION, 'license': 'Public domain'},
    }
    (OUTPUT / 'about-coverage-map.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'SVG: {len(svg.encode())} bytes; no raster images or runtime API requests.')
