import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const controllerPosition = new THREE.Vector3();
const candidatePosition = new THREE.Vector3();
const dragPlane = new THREE.Plane();
const dragPoint = new THREE.Vector3();
const offset = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();

function clampWorkspace(object) {
  object.position.x = THREE.MathUtils.clamp(object.position.x, -2.2, 2.2);
  object.position.y = THREE.MathUtils.clamp(object.position.y, 0.38, 2.25);
  object.position.z = THREE.MathUtils.clamp(object.position.z, -3.1, 0.2);
}

export function setupInteractions({ renderer, camera, scene, orbit, lab, exitButton, onChange }) {
  const targets = lab.draggable;
  const objectFor = (mesh) => mesh === lab.handle ? lab.gaussian : mesh;
  let desktopDrag = null;

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
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (!hit) return;
    const object = objectFor(hit.object);
    camera.getWorldDirection(cameraDirection);
    dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, object.position);
    raycaster.ray.intersectPlane(dragPlane, dragPoint);
    offset.copy(object.position).sub(dragPoint);
    desktopDrag = { object, offset: offset.clone() };
    orbit.enabled = false;
    renderer.domElement.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!desktopDrag) return;
    setPointer(event);
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      desktopDrag.object.position.copy(dragPoint).add(desktopDrag.offset);
      clampWorkspace(desktopDrag.object);
      onChange();
    }
  });
  const releaseDesktop = () => { desktopDrag = null; orbit.enabled = true; };
  renderer.domElement.addEventListener('pointerup', releaseDesktop);
  renderer.domElement.addEventListener('pointercancel', releaseDesktop);
  window.addEventListener('blur', releaseDesktop);

  const controllers = [];
  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x9fe8f0 }),
    ));
    const beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -2.2)]),
      new THREE.LineBasicMaterial({ color: 0x7ddce7, transparent: true, opacity: 0.45 }),
    );
    controller.add(beam);
    scene.add(controller, grip);
    let grabbed = null;
    let localOffset = null;

    controller.addEventListener('selectstart', () => {
      controller.updateMatrixWorld(true);
      exitButton.updateMatrixWorld(true);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).transformDirection(controller.matrixWorld);
      const exitHit = raycaster.intersectObject(exitButton, false)[0];
      if (exitHit && exitHit.distance < 2.2) {
        renderer.xr.getSession()?.end();
        return;
      }
      grip.updateMatrixWorld(true);
      grip.getWorldPosition(controllerPosition);
      let closest = 0.23;
      for (const mesh of targets) {
        mesh.getWorldPosition(candidatePosition);
        const distance = candidatePosition.distanceTo(controllerPosition);
        if (distance < closest) {
          closest = distance;
          grabbed = objectFor(mesh);
        }
      }
      if (grabbed) {
        const inverse = new THREE.Matrix4().copy(grip.matrixWorld).invert();
        localOffset = new THREE.Vector3().copy(grabbed.position).applyMatrix4(inverse);
      }
    });
    controller.addEventListener('selectend', () => { grabbed = null; localOffset = null; });
    controllers.push(() => {
      if (!grabbed || !localOffset) return;
      grip.updateMatrixWorld(true);
      grabbed.position.copy(localOffset).applyMatrix4(grip.matrixWorld);
      clampWorkspace(grabbed);
      onChange();
    });
  }
  return () => controllers.forEach((update) => update());
}
