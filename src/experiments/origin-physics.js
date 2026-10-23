import { K } from '../physics.js';

export function legendre(n, x) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('Legendre order must be a nonnegative integer');
  if (n === 0) return 1;
  if (n === 1) return x;
  let previous = 1;
  let current = x;
  for (let order = 2; order <= n; order++) {
    const next = ((2 * order - 1) * x * current - (order - 1) * previous) / order;
    previous = current;
    current = next;
  }
  return current;
}

// The chosen origin slides only along the point charge's vertical (z) axis.
// Three.js world y represents the lesson's z coordinate; this preserves axial
// symmetry and therefore the guide's Legendre-moment formula.
export function pointChargeExpansion({ charge, source, origin, observation, order = 3 }) {
  if (!Number.isInteger(order) || order < 0) throw new RangeError('Expansion order must be nonnegative');
  if (Math.hypot(source.x - origin.x, source.z - origin.z) > 1e-9) {
    throw new RangeError('Source and origin must share the symmetry axis');
  }
  const sourceZ = source.y - origin.y;
  const sourceRadius = Math.abs(sourceZ);
  const observationVector = {
    x: observation.x - origin.x,
    y: observation.y - origin.y,
    z: observation.z - origin.z,
  };
  const r = Math.hypot(observationVector.x, observationVector.y, observationVector.z);
  const physicalDistance = Math.hypot(
    observation.x - source.x,
    observation.y - source.y,
    observation.z - source.z,
  );
  const exactPotential = physicalDistance === 0 ? null : K * charge / physicalDistance;
  const exterior = r > sourceRadius + 1e-9;
  const cosine = r === 0 ? null : observationVector.y / r;
  const moments = Array.from({ length: order + 1 }, (_, n) => charge * sourceZ ** n);
  const contributions = exterior
    ? moments.map((moment, n) => K * moment * legendre(n, cosine) / r ** (n + 1))
    : null;
  return {
    sourceVector: { x: 0, y: sourceZ, z: 0 },
    observationVector,
    r,
    sourceRadius,
    physicalDistance,
    exactPotential,
    exterior,
    moments,
    contributions,
    truncatedPotential: contributions?.reduce((sum, term) => sum + term, 0) ?? null,
  };
}
