import * as THREE from 'three';
import { fieldAndPotential, gaussianSphere, NANOCOULOMB } from './physics.js';

const RADIUS = 0.38;
const CHARGE_RADIUS = 0.11;
const PROBE_RADIUS = 0.095;

function makeLabel(width = 512, height = 160, scale = 0.65) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(scale, scale * height / width),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  mesh.userData.setText = (lines) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(13, 25, 37, 0.88)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f3f7fb';
    ctx.font = 'bold 31px system-ui';
    lines.forEach((line, i) => ctx.fillText(line, 18, 47 + i * 45));
    texture.needsUpdate = true;
  };
  return mesh;
}

function sphere(radius, color, emissive = color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 16),
    new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.2, roughness: 0.38 }),
  );
}

export function createLab(scene) {
  scene.background = new THREE.Color(0x101a27);
  scene.add(new THREE.HemisphereLight(0xdcecff, 0x253344, 2.2));
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(1, 3, 2);
  scene.add(light);

  const root = new THREE.Group();
  root.name = 'electrostatics-sandbox';
  scene.add(root);
  const grid = new THREE.GridHelper(5, 20, 0x466070, 0x263747);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  root.add(grid);

  const positive = sphere(CHARGE_RADIUS, 0xff9d56);
  const negative = sphere(CHARGE_RADIUS, 0x57b9ff);
  positive.position.set(-0.48, 1.35, -1.55);
  negative.position.set(0.48, 1.35, -1.55);
  root.add(positive, negative);

  const probe = sphere(PROBE_RADIUS, 0x79f4ba);
  probe.position.set(0, 1.32, -0.95);
  root.add(probe);
  const probeLabel = makeLabel(620, 185, 0.78);
  probeLabel.position.set(0, 0.21, 0);
  probe.add(probeLabel);

  const gaussian = new THREE.Group();
  gaussian.position.copy(positive.position);
  root.add(gaussian);
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x85e5ef, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }),
  );
  gaussian.add(shell);
  const rim = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(RADIUS, 2)),
    new THREE.LineBasicMaterial({ color: 0x8bdee8, transparent: true, opacity: 0.28 }),
  );
  gaussian.add(rim);
  const handle = sphere(0.085, 0xb4f8ff);
  handle.position.y = RADIUS + 0.09;
  gaussian.add(handle);
  const gaussianLabel = makeLabel(610, 185, 0.8);
  gaussianLabel.position.set(0, RADIUS + 0.33, 0);
  gaussian.add(gaussianLabel);

  // The arrow lattice samples the analytical field. It is a visualization,
  // not a numerical flux integration or a claim of constant field magnitude.
  const arrowGroup = new THREE.Group();
  root.add(arrowGroup);
  const arrows = [];
  for (const y of [0.85, 1.35, 1.85]) {
    for (const z of [-2.15, -1.55, -0.95]) {
      for (const x of [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5]) {
        const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(x, y, z), 0.16, 0xc5dce7, 0.065, 0.035);
        arrowGroup.add(arrow);
        arrows.push(arrow);
      }
    }
  }

  const charges = () => [
    { position: positive.position, charge: NANOCOULOMB },
    { position: negative.position, charge: -NANOCOULOMB },
  ];

  let lastReadout = {};
  const labelQuaternion = new THREE.Quaternion();
  function update() {
    const sources = charges();
    const nearest = Math.min(...sources.map(({ position }) => position.distanceTo(probe.position)));
    const measurement = nearest < CHARGE_RADIUS + PROBE_RADIUS + 0.025
      ? null : fieldAndPotential(probe.position, sources);
    const gauss = gaussianSphere(gaussian.position, RADIUS, sources);
    const probeLines = measurement
      ? ['PROBE · exact', `V ${measurement.potential.toFixed(2)} V   |E| ${measurement.magnitude.toFixed(1)} V/m`]
      : ['PROBE', 'Move clear of a charge'];
    probeLabel.userData.setText(probeLines);
    const q = gauss.enclosedCharge === null ? 'boundary' : `${(gauss.enclosedCharge / NANOCOULOMB).toFixed(0)} nC`;
    const flux = gauss.flux === null ? 'undefined' : `${gauss.flux.toFixed(0)} N·m²/C`;
    gaussianLabel.userData.setText(['GAUSS · exact', `Q ${q}   Φ ${flux}`]);

    for (const arrow of arrows) {
      const p = arrow.position;
      if (sources.some(({ position }) => position.distanceTo(p) < 0.2)) {
        arrow.visible = false;
        continue;
      }
      const result = fieldAndPotential(p, sources);
      arrow.visible = result.magnitude > 0.05;
      if (arrow.visible) {
        arrow.setDirection(new THREE.Vector3(result.field.x, result.field.y, result.field.z).normalize());
        arrow.setLength(0.12 + Math.min(0.14, Math.log1p(result.magnitude) * 0.035), 0.065, 0.035);
      }
    }
    lastReadout = { measurement, gauss };
    return lastReadout;
  }

  update();
  return {
    root, positive, negative, probe, gaussian, handle,
    draggable: [positive, negative, probe, handle],
    update,
    get readout() { return lastReadout; },
    faceLabels(camera) {
      camera.getWorldQuaternion(labelQuaternion);
      probeLabel.quaternion.copy(labelQuaternion);
      gaussianLabel.quaternion.copy(labelQuaternion);
    },
  };
}
