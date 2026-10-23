// Positions are metres; charges are coulombs. Point-charge values are undefined
// at the source position, so the scene must keep probes off each charge.
export const K = 8.9875517923e9;
export const EPSILON_0 = 1 / (4 * Math.PI * K);
export const NANOCOULOMB = 1e-9;

export function fieldAndPotential(point, charges) {
  const field = { x: 0, y: 0, z: 0 };
  let potential = 0;
  for (const { position, charge } of charges) {
    const dx = point.x - position.x;
    const dy = point.y - position.y;
    const dz = point.z - position.z;
    const r2 = dx * dx + dy * dy + dz * dz;
    if (r2 === 0) return { field: null, potential: null, magnitude: null };
    const r = Math.sqrt(r2);
    const strength = K * charge / (r2 * r);
    field.x += strength * dx;
    field.y += strength * dy;
    field.z += strength * dz;
    potential += K * charge / r;
  }
  return { field, potential, magnitude: Math.hypot(field.x, field.y, field.z) };
}

export function gaussianSphere(center, radius, charges) {
  if (!(radius > 0)) throw new RangeError('Gaussian radius must be positive');
  let enclosedCharge = 0;
  let boundaryCharge = false;
  for (const { position, charge } of charges) {
    const distance = Math.hypot(position.x - center.x, position.y - center.y, position.z - center.z);
    if (Math.abs(distance - radius) < 1e-9) boundaryCharge = true;
    else if (distance < radius) enclosedCharge += charge;
  }
  return {
    enclosedCharge: boundaryCharge ? null : enclosedCharge,
    flux: boundaryCharge ? null : enclosedCharge / EPSILON_0,
    boundaryCharge,
  };
}
