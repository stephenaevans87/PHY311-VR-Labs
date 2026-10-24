import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { K, NANOCOULOMB } from '../src/physics.js';
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
  const tip = experiment.probeTip.getWorldPosition(new THREE.Vector3());
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
  assert.ok(experiment.probeTip.getWorldPosition(new THREE.Vector3()).equals(tip));
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
  experiment.probe.position.set(-experiment.probeTip.position.x, origin.y, 0.12);
  probeEntry.onMove();
  assert.equal(experiment.readout.exterior, false);
  assert.equal(experiment.readout.truncatedPotential, null);
  assert.ok(Number.isFinite(experiment.readout.exactPotential));
  assert.notEqual(experiment.readout.exactPotential, exactBefore);
  assert.ok(experiment.charge.position.equals(source));
  assert.ok(experiment.origin.position.equals(origin));
  probeEntry.onRelease();
  experiment.probe.position.set(0.72 - experiment.probeTip.position.x, 1.48, 0.12);
  probeEntry.onMove();
  assert.equal(experiment.readout.exterior, true);
  assert.ok(Number.isFinite(experiment.readout.truncatedPotential));
}));

test('three exact equipotential cutaways are source-centered spheres, separate from the origin boundary', () => withCanvas(() => {
  const experiment = createOriginExperiment(new THREE.Scene());
  assert.equal(experiment.equipotentials.length, 3);
  const radii = experiment.equipotentials.map((patch) => patch.userData.radius);
  assert.deepEqual(radii, [0.9, 1.6, 2.3]);
  for (const patch of experiment.equipotentials) {
    assert.equal(patch.userData.kind, 'physical-equipotential');
    assert.ok(patch.position.equals(experiment.charge.position));
    const { radius, potential, surface } = patch.userData;
    assert.ok(Math.abs(potential - K * NANOCOULOMB / radius) < 1e-12);
    assert.equal(surface.material.transparent, true);
    assert.ok(surface.material.opacity < 0.1);
    const positions = surface.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      assert.ok(Math.abs(Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i)) - radius) < 1e-6);
    }
  }
  const positions = experiment.equipotentials.map((patch) => patch.position.clone());
  experiment.origin.position.y -= 0.2;
  experiment.interactables[0].onMove();
  assert.equal(experiment.boundary.userData.kind, 'mathematical-convergence-boundary');
  assert.ok(experiment.boundary.position.equals(experiment.origin.position));
  experiment.equipotentials.forEach((patch, i) => assert.ok(patch.position.equals(positions[i])));
}));

test('wand tip controls the exact reading and origin grip stays on the polar axis in both modes', () => withCanvas(() => {
  const experiment = createOriginExperiment(new THREE.Scene());
  const [originEntry, probeEntry] = experiment.interactables;
  assert.equal(probeEntry.mesh, experiment.probeHandle);
  assert.equal(probeEntry.rotateWithController, true);
  const tip = experiment.probeTip.getWorldPosition(new THREE.Vector3());
  const charge = experiment.charge.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(experiment.readout.physicalDistance - tip.distanceTo(charge)) < 1e-9);
  const exact = experiment.readout.exactPotential;
  experiment.probe.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  probeEntry.onMove();
  assert.notEqual(experiment.readout.exactPotential, exact);
  experiment.setMode('free');
  experiment.origin.position.set(0.3, 2.5, -0.2);
  originEntry.constrain();
  originEntry.onMove();
  assert.equal(experiment.origin.position.x, experiment.charge.position.x);
  assert.equal(experiment.origin.position.z, experiment.charge.position.z);
  assert.equal(experiment.origin.position.y, 1.87);
  assert.ok(Number.isFinite(experiment.readout.exactPotential));
  assert.equal(experiment.mode, 'free');
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

test('Phase 1 presentation hides later geometry while preserving tip measurement and both grips', () => withCanvas(() => {
  const experiment = createOriginExperiment(new THREE.Scene());
  experiment.setPresentation({ shells: [false, false, false], distance: false,
    boundary: false, vectors: false, terms: false });
  assert.deepEqual(experiment.equipotentials.map((shell) => shell.visible), [false, false, false]);
  assert.equal(experiment.boundary.visible, false);
  assert.equal(experiment.physicalDistanceLine.visible, false);
  const exact = experiment.readout.exactPotential;
  const [originEntry, probeEntry] = experiment.interactables;
  originEntry.onGrab();
  experiment.origin.position.y += 0.1;
  originEntry.onMove();
  assert.equal(experiment.readout.exactPotential, exact);
  assert.equal(experiment.sourceVector.visible, false);
  assert.equal(experiment.observationVector.visible, false);
  probeEntry.onGrab();
  experiment.probe.position.x += 0.2;
  probeEntry.onMove();
  assert.notEqual(experiment.readout.exactPotential, exact);
  experiment.setPresentation({ shells: [true, false, true], distance: true,
    boundary: false, vectors: false, terms: false });
  assert.deepEqual(experiment.equipotentials.map((shell) => shell.visible), [true, false, true]);
  assert.equal(experiment.physicalDistanceLine.visible, true);
  assert.equal(experiment.boundary.visible, false);
  experiment.setMode('free');
  assert.equal(experiment.interactables[0].object, experiment.origin);
  assert.equal(experiment.interactables[1].object, experiment.probe);
}));

test('pinned measurements stay in place and the nearest revealed sphere is emphasized', () => withCanvas(() => {
  const experiment = createOriginExperiment(new THREE.Scene());
  const tip = experiment.probeTip.getWorldPosition(new THREE.Vector3());
  const localTip = experiment.root.worldToLocal(tip.clone());
  const sample = { distance: experiment.readout.physicalDistance,
    potential: experiment.readout.exactPotential,
    position: { x: localTip.x, y: localTip.y, z: localTip.z } };
  experiment.setPresentation({ shells: [true, true, true], distance: true,
    boundary: false, vectors: false, terms: false, samples: [sample],
    shellRadii: [sample.distance, sample.distance * 1.75, sample.distance * 2.5] });
  assert.equal(experiment.savedMarkers[0].visible, true);
  assert.equal(experiment.savedMarkers[1].visible, false);
  assert.ok(experiment.savedMarkers[0].position.distanceTo(localTip) < 1e-9);
  assert.ok(experiment.equipotentials[0].userData.surface.material.opacity
    > experiment.equipotentials[1].userData.surface.material.opacity);
  assert.ok(Math.abs(experiment.equipotentials[0].userData.radius - sample.distance) < 1e-12);
  assert.ok(Math.abs(experiment.equipotentials[0].userData.potential
    - K * NANOCOULOMB / sample.distance) < 1e-12);
  assert.ok(Math.abs(experiment.equipotentials[0].scale.x * 0.9 - sample.distance) < 1e-12);
  experiment.probe.position.x += 0.25;
  experiment.interactables[1].onMove();
  assert.ok(experiment.savedMarkers[0].position.distanceTo(localTip) < 1e-9);
  assert.equal(experiment.boundary.visible, false);
}));
