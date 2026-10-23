import test from 'node:test';
import assert from 'node:assert/strict';
import { K, NANOCOULOMB } from '../src/physics.js';
import { legendre, pointChargeExpansion } from '../src/experiments/origin-physics.js';

const close = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} ≠ ${expected}`);
const source = { x: 0, y: 0, z: 0 };
const observation = { x: 0.4, y: 0.6, z: 0 };
const run = (origin, order = 3, probe = observation) => pointChargeExpansion({
  charge: NANOCOULOMB, source, origin, observation: probe, order,
});

test('moving only the origin changes moments but not exact physical potential', () => {
  const centered = run({ x: 0, y: 0, z: 0 });
  const shifted = run({ x: 0, y: -0.25, z: 0 });
  close(centered.exactPotential, shifted.exactPotential);
  close(centered.exactPotential, K * NANOCOULOMB / Math.hypot(0.4, 0.6));
  assert.deepEqual(centered.moments, [NANOCOULOMB, 0, 0, 0]);
  close(shifted.moments[0], NANOCOULOMB, 1e-15);
  close(shifted.moments[1], NANOCOULOMB * 0.25, 1e-15);
  close(shifted.moments[2], NANOCOULOMB * 0.25 ** 2, 1e-15);
  close(shifted.sourceRadius, 0.25);
  assert.notDeepEqual(centered.contributions, shifted.contributions);
});

test('signed source position changes odd moments and term contributions', () => {
  const below = run({ x: 0, y: -0.25, z: 0 });
  const above = run({ x: 0, y: 0.25, z: 0 });
  close(below.moments[1], -above.moments[1], 1e-15);
  close(below.moments[2], above.moments[2], 1e-15);
  close(below.contributions[0], K * NANOCOULOMB / below.r);
  close(below.contributions[1], K * below.moments[1] * (below.observationVector.y / below.r) / below.r ** 2);
  close(legendre(2, 0), -0.5);
});

test('far-field terms converge toward the unchanged exact value', () => {
  const shifted = run({ x: 0, y: -0.25, z: 0 }, 12);
  assert.equal(shifted.exterior, true);
  assert.ok(Math.abs(shifted.truncatedPotential - shifted.exactPotential) < 0.00001);
});

test('a point charge at the chosen origin has only a monopole potential term', () => {
  const centered = run(source, 6);
  assert.equal(centered.sourceRadius, 0);
  assert.equal(centered.exterior, true);
  assert.ok(centered.contributions.slice(1).every((term) => term === 0));
  close(centered.contributions[0], centered.exactPotential);
  close(centered.truncatedPotential, centered.exactPotential);
});

test('convergence boundary follows the origin; exact potential remains available inside', () => {
  const origin = { x: 0, y: -0.4, z: 0 };
  const inside = run(origin, 3, { x: 0.1, y: -0.4, z: 0 });
  const boundary = run(origin, 3, { x: 0.4, y: -0.4, z: 0 });
  const outside = run(origin, 3, { x: 0.5, y: -0.4, z: 0 });
  close(inside.sourceRadius, 0.4);
  assert.equal(inside.exterior, false);
  assert.equal(boundary.exterior, false);
  assert.equal(outside.exterior, true);
  assert.ok(Number.isFinite(inside.exactPotential));
  assert.equal(inside.contributions, null);
  assert.equal(inside.truncatedPotential, null);
});

test('point-charge singularity and broken axial setup are explicit', () => {
  assert.equal(run({ x: 0, y: -0.2, z: 0 }, 3, source).exactPotential, null);
  assert.throws(() => run({ x: 0.1, y: 0, z: 0 }), /symmetry axis/);
});
