import test from 'node:test';
import assert from 'node:assert/strict';
import { createOriginLesson } from '../src/experiments/origin-lesson.js';
import { pointChargeExpansion } from '../src/experiments/origin-physics.js';
import { NANOCOULOMB } from '../src/physics.js';

const source = { x: 0, y: 1.43, z: 0 };
const tip = { x: 0.72, y: 1.48, z: 0.12 };
function sample(originY) {
  const origin = { x: 0, y: originY, z: 0 };
  return { origin, result: pointChargeExpansion({ charge: NANOCOULOMB,
    source, origin, observation: tip }) };
}

test('predict, experiment, observe, explain, apply remain open to retries and optional predictions', () => {
  const lesson = createOriginLesson();
  const first = sample(1.05);
  lesson.observe(first.result, source, tip, first.origin);
  assert.equal(lesson.view().step, 0);
  assert.deepEqual(lesson.view().predictionOptions.map((choice) => choice.value), ['same', 'change']);
  lesson.choosePrediction('change');
  lesson.next();
  const shifted = sample(0.92);
  lesson.observe(shifted.result, source, tip, shifted.origin);
  assert.equal(lesson.view().moved, true);
  assert.equal(first.result.exactPotential, shifted.result.exactPotential);
  assert.notDeepEqual(first.result.moments, shifted.result.moments);
  lesson.next();
  assert.equal(lesson.view().step, 2);
  assert.equal(lesson.presentation().moments, true);
  lesson.next();
  lesson.toggleExplain();
  assert.match(lesson.view().explanation, /not separate physical fields/);
  lesson.next();
  lesson.choosePrediction('higher');
  const centered = sample(source.y);
  lesson.observe(centered.result, source, tip, centered.origin);
  assert.equal(lesson.view().centered, true);
  assert.match(lesson.view().status, /Q₁, Q₂, Q₃ vanish/);
  assert.deepEqual(centered.result.moments, [NANOCOULOMB, 0, 0, 0]);
  lesson.repeat();
  assert.equal(lesson.view().step, 0);
  lesson.setMode('free');
  assert.equal(lesson.view().predictionOptions.length, 0);
  assert.equal(lesson.presentation().moments, true);
});

test('origin shift changes moments and exterior terms while the exact probe potential stays fixed', () => {
  const below = sample(1.05).result;
  const above = sample(1.65).result;
  assert.equal(below.exactPotential, above.exactPotential);
  assert.equal(below.moments[0], NANOCOULOMB);
  assert.ok(below.moments[1] > 0 && above.moments[1] < 0);
  assert.ok(below.moments[2] > 0 && above.moments[2] > 0);
  assert.ok(below.moments[3] > 0 && above.moments[3] < 0);
  assert.notDeepEqual(below.contributions, above.contributions);
  assert.equal(below.contributions.length, 4);
  assert.equal(below.truncatedPotential, below.contributions.reduce((a, b) => a + b));
});

test('the exterior boundary follows O and withholds only the series', () => {
  const origin = { x: 0, y: 1.05, z: 0 };
  const observation = { x: 0.1, y: 1.05, z: 0 };
  const result = pointChargeExpansion({ charge: NANOCOULOMB, source, origin, observation });
  assert.equal(result.exterior, false);
  assert.ok(Math.abs(result.sourceRadius - 0.38) < 1e-12);
  assert.equal(result.contributions, null);
  assert.ok(Number.isFinite(result.exactPotential));
});

test('guidance distinguishes a moved physical probe from a changed coordinate origin', () => {
  const lesson = createOriginLesson();
  const initial = sample(1.05);
  lesson.observe(initial.result, source, tip, initial.origin);
  lesson.begin();
  const shiftedTip = { ...tip, x: tip.x + 0.2 };
  const movedProbe = pointChargeExpansion({ charge: NANOCOULOMB,
    source, origin: initial.origin, observation: shiftedTip });
  lesson.observe(movedProbe, source, shiftedTip, initial.origin);
  assert.equal(lesson.view().probeMoved, true);
  assert.match(lesson.view().status, /wand tip moved/i);
  lesson.repeat();
  assert.equal(lesson.view().probeMoved, false);
});
