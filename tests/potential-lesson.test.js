import test from 'node:test';
import assert from 'node:assert/strict';
import { K, NANOCOULOMB } from '../src/physics.js';
import {
  createPotentialLesson, doubledDistanceComparison, equalDistanceComparison,
} from '../src/experiments/potential-lesson.js';

const reading = (distance, x, y = 0, z = 0) => ({
  physicalDistance: distance,
  exactPotential: K * NANOCOULOMB / distance,
  position: { x, y, z },
});
function pin(flow, measurement) {
  flow.observe(measurement, measurement.position);
  flow.pin();
}

test('comparison tolerances allow real hand placement and require distinct directions', () => {
  const a = { distance: 1, position: { x: 1, y: 0, z: 0 } };
  const b = { distance: 1.04, position: { x: 0, y: 0, z: 1.04 } };
  assert.equal(equalDistanceComparison(a, b).equalRadius, true);
  assert.equal(equalDistanceComparison(a, b).separated, true);
  assert.equal(equalDistanceComparison(a, { distance: 1.3, position: b.position }).equalRadius, false);
  assert.equal(equalDistanceComparison(a, { distance: 1.02, position: { x: 1.02, y: 0, z: 0 } }).separated, false);
  const doubled = doubledDistanceComparison({ distance: 1.4 }, { distance: 0.7 });
  assert.equal(doubled.approximatelyDouble, true);
  assert.equal(doubled.ratio, 2);
});

test('distance investigation saves two readings, supports retry, and reveals Coulomb relation afterward', () => {
  const flow = createPotentialLesson();
  assert.equal(flow.view().step, 0);
  assert.deepEqual(flow.presentation().shells, [false, false, false]);
  assert.equal(flow.presentation().boundary, false);
  pin(flow, reading(0.7, 0.7));
  assert.equal(flow.view().step, 1);
  assert.equal(flow.view().samples.length, 1);
  flow.choosePrediction('same');
  pin(flow, reading(0.74, 0.74));
  assert.equal(flow.view().samples.length, 1);
  assert.match(flow.view().status, /distances are close/);
  pin(flow, reading(1.4, 1.4));
  assert.equal(flow.view().distanceCompared, true);
  assert.equal(flow.view().samples[1].potential, flow.view().samples[0].potential / 2);
  assert.match(flow.view().status, /prediction/);
  assert.equal(flow.view().equationVisible, false);
  flow.next();
  flow.toggleExplain();
  assert.equal(flow.view().equationVisible, true);
  assert.match(flow.view().explanation, /vacuum permittivity/);
  assert.match(flow.view().explanation, /Coulomb’s 1\/d law/);
  flow.toggleDistance();
  assert.equal(flow.presentation().distance, true);
});

test('symmetry investigation compares three directions before the surfaces appear', () => {
  const flow = createPotentialLesson();
  flow.next(); flow.next(); flow.next();
  assert.equal(flow.view().step, 3);
  flow.choosePrediction('change');
  pin(flow, reading(0.9, 0.9));
  pin(flow, reading(1.2, 0, 0, 1.2));
  assert.equal(flow.view().samples.length, 1);
  pin(flow, reading(0.93, 0, 0, 0.93));
  pin(flow, reading(0.92, -0.92));
  assert.equal(flow.view().symmetryCompared, true);
  assert.equal(flow.view().samples.length, 3);
  assert.deepEqual(flow.presentation().shells, [true, true, true]);
  assert.deepEqual(flow.presentation().shellRadii, [0.9, 1.575, 2.25]);
  flow.next();
  flow.toggleExplain();
  assert.equal(flow.view().equationVisible, true);
  assert.match(flow.view().explanation, /same scalar value/);
  assert.match(flow.view().explanation, /electric field lines/);
});

test('next and repeat remain available without revealing geometry prematurely', () => {
  const flow = createPotentialLesson();
  flow.next(); flow.next();
  flow.toggleExplain();
  assert.equal(flow.view().equationVisible, false);
  flow.next();
  assert.deepEqual(flow.presentation().shells, [false, false, false]);
  flow.repeat();
  assert.equal(flow.view().step, 3);
  assert.deepEqual(flow.presentation().shells, [false, false, false]);
  flow.next();
  assert.equal(flow.view().step, 4);
});

test('free exploration controls each surface without changing guided evidence or the simulation', () => {
  const flow = createPotentialLesson();
  flow.setMode('free');
  flow.toggleFreeShell(0);
  flow.toggleFreeShell(2);
  flow.toggleDistance();
  flow.toggleExplain();
  assert.deepEqual(flow.presentation().shells, [true, false, true]);
  assert.equal(flow.presentation().distance, true);
  assert.equal(flow.view().equationVisible, true);
  flow.setMode('guided');
  assert.deepEqual(flow.presentation().shells, [false, false, false]);
  flow.setMode('free');
  assert.deepEqual(flow.presentation().shells, [true, false, true]);
});
