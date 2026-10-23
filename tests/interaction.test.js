import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPlayerRig, planarWalkDirection, readThumbstick, turnAroundHead } from '../src/player-rig.js';
import { pickRayTarget, preservedLocalGrabOffset, worldFromGrabOffset, worldToParentPoint } from '../src/interactions.js';

const near = (actual, expected, tolerance = 1e-8) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

test('Quest thumbstick axes and dead zone produce predictable movement input', () => {
  assert.deepEqual(readThumbstick({ gamepad: { axes: [0, 0, 0.1, 0.1] } }), { x: 0, y: 0 });
  const forward = readThumbstick({ gamepad: { axes: [0, 0, 0, -1] } });
  near(forward.x, 0);
  near(forward.y, -1);
  const direction = planarWalkDirection(new THREE.Vector3(0, -0.5, -1), forward);
  near(direction.y, 0);
  near(direction.z, -1);
  const strafe = planarWalkDirection(new THREE.Vector3(-1, 0, 0), { x: 1, y: 0 });
  near(strafe.z, -1);
});

test('snap turn rotates the view without orbiting the tracked head around the rig origin', () => {
  const rig = new THREE.Group();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0.6, 1.7, 0.3);
  rig.add(camera);
  const before = camera.getWorldPosition(new THREE.Vector3());
  turnAroundHead(rig, camera, -Math.PI / 6);
  const after = camera.getWorldPosition(new THREE.Vector3());
  near(after.x, before.x);
  near(after.z, before.z);
  near(rig.rotation.y, -Math.PI / 6);
});

test('recenter places tracked head at lab origin while correcting its facing', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0.5, 1.6, 0.3);
  camera.rotation.y = Math.PI / 4;
  const renderer = { xr: { isPresenting: true, updateCamera() {} } };
  const player = createPlayerRig({ scene, camera, renderer });
  player.recenter();
  const head = camera.getWorldPosition(new THREE.Vector3());
  const direction = camera.getWorldDirection(new THREE.Vector3());
  near(head.x, 0);
  near(head.z, 0);
  near(direction.x, 0);
  near(direction.z, -1);
});

test('distance picking accepts a small angular allowance and chooses the nearer object', () => {
  const scene = new THREE.Scene();
  const nearObject = new THREE.Mesh(new THREE.SphereGeometry(0.1));
  const farObject = new THREE.Mesh(new THREE.SphereGeometry(0.1));
  nearObject.position.set(0.1, 1, -2);
  farObject.position.set(0.13, 1, -4);
  scene.add(nearObject, farObject);
  const ray = new THREE.Ray(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1));
  assert.equal(pickRayTarget(ray, [farObject, nearObject]).mesh, nearObject);
  assert.equal(pickRayTarget(ray, [farObject]).mesh, farObject);
  assert.equal(pickRayTarget(ray, [farObject, nearObject], 1), null);
});

test('grab offset keeps an object stationary at pickup and follows anchor movement', () => {
  const scene = new THREE.Scene();
  const rig = new THREE.Group();
  const anchor = new THREE.Group();
  const object = new THREE.Mesh(new THREE.SphereGeometry(0.1));
  scene.add(rig, object);
  rig.position.set(0.4, 0, -0.2);
  rig.add(anchor);
  anchor.position.set(0.2, 1.2, -0.3);
  object.position.set(0.5, 1.4, -1.2);
  const local = preservedLocalGrabOffset(anchor, object);
  const pickup = worldFromGrabOffset(anchor, local);
  near(pickup.distanceTo(object.position), 0);
  rig.rotation.y = Math.PI / 4;
  const moved = worldFromGrabOffset(anchor, local);
  assert.ok(moved.distanceTo(object.position) > 0.1);
});

test('desktop drag points convert into a translated station’s local coordinates', () => {
  const station = new THREE.Group();
  station.position.set(2.8, 0, -1.55);
  const origin = new THREE.Group();
  origin.position.set(0, 1.32, 0);
  station.add(origin);
  const hit = origin.getWorldPosition(new THREE.Vector3());
  const local = worldToParentPoint(origin, hit);
  near(local.x, 0);
  near(local.y, 1.32);
  near(local.z, 0);
});
