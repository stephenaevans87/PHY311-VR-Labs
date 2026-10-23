import * as THREE from 'three';

const WALK_SPEED = 1.2; // metres per second
const SNAP_ANGLE = Math.PI / 6; // 30 degrees
const STICK_DEADZONE = 0.18;

export function readThumbstick(inputSource) {
  const axes = inputSource?.gamepad?.axes;
  if (!axes || axes.length < 2) return { x: 0, y: 0 };
  // xr-standard reserves the first pair for a touchpad when both are present.
  const offset = axes.length >= 4 ? 2 : 0;
  const x = axes[offset] || 0;
  const y = axes[offset + 1] || 0;
  const magnitude = Math.hypot(x, y);
  if (magnitude <= STICK_DEADZONE) return { x: 0, y: 0 };
  const scaled = Math.min(1, (magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE));
  return { x: x / magnitude * scaled, y: y / magnitude * scaled };
}

export function inputForHand(session, handedness) {
  return [...(session?.inputSources || [])].find((source) => source.handedness === handedness && source.gamepad) || null;
}

export function planarWalkDirection(headForward, stick) {
  const forward = new THREE.Vector3(headForward.x, 0, headForward.z).normalize();
  if (forward.lengthSq() === 0) forward.set(0, 0, -1);
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  return right.multiplyScalar(stick.x).addScaledVector(forward, -stick.y);
}

export function turnAroundHead(rig, camera, radians) {
  rig.updateMatrixWorld(true);
  const before = camera.getWorldPosition(new THREE.Vector3());
  rig.rotation.y += radians;
  rig.updateMatrixWorld(true);
  const after = camera.getWorldPosition(new THREE.Vector3());
  rig.position.x += before.x - after.x;
  rig.position.z += before.z - after.z;
  rig.updateMatrixWorld(true);
}

export function createPlayerRig({ scene, camera, renderer }) {
  const rig = new THREE.Group();
  rig.name = 'player-rig';
  scene.add(rig);
  rig.add(camera);

  const velocity = new THREE.Vector3();
  const headForward = new THREE.Vector3();
  let lastTime = null;
  let snapReady = true;
  let pendingRecenter = false;

  function recenter() {
    if (!renderer.xr.isPresenting) return;
    rig.position.set(0, 0, 0);
    rig.rotation.y = 0;
    rig.updateMatrixWorld(true);
    renderer.xr.updateCamera(camera);
    camera.getWorldDirection(headForward);
    headForward.y = 0;
    headForward.normalize();
    const headYaw = Math.atan2(-headForward.x, -headForward.z);
    rig.rotation.y = -headYaw;
    rig.updateMatrixWorld(true);
    const head = camera.getWorldPosition(new THREE.Vector3());
    rig.position.x = -head.x;
    rig.position.z = -head.z;
    rig.updateMatrixWorld(true);
    renderer.xr.updateCamera(camera);
    velocity.set(0, 0, 0);
  }

  function sessionStart() {
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    velocity.set(0, 0, 0);
    snapReady = true;
    lastTime = null;
    pendingRecenter = true;
  }

  function sessionEnd() {
    pendingRecenter = false;
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    velocity.set(0, 0, 0);
    lastTime = null;
  }

  function update(time) {
    if (!renderer.xr.isPresenting) return;
    rig.updateMatrixWorld(true);
    // WebXR has supplied this frame's tracked pose before the app callback.
    renderer.xr.updateCamera(camera);
    if (pendingRecenter) {
      recenter();
      pendingRecenter = false;
    }
    const dt = lastTime === null ? 0 : Math.min(0.05, Math.max(0, (time - lastTime) / 1000));
    lastTime = time;
    const session = renderer.xr.getSession();
    const turn = readThumbstick(inputForHand(session, 'right'));
    if (Math.abs(turn.x) < 0.35) snapReady = true;
    if (snapReady && Math.abs(turn.x) > 0.7) {
      turnAroundHead(rig, camera, -Math.sign(turn.x) * SNAP_ANGLE);
      snapReady = false;
    }

    const move = readThumbstick(inputForHand(session, 'left'));
    camera.getWorldDirection(headForward);
    const desired = planarWalkDirection(headForward, move).multiplyScalar(WALK_SPEED);
    velocity.lerp(desired, 1 - Math.exp(-12 * dt));
    rig.position.addScaledVector(velocity, dt);
    rig.updateMatrixWorld(true);
    renderer.xr.updateCamera(camera);
  }

  return { rig, update, recenter, sessionStart, sessionEnd };
}
