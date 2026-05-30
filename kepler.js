// ============================================================
// kepler.js — Orbital mechanics engine
// Implements Keplerian orbital elements from NASA/JPL tables
// Valid approximately 1800 AD – 2050 AD
// Reference: https://ssd.jpl.nasa.gov/planets/approx_pos.html
// ============================================================

// Convert degrees to radians
function deg2rad(d) { return d * Math.PI / 180.0; }

// Normalize angle to [-180, 180]
function normalizeDeg(d) {
  d = d % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

// ============================================================
// Keplerian elements for each planet at J2000.0 (Jan 1.5 2000)
// and their rates of change per century (Cy)
// Format: [a0, adot, e0, edot, I0, Idot, L0, Ldot, w0, wdot, Om0, Omdot]
//   a   = semi-major axis (AU)
//   e   = eccentricity
//   I   = inclination (deg)
//   L   = mean longitude (deg)
//   w   = longitude of perihelion (deg)
//   Om  = longitude of ascending node (deg)
// ============================================================
const KEPLER_ELEMENTS = {
  mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906,
            7.00497902, -0.00594749, 252.25032350, 149472.67411175,
            77.45779628, 0.16047689, 48.33076593, -0.12534081],

  venus:   [0.72333566, 0.00000390, 0.00677672, -0.00004107,
            3.39467605, -0.00078890, 181.97909950, 58517.81538729,
            131.60246718, 0.00268329, 76.67984255, -0.27769418],

  earth:   [1.00000261, 0.00000562, 0.01671123, -0.00004392,
            -0.00001531, -0.01294668, 100.46457166, 35999.37244981,
            102.93768193, 0.32327364, 0.0, 0.0],

  mars:    [1.52371034, 0.00001847, 0.09339410, 0.00007882,
            1.84969142, -0.00813131, -4.55343205, 19140.30268499,
            -23.94362959, 0.44441088, 49.55953891, -0.29257343],

  jupiter: [5.20288700, -0.00011607, 0.04838624, -0.00013253,
            1.30439695, -0.00183714, 34.39644051, 3034.74612775,
            14.72847983, 0.21252668, 100.47390909, 0.20469106],

  saturn:  [9.53667594, -0.00125060, 0.05386179, -0.00050991,
            2.48599187, 0.00193609, 49.95424423, 1222.49362201,
            92.59887831, -0.41897216, 113.66242448, -0.28867794],

  uranus:  [19.18916464, -0.00196176, 0.04725744, -0.00004397,
            0.77263783, -0.00242939, 313.23810451, 428.48202785,
            170.95427630, 0.40805281, 74.01692503, 0.04240589],

  neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105,
            1.77004347, 0.00035372, -55.12002969, 218.45945325,
            44.96476227, -0.32241464, 131.78422574, -0.00508664],
};

// Planet name order matching PLANET_DATA in fp.js
const PLANET_NAMES = [
  "mercury", "venus", "earth", "mars",
  "jupiter", "saturn", "uranus", "neptune"
];

// ============================================================
// Compute Julian Date from a JS Date object
// ============================================================
function toJulianDate(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  let A, B;
  let yr = y, mo = m;
  if (mo <= 2) { yr -= 1; mo += 12; }
  A = Math.floor(yr / 100);
  B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yr + 4716)) +
         Math.floor(30.6001 * (mo + 1)) +
         d + B - 1524.5;
}

// ============================================================
// Compute J2000 centuries from a JS Date
// ============================================================
function toJ2000Centuries(date) {
  const JD = toJulianDate(date);
  const J2000 = 2451545.0; // Julian date of Jan 1.5 2000
  return (JD - J2000) / 36525.0; // centuries
}

// ============================================================
// Solve Kepler's equation: M = E - e*sin(E)
// Using Newton-Raphson iteration
// M = mean anomaly (rad), e = eccentricity
// Returns eccentric anomaly E (rad)
// ============================================================
function solveKeplerEquation(M, e) {
  let E = M; // initial guess
  const tolerance = 1e-6;
  for (let i = 0; i < 100; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

// ============================================================
// Compute heliocentric ecliptic coordinates (AU) for a planet
// at a given J2000 century T
// Returns { x, y, z } in AU, ecliptic plane
// ============================================================
function computePlanetPosition(planetName, T) {
  const el = KEPLER_ELEMENTS[planetName];
  if (!el) return { x: 0, y: 0, z: 0 };

  // Compute current orbital elements
  const a  = el[0] + el[1] * T;   // semi-major axis (AU)
  const e  = el[2] + el[3] * T;   // eccentricity
  const I  = el[4] + el[5] * T;   // inclination (deg)
  const L  = el[6] + el[7] * T;   // mean longitude (deg)
  const w  = el[8] + el[9] * T;   // longitude of perihelion (deg)
  const Om = el[10] + el[11] * T; // longitude of ascending node (deg)

  // Argument of perihelion
  const omega = normalizeDeg(w - Om);

  // Mean anomaly
  let M = normalizeDeg(L - w);
  const M_rad = deg2rad(M);

  // Solve Kepler's equation for eccentric anomaly
  const E = solveKeplerEquation(M_rad, e);

  // Heliocentric coordinates in orbital plane
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate to ecliptic coordinates
  const omega_r = deg2rad(omega);
  const Om_r    = deg2rad(Om);
  const I_r     = deg2rad(I);

  const cosOm = Math.cos(Om_r), sinOm = Math.sin(Om_r);
  const cosI  = Math.cos(I_r),  sinI  = Math.sin(I_r);
  const cosw  = Math.cos(omega_r), sinw = Math.sin(omega_r);

  const x = (cosOm * cosw - sinOm * sinw * cosI) * xp +
            (-cosOm * sinw - sinOm * cosw * cosI) * yp;
  const y = (sinOm * cosw + cosOm * sinw * cosI) * xp +
            (-sinOm * sinw + cosOm * cosw * cosI) * yp;
  const z = (sinw * sinI) * xp + (cosw * sinI) * yp;

  return { x, y, z };
}

// ============================================================
// Get real positions of all planets for a given JS Date
// Returns array of { x, z } scaled for our scene
// ============================================================
function getRealPlanetPositions(date) {
  const T = toJ2000Centuries(date);
  
  // Real semi-major axes in AU for each planet
  const realAU = [0.387, 0.723, 1.000, 1.524, 5.203, 9.537, 19.19, 30.07];

  return PLANET_NAMES.map((name, i) => {
    const pos = computePlanetPosition(name, T);
    // Scale: map real AU distance to sim r value
    const simR = PLANET_DATA[i].r;
    const scale = simR / realAU[i];
    return {
      x: pos.x * scale,
      z: pos.y * scale  // ecliptic y becomes our scene z
    };
  });
}

// ============================================================
// Format a JS Date as a readable sim date string
// ============================================================
function formatSimDate(date) {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN",
                  "JUL","AUG","SEP","OCT","NOV","DEC"];
  const y = date.getUTCFullYear();
  const m = months[date.getUTCMonth()];
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${d} ${m} ${y}`;
}

// ============================================================
// Compute day-of-year
// ============================================================
function getDayOfYear(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date - start;
  return Math.floor(diff / 86400000);
}