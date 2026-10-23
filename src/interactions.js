import * as THREE from 'three';
import { inputForHand, readThumbstick } from './player-rig.js';

const MAX_RAY_DISTANCE = 4.5;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const dragPoint = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();
const center = new THREE.Vector3();
const worldScale = new THREE.Vector3();
const closestPoint = new THREE.Vector3();
const gripPosition = new THREE.Vector3();

function colliderRadius(mesh) {
  mesh.getWorldScale(worldScale);
  return (mesh.geometry?.parameters?.radius || 0.1) * Math.max(worldScale.x, worldScale.y, worldScale.z);
}

function clampWorkspace(object) {
  object.position.x = THREE.MathUtils.clamp(object.position.x, -2.2, 2.2);
  object.position.y = THREE.MathUtils.clamp(object.position.y, 0.38, 2.25);
  object.position.z = THREE.MathUtils.clamp(object.position.z, -3.1, 0.2);
}

// A small angular allowance makes distant spheres selectable without changing
// their visible size. The closest valid object along the ray wins.
export function pickRayTarget(ray, meshes, maxDistance = MAX_RAY_DISTANCE) {
  let selected = null;
  for (const mesh of meshes) {
    mesh.getWorldPosition(center);
    const distance = center.clone().sub(ray.origin).dot(ray.direction);
    if (distance < 0.25 || distance > maxDistance) continue;
    closestPoint.copy(ray.direction).multiplyScalar(distance).add(ray.origin);
    const allowance = Math.max(colliderRadius(mesh), distance * 0.035);
    if (center.distanceTo(closestPoint) <= allowance && (!selected || distance < selected.distance)) {
      selected = { mesh, distance };
    }
  }
  return selected;
}

export function preservedLocalGrabOffset(anchor, object) {
  anchor.updateMatrixWorld(true);
  return anchor.worldToLocal(object.getWorldPosition(new THREE.Vector3()));
}

export function worldFromGrabOffset(anchor, localOffset) {
  anchor.updateMatrixWorld(true);
  return anchor.localToWorld(localOffset.clone());
}

export function worldToParentPoint(object, worldPoint) {
  return object.parent.worldToLocal(worldPoint.clone());
}

