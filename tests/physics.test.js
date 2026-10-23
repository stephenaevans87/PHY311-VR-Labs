import test from 'node:test';
import assert from 'node:assert/strict';
import { EPSILON_0, K, NANOCOULOMB, fieldAndPotential, gaussianSphere } from '../src/physics.js';

const close = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} ≠ ${expected}`);

test('one positive point charge follows inverse-square field and inverse-distance potential', () => {
  const result = fieldAndPotential({ x: 2, y: 0, z: 0 }, [{ position: { x: 0, y: 0, z: 0 }, charge: NANOCOULOMB }]);
  close(result.potential, K * NANOCOULOMB / 2);
  close(result.field.x, K * NANOCOULOMB / 4);
  close(result.field.y, 0);
  close(result.magnitude, K * NANOCOULOMB / 4);
});

test('opposite charges superpose: midplane potential cancels while field adds', () => {
  const charges = [
    { position: { x: -1, y: 0, z: 0 }, charge: NANOCOULOMB },
    { position: { x: 1, y: 0, z: 0 }, charge: -NANOCOULOMB },
  ];
  const result = fieldAndPotential({ x: 0, y: 0, z: 0 }, charges);
  close(result.potential, 0);
  close(result.field.x, 2 * K * NANOCOULOMB);
  close(result.field.y, 0);
});

test('singularity is reported instead of softened', () => {
  assert.equal(fieldAndPotential({ x: 0, y: 0, z: 0 }, [{ position: { x: 0, y: 0, z: 0 }, charge: NANOCOULOMB }]).potential, null);
});

test('sphere flux follows enclosed charge and ignores external charges', () => {
  const charges = [
    { position: { x: 0, y: 0, z: 0 }, charge: NANOCOULOMB },
    { position: { x: 2, y: 0, z: 0 }, charge: -NANOCOULOMB },
  ];
  const result = gaussianSphere({ x: 0, y: 0, z: 0 }, 1, charges);
  close(result.enclosedCharge, NANOCOULOMB, 1e-15);
  close(result.flux, NANOCOULOMB / EPSILON_0);
  const both = gaussianSphere({ x: 1, y: 0, z: 0 }, 1.1, charges);
  close(both.flux, 0);
});

test('charge on Gaussian boundary has undefined flux', () => {
  const result = gaussianSphere({ x: 0, y: 0, z: 0 }, 1, [{ position: { x: 1, y: 0, z: 0 }, charge: NANOCOULOMB }]);
  assert.equal(result.boundaryCharge, true);
  assert.equal(result.flux, null);
});
