import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createVrControls, createVrLessonControls, GUIDE_HOME } from '../src/vr-controls.js';
import { pickRayTarget, preservedLocalGrabOffset, worldFromGrabOffset, worldToParentPoint } from '../src/interactions.js';

function withCanvas(run) {
  const previous = globalThis.document;
  const context = { fillRect() {}, strokeRect() {}, fillText() {},
    measureText(text) { return { width: text.length * 23 }; } };
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  try { run(); } finally { globalThis.document = previous; }
}

function lesson(scene) {
  return createVrLessonControls(scene, {
    repeat() {}, next() {}, explain() {}, pin() {}, predict() {}, shell() {}, distance() {},
  });
}

test('VR guide is placed beside the apparatus in world space and ignores head movement', () => withCanvas(() => {
  const scene = new THREE.Scene();
  const rig = new THREE.Group();
  const head = new THREE.PerspectiveCamera();
  rig.add(head);
  scene.add(rig);
  head.position.set(0, 1.62, 0);
  const guide = lesson(scene);
  guide.setWorldVisible(true);
  assert.equal(guide.panel.parent, scene);
  assert.notEqual(guide.panel.parent, head);
  const before = guide.panel.getWorldPosition(new THREE.Vector3());
  assert.ok(before.distanceTo(head.getWorldPosition(new THREE.Vector3())) > 1.5);
  assert.ok(before.distanceTo(head.getWorldPosition(new THREE.Vector3())) < 2);
  assert.ok(before.x > 1.2 && before.z > -1.75);
  const rayOrigin = head.getWorldPosition(new THREE.Vector3());
  const towardGrip = guide.grip.getWorldPosition(new THREE.Vector3()).sub(rayOrigin).normalize();
  assert.equal(pickRayTarget(new THREE.Ray(rayOrigin, towardGrip), [guide.grip])?.mesh, guide.grip);
  head.rotation.y = Math.PI / 2;
  rig.position.set(0.5, 0, -0.4);
  assert.ok(guide.panel.getWorldPosition(new THREE.Vector3()).equals(before));
}));

test('controller grab offset repositions guide and reset restores its default pose', () => withCanvas(() => {
  const scene = new THREE.Scene();
  const guide = lesson(scene);
  guide.setWorldVisible(true);
  const entry = guide.interactables[0];
  assert.equal(entry.object, guide.panel);
  assert.equal(entry.mesh, guide.grip);
  const anchor = new THREE.Group();
  scene.add(anchor);
  anchor.position.set(0.3, 1.5, -0.2);
  const local = preservedLocalGrabOffset(anchor, guide.panel);
  anchor.position.add(new THREE.Vector3(-0.4, 0.2, -0.3));
  guide.panel.position.copy(worldToParentPoint(guide.panel, worldFromGrabOffset(anchor, local)));
  entry.constrain();
  const released = guide.panel.position.clone();
  anchor.position.add(new THREE.Vector3(0.2, 0, 0));
  assert.ok(guide.panel.position.equals(released));
  guide.resetPosition();
  assert.ok(guide.panel.position.distanceTo(new THREE.Vector3(GUIDE_HOME.x, GUIDE_HOME.y, GUIDE_HOME.z)) < 1e-12);
  assert.ok(Math.abs(guide.panel.rotation.y - GUIDE_HOME.yaw) < 1e-12);
}));

test('world guide preserves prediction and mode buttons and accepts a ray from the start position', () => withCanvas(() => {
  const scene = new THREE.Scene();
  let prediction = null;
  let shell = null;
  const guide = createVrLessonControls(scene, {
    repeat() {}, next() {}, explain() {}, pin() {},
    predict(value) { prediction = value; },
    shell(index) { shell = index; }, distance() {},
  });
  let modeChanges = 0;
  let resets = 0;
  const session = createVrControls(guide.panel, {
    recenter() {}, resetLab() {}, resetPanelPosition() { resets++; guide.resetPosition(); },
    switchStation() {}, switchInvestigation() {}, switchMode() { modeChanges++; }, exit() {},
  });
  guide.setWorldVisible(true);
  guide.setVisible(true);
  session.setVisible(true);
  guide.setState({ mode: 'guided', title: 'Predict', vrMessage: 'Will V change?',
    explained: false, showDistance: false, isOrigin: true, canPin: false,
    predictionOptions: [{ label: 'Same V', value: 'same' }, { label: 'Changes', value: 'change' }] });
  assert.equal(guide.buttons[3].visible, true);
  guide.buttons[3].userData.action();
  assert.equal(prediction, 'same');
  const resetButton = session.buttons[2];
  const ray = new THREE.Raycaster();
  const start = new THREE.Vector3(0, 1.62, 0);
  const target = resetButton.getWorldPosition(new THREE.Vector3());
  ray.set(start, target.sub(start).normalize());
  const hits = ray.intersectObjects([...guide.buttons, ...session.buttons], false);
  assert.equal(hits[0]?.object, resetButton);
  assert.ok(hits[0].distance < 4.5);
  hits[0].object.userData.action();
  assert.equal(resets, 1);
  session.buttons[5].userData.action();
  assert.equal(modeChanges, 1);
  guide.setState({ mode: 'free', title: '', vrMessage: 'Explore',
    explained: false, showDistance: false, isOrigin: false, freeShells: [false, false, false] });
  assert.equal(guide.buttons[3].visible, true);
  assert.equal(guide.buttons[0].visible, false);
  guide.buttons[3].userData.action();
  assert.equal(shell, 0);
}));