export function setupInteractions({ renderer, camera, playerRig, orbit, lab, uiButtons, onChange, extraInteractables = [] }) {
  const entries = [
    ...lab.draggable.map((mesh) => ({
      mesh,
      object: mesh === lab.handle ? lab.gaussian : mesh,
      constrain: clampWorkspace,
      onMove: onChange,
    })),
    ...extraInteractables,
  ];
  const entryFor = (mesh) => entries.find((entry) => entry.mesh === mesh);
  const activeMeshes = () => entries.filter((entry) => {
    if (entry.enabled?.() === false) return false;
    for (let node = entry.mesh; node; node = node.parent) if (!node.visible) return false;
    return true;
  }).map((entry) => entry.mesh);
  const activeButtons = () => uiButtons.filter((button) => {
    for (let node = button; node; node = node.parent) if (!node.visible) return false;
    return true;
  });
  let desktopDrag = null;
  let desktopHovered = null;

  function setDesktopHover(mesh) {
    if (desktopHovered === mesh) return;
    if (desktopHovered) entryFor(desktopHovered)?.onHover?.(false);
    if (desktopHovered?.material?.emissiveIntensity !== undefined) desktopHovered.material.emissiveIntensity = 0.2;
    desktopHovered = mesh;
    if (mesh?.material?.emissiveIntensity !== undefined) mesh.material.emissiveIntensity = 0.65;
    if (mesh) entryFor(mesh)?.onHover?.(true);
    renderer.domElement.style.cursor = mesh ? 'grab' : '';
  }

  function setPointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
  }

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (renderer.xr.isPresenting) return;
    setPointer(event);
    const hit = raycaster.intersectObjects(activeMeshes(), false)[0];
    if (!hit) return;
    const entry = entryFor(hit.object);
    const object = entry.object;
    camera.getWorldDirection(cameraDirection);
    dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, object.getWorldPosition(new THREE.Vector3()));
    if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) return;
    const localPoint = worldToParentPoint(object, dragPoint);
    desktopDrag = { entry, object, offset: object.position.clone().sub(localPoint) };
    entry.onGrab?.();
    renderer.domElement.style.cursor = 'grabbing';
    orbit.enabled = false;
    renderer.domElement.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!desktopDrag) {
      if (!renderer.xr.isPresenting) {
        setPointer(event);
        setDesktopHover(raycaster.intersectObjects(activeMeshes(), false)[0]?.object || null);
      }
      return;
    }
    setPointer(event);
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      const localPoint = worldToParentPoint(desktopDrag.object, dragPoint);
      desktopDrag.object.position.copy(localPoint).add(desktopDrag.offset);
      desktopDrag.entry.constrain?.(desktopDrag.object);
      desktopDrag.entry.onMove?.();
    }
  });
  const releaseDesktop = () => {
    const released = desktopDrag;
    desktopDrag = null;
    orbit.enabled = !renderer.xr.isPresenting;
    if (released) released.entry.onRelease?.();
    setDesktopHover(null);
  };
  renderer.domElement.addEventListener('pointerup', releaseDesktop);
  renderer.domElement.addEventListener('pointercancel', releaseDesktop);
  renderer.domElement.addEventListener('pointerleave', () => { if (!desktopDrag) setDesktopHover(null); });
  window.addEventListener('blur', releaseDesktop);

  const controllers = [];
  for (let i = 0; i < 2; i++) {
    const aim = renderer.xr.getController(i);
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x9fe8f0 }),
    ));
    const beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0x7ddce7, transparent: true, opacity: 0.4 }),
    );
    beam.visible = false;
    aim.add(beam);
    playerRig.add(aim, grip);
    const state = { aim, grip, beam, source: null, grabbed: null, hovered: null };

    aim.addEventListener('connected', (event) => { state.source = event.data; });
    aim.addEventListener('disconnected', () => {
      state.source = null;
      state.grabbed?.entry.onCancel?.();
      state.grabbed = null;
      state.beam.visible = false;
    });
    aim.addEventListener('selectstart', () => {
      if (!renderer.xr.isPresenting) return;
      const near = nearestTarget(grip, activeMeshes());
      if (near) {
        const entry = entryFor(near);
        const object = entry.object;
        state.grabbed = {
          entry, object, anchor: grip,
          local: preservedLocalGrabOffset(grip, object), mode: 'near',
        };
        entry.onGrab?.();
        return;
      }
      aimRay(aim);
      const button = raycaster.intersectObjects(activeButtons(), false)[0];
      if (button && button.distance < 1.6) {
        button.object.userData.action();
        return;
      }
      const hit = pickRayTarget(raycaster.ray, activeMeshes());
      if (hit) {
        const entry = entryFor(hit.mesh);
        const object = entry.object;
        if (controllers.some((other) => other.grabbed?.object === object)) return;
        state.grabbed = {
          entry, object, anchor: aim,
          local: preservedLocalGrabOffset(aim, object), mode: 'far',
        };
        entry.onGrab?.();
      }
    });
    aim.addEventListener('selectend', () => {
      const released = state.grabbed;
      state.grabbed = null;
      released?.entry.onRelease?.();
    });
    controllers.push(state);
  }

  function nearestTarget(grip, meshes) {
    grip.getWorldPosition(gripPosition);
    let best = null;
    let bestDistance = Infinity;
    for (const mesh of meshes) {
      if (controllers.some((state) => state.grabbed?.object === entryFor(mesh).object)) continue;
      mesh.getWorldPosition(center);
      const distance = center.distanceTo(gripPosition);
      if (distance < colliderRadius(mesh) + 0.15 && distance < bestDistance) {
        best = mesh;
        bestDistance = distance;
      }
    }
    return best;
  }

  function aimRay(aim) {
    aim.updateMatrixWorld(true);
    raycaster.ray.origin.setFromMatrixPosition(aim.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).transformDirection(aim.matrixWorld);
  }

  function updateHover(state, target) {
    if (state.hovered === target) return;
    if (state.hovered) entryFor(state.hovered)?.onHover?.(false);
    if (state.hovered?.material?.emissiveIntensity !== undefined) state.hovered.material.emissiveIntensity = 0.2;
    else if (state.hovered?.userData?.action) state.hovered.material.color.setHex(0xffffff);
    state.hovered = target;
    if (target?.material?.emissiveIntensity !== undefined) target.material.emissiveIntensity = 0.7;
    else if (target?.userData?.action) target.material.color.setHex(0xc8f6f0);
    if (target) entryFor(target)?.onHover?.(true);
  }

  let lastTime = null;
  function update(time) {
    if (!renderer.xr.isPresenting) return;
    const dt = lastTime === null ? 0 : Math.min(0.05, Math.max(0, (time - lastTime) / 1000));
    lastTime = time;
    for (const state of controllers) {
      if (!state.source) continue;
      const { aim, grip, beam, grabbed } = state;
      aim.updateMatrixWorld(true);
      grip.updateMatrixWorld(true);
      aimRay(aim);
      if (grabbed) {
        updateHover(state, grabbed.entry.mesh);
        if (grabbed.mode === 'far') {
          const depth = readThumbstick(inputForHand(renderer.xr.getSession(), 'right')).y;
          grabbed.local.z = THREE.MathUtils.clamp(grabbed.local.z + depth * dt * 1.1, -MAX_RAY_DISTANCE, -0.35);
        }
        const worldTarget = worldFromGrabOffset(grabbed.anchor, grabbed.local);
        const parentTarget = grabbed.object.parent.worldToLocal(worldTarget);
        const blend = grabbed.mode === 'near' ? 1 : 1 - Math.exp(-25 * dt);
        const previous = grabbed.object.position.clone();
        grabbed.object.position.lerp(parentTarget, blend);
        grabbed.entry.constrain?.(grabbed.object);
        beam.visible = grabbed.mode === 'far';
        beam.scale.z = Math.abs(grabbed.local.z);
        if (grabbed.object.position.distanceToSquared(previous) > 1e-6) grabbed.entry.onMove?.();
      } else {
        const near = nearestTarget(grip, activeMeshes());
        const button = raycaster.intersectObjects(activeButtons(), false)[0];
        const far = pickRayTarget(raycaster.ray, activeMeshes());
        updateHover(state, near || (button && button.distance < 1.6 ? button.object : far?.mesh));
        beam.visible = true;
        beam.scale.z = button && button.distance < 1.6 ? button.distance : far?.distance || MAX_RAY_DISTANCE;
        beam.material.opacity = near ? 0.15 : far || button ? 0.75 : 0.25;
      }
    }
  }

  function cancelGrabs() {
    if (desktopDrag) {
      desktopDrag.entry.onCancel?.();
      desktopDrag = null;
      orbit.enabled = !renderer.xr.isPresenting;
    }
    setDesktopHover(null);
    for (const state of controllers) {
      state.grabbed?.entry.onCancel?.();
      state.grabbed = null;
      updateHover(state, null);
    }
  }

  function sessionEnd() {
    lastTime = null;
    for (const state of controllers) {
      state.grabbed?.entry.onCancel?.();
      state.grabbed = null;
      state.source = null;
      state.beam.visible = false;
      updateHover(state, null);
    }
  }

  return { update, cancelGrabs, sessionEnd };
}
