import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createOriginExperiment } from '../src/experiments/origin-experiment.js';

function withCanvas(run) {
  const previous = globalThis.document;
  const context = { clearRect() {}, fillRect() {}, fillText() {} };
  globalThis.document = { createElement: (tag) => tag === 'canvas'
    ? { width: 0, height: 0, getContext: () => context }
    : null };
  try { run(); } finally { globalThis.document = previous; }
}

test('origin and probe are immediately interactive; the fixed charge is never an interactable', () => withCanvas(() => {
  const experiment = createOriginExperiment(new THREE.Scene());
  const [originEntry, probeEntry] = experiment.interactables;
  assert.equal(originEntry.object, experiment.origin);
  assert.equal(probeEntry.object, experiment.probe);
  assert.equal(experiment.interactables.filter((entry) => entry.object === experiment.origin).length, 4);
  assert.equal(experiment.interactables.some((entry) => entry.object === experiment.charge), false);
  assert.equal(experiment.mathRevealed, false);
  assert.equal(experiment.sourceVector.visible, false);
  assert.equal(experiment.observationVector.visible, false);

  const source = experiment.charge.position.clone();
  const probe = experiment.probe.position.clone();
  const exact = experiment.readout.exactPotential;
  const moment = experiment.readout.moments[1];
  originEntry.onHover(true);
  assert.equal(experiment.mathRevealed, true);
  assert.equal(experiment.sourceVector.visible, true);
  assert.equal(experiment.observationVector.visible, true);
  experiment.origin.position.y += 0.20;
  originEntry.onMove();
  assert.equal(experiment.readout.exactPotential, exact);
  assert.notEqual(experiment.readout.moments[1], moment);
  assert.equal(experiment.boundary.position.y, experiment.origin.position.y);
  assert.equal(experiment.boundary.scale.x, experiment.readout.sourceRadius);
  assert.ok(experiment.charge.position.equals(source));
  assert.ok(experiment.probe.position.equals(probe));
  originEntry.onHover(false);
  assert.equal(experiment.sourceVector.visible, false);
  assert.equal(experiment.observationVector.visible, false);
}));

test('probe can move first and cross the convergence boundary with exact voltage still available', () => withCanvas(() => {
  const experiment = createOriginExperiment(new THREE.Scene());
  const [, probeEntry] = experiment.interactables;
  const source = experiment.charge.position.clone();
  const origin = experiment.origin.position.clone();
  const exactBefore = experiment.readout.exactPotential;
  probeEntry.onGrab();
  experiment.probe.position.set(0, origin.y, 0.12);
  probeEntry.onMove();
  assert.equal(experiment.readout.exterior, false);
  assert.equal(experiment.readout.truncatedPotential, null);
  assert.ok(Number.isFinite(experiment.readout.exactPotential));
  assert.notEqual(experiment.readout.exactPotential, exactBefore);
  assert.ok(experiment.charge.position.equals(source));
  assert.ok(experiment.origin.position.equals(origin));
  probeEntry.onRelease();
  experiment.probe.position.set(0.72, 1.48, 0.12);
  probeEntry.onMove();
  assert.equal(experiment.readout.exterior, true);
  assert.ok(Number.isFinite(experiment.readout.truncatedPotential));
}));

test('guided and free modes share physics and never gate manipulation; prediction is optional', () => withCanvas(() => {
  const experiment = createOriginExperiment(new THREE.Scene());
  const initial = experiment.readout.exactPotential;
  experiment.recordPrediction('changes');
  assert.equal(experiment.readout.exactPotential, initial);
  assert.equal(experiment.mathRevealed, false);
  experiment.setMode('free');
  assert.equal(experiment.mode, 'free');
  const [originEntry, probeEntry] = experiment.interactables;
  originEntry.onGrab();
  experiment.origin.position.y += 0.1;
  originEntry.onMove();
  assert.equal(experiment.readout.exactPotential, initial);
  probeEntry.onGrab();
  experiment.probe.position.x -= 0.2;
  probeEntry.onMove();
  assert.notEqual(experiment.readout.exactPotential, initial);
  experiment.reset();
  assert.equal(experiment.mode, 'free');
  assert.equal(experiment.mathRevealed, false);
  assert.equal(experiment.readout.exactPotential, initial);
}));
