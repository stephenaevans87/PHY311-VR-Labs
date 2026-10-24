import * as THREE from 'three';
import { K, NANOCOULOMB } from '../physics.js';
import { pointChargeExpansion } from './origin-physics.js';

// The lesson's polar z axis is world y. O stays on the source axis so the
// axisymmetric Legendre moments in the lecture guide remain applicable.
const SOURCE = new THREE.Vector3(0, 1.43, 0);
const ORIGIN_START = new THREE.Vector3(0, 1.05, 0);
const PROBE_START = new THREE.Vector3(0.72, 1.48, 0.12);
const WAND_TIP_OFFSET = new THREE.Vector3(0.42, 0, 0);
const EQUIPOTENTIAL_RADII = [0.9, 1.6, 2.3];
const COLORS = { source: 0xffa660, origin: 0xbda8ff, probe: 0x79efd5 };

function solid(color, glow = 0.18) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: glow, roughness: 0.43, metalness: 0.12 });
}
function ball(radius, color) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), solid(color));
}
function ring(radius, color, tube = 0.008) {
  return new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 64),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
}
function line(color, opacity = 1) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false }));
}
function setLine(mesh, a, b) {
  const positions = mesh.geometry.attributes.position;
  positions.setXYZ(0, a.x, a.y, a.z);
  positions.setXYZ(1, b.x, b.y, b.z);
  positions.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}
function plate(width, height, accent = '#bce2e8') {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = Math.round(900 * height / width);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  mesh.userData.canvas = canvas;
  mesh.userData.draw = (lines, tint = accent) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(18, 34, 44, 0.93)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, 9, canvas.height);
    const row = canvas.height / (lines.length + 0.42);
    lines.forEach((text, index) => {
      ctx.font = `${index === 0 ? 'bold ' : ''}${lines.length > 2 ? 47 : 59}px system-ui`;
      ctx.fillStyle = index === 0 ? tint : '#eef7f6';
      ctx.fillText(text, 30, row * (index + 0.82), canvas.width - 52);
    });
    texture.needsUpdate = true;
  };
  return mesh;
}
function convergenceSphere() {
  const group = new THREE.Group();
  for (const rotation of [new THREE.Euler(), new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Euler(0, Math.PI / 2, 0)]) {
    const circle = ring(1, COLORS.origin, 0.006);
    circle.rotation.copy(rotation);
    group.add(circle);
  }
  group.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20),
    new THREE.MeshBasicMaterial({ color: COLORS.origin, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false })));
  return group;
}
function equipotentialPatch(radius) {
  // Every vertex lies on the sphere |x - source| = radius. The open rear-side
  // cutaway leaves the apparatus and the student's hands visible from entry.
  const patch = new THREE.Group();
  const phiStart = 3.48;
  const phiLength = 1.8;
  const thetaStart = 0.54;
  const thetaLength = 2.05;
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16, phiStart, phiLength, thetaStart, thetaLength),
    new THREE.MeshBasicMaterial({
      color: COLORS.source, transparent: true, opacity: 0.085,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  surface.userData.kind = 'physical-equipotential';
  patch.add(surface);
  const edgePoints = [];
  const point = (phi, theta) => new THREE.Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
  );
  for (let i = 0; i <= 32; i++) edgePoints.push(point(phiStart + phiLength * i / 32, thetaStart));
  for (let i = 1; i <= 16; i++) edgePoints.push(point(phiStart + phiLength, thetaStart + thetaLength * i / 16));
  for (let i = 31; i >= 0; i--) edgePoints.push(point(phiStart + phiLength * i / 32, thetaStart + thetaLength));
  for (let i = 15; i > 0; i--) edgePoints.push(point(phiStart, thetaStart + thetaLength * i / 16));
  const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(edgePoints),
    new THREE.LineBasicMaterial({ color: 0xffbd83, transparent: true, opacity: 0.42, depthWrite: false }));
  patch.add(edge);
  for (const theta of [1.03, 2.08]) {
    const latitude = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(Array.from({ length: 33 }, (_, i) =>
        point(phiStart + phiLength * i / 32, theta))),
      new THREE.LineBasicMaterial({ color: 0xffcba0, transparent: true, opacity: 0.23, depthWrite: false }),
    );
    patch.add(latitude);
  }
  const valueLabel = plate(0.48, 0.13, '#ffc99f');
  valueLabel.position.copy(point(phiStart + 0.12, thetaStart + 0.35));
  valueLabel.position.y += 0.08;
  valueLabel.userData.draw([`R ${radius.toFixed(1)} m`, `V ${(K * NANOCOULOMB / radius).toFixed(2)} V`]);
  valueLabel.visible = false;
  patch.add(valueLabel);
  patch.userData = { kind: 'physical-equipotential', radius, potential: K * NANOCOULOMB / radius, surface, valueLabel };
  return patch;
}
function drawTerms(mesh, result) {
  const ctx = mesh.userData.canvas.getContext('2d');
  const canvas = mesh.userData.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(18, 34, 44, 0.94)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#9debd9';
  ctx.fillRect(0, 0, 9, canvas.height);
  ctx.font = 'bold 51px system-ui';
  ctx.fillText('POTENTIAL AT PROBE · V', 28, 55);
  ctx.font = '43px system-ui';
  ctx.fillStyle = '#cddfe6';
  ctx.fillText(`r ${result.r.toFixed(2)} m    Rmax ${result.sourceRadius.toFixed(2)} m`, 28, 101);
  if (!result.exterior) {
    ctx.fillStyle = '#ffc68f';
    ctx.font = 'bold 44px system-ui';
    ctx.fillText('INSIDE EXTERIOR SPHERE', 28, 185);
    ctx.font = '40px system-ui';
    ctx.fillText('Series withheld: r ≤ Rmax', 28, 240);
    ctx.fillText('Exact V remains available.', 28, 295);
  } else {
    const max = Math.max(0.001, ...result.contributions.map((value) => Math.abs(value)));
    ctx.fillStyle = '#839da8';
    ctx.fillRect(441, 120, 3, 232);
    result.contributions.forEach((value, n) => {
      const y = 131 + n * 56;
      const width = 204 * Math.abs(value) / max;
      ctx.fillStyle = value < 0 ? '#ffc08b' : '#8debd6';
      ctx.fillRect(value < 0 ? 441 - width : 444, y, width, 22);
      ctx.fillStyle = '#eff6f5';
      ctx.font = '47px system-ui';
      ctx.fillText(`V${n}`, 30, y + 26);
      ctx.fillText(`${value >= 0 ? '+' : ''}${value.toFixed(2)}`, 690, y + 26);
    });
    ctx.fillStyle = '#b7eade';
    ctx.font = 'bold 47px system-ui';
    ctx.fillText(`Σ through n=3    ${result.truncatedPotential.toFixed(2)} V`, 28, 393);
  }
  mesh.material.map.needsUpdate = true;
}

export function createOriginExperiment(scene, { position = new THREE.Vector3(0, 0, -1.75), onStateChange = () => {} } = {}) {
  const root = new THREE.Group();
  root.name = 'lesson-14-origin-station';
  root.position.copy(position);
  scene.add(root);

  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.70, 0.03, 0.93), solid(0x29434c, 0.02));
  bench.position.set(0.39, 0.02, -0.08);
  root.add(bench);
  const axisRail = line(0x718a97, 0.45);
  setLine(axisRail, new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(0, 1.84, 0));
  root.add(axisRail);

  const charge = ball(0.14, COLORS.source);
  charge.position.copy(SOURCE);
  root.add(charge);
  const equipotentials = EQUIPOTENTIAL_RADII.map(equipotentialPatch);
  equipotentials.forEach((patch) => { patch.position.copy(SOURCE); root.add(patch); });
  const plus = new THREE.Group();
  for (const [w, h] of [[0.083, 0.017], [0.017, 0.083]]) {
    plus.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.007),
      new THREE.MeshBasicMaterial({ color: 0xfff5e8 })));
  }
  plus.position.z = 0.144;
  charge.add(plus);

  const origin = new THREE.Group();
  origin.position.copy(ORIGIN_START);
  root.add(origin);
  const originCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), solid(COLORS.origin));
  origin.add(originCore);
  const originFaceRing = ring(0.17, COLORS.origin, 0.012);
  origin.add(originFaceRing);
  const originDepthRing = ring(0.17, COLORS.origin, 0.008);
  originDepthRing.rotation.y = Math.PI / 2;
  origin.add(originDepthRing);
  const originHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.19, 16), solid(COLORS.origin));
  originHandle.rotation.z = Math.PI / 2;
  originHandle.position.set(-0.29, 0, 0.02);
  origin.add(originHandle);
  const handleStem = line(COLORS.origin, 0.85);
  setLine(handleStem, new THREE.Vector3(-0.29, 0, 0.02), new THREE.Vector3());
  origin.add(handleStem);

  const probe = new THREE.Group();
  probe.position.copy(PROBE_START).sub(WAND_TIP_OFFSET);
  root.add(probe);
  const probeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.22, 16), solid(0x315d60));
  probeHandle.rotation.z = Math.PI / 2;
  probe.add(probeHandle);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.045, 16), solid(COLORS.probe));
  collar.rotation.z = Math.PI / 2;
  collar.position.x = 0.12;
  probe.add(collar);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.27, 12), solid(0x9fc6c3, 0.08));
  shaft.rotation.z = Math.PI / 2;
  shaft.position.x = 0.26;
  probe.add(shaft);
  const probeTip = ball(0.035, COLORS.probe);
  probeTip.position.copy(WAND_TIP_OFFSET);
  probe.add(probeTip);
  const tipHalo = ring(0.06, COLORS.probe, 0.006);
  tipHalo.position.copy(WAND_TIP_OFFSET);
  probe.add(tipHalo);
  const handleMeter = plate(0.34, 0.10, '#a0f3df');
  handleMeter.position.set(-0.01, 0.062, 0.015);
  probe.add(handleMeter);

  const boundary = convergenceSphere();
  boundary.userData.kind = 'mathematical-convergence-boundary';
  root.add(boundary);
  const sourceVector = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), ORIGIN_START, 0.38, COLORS.source, 0.07, 0.035);
  const observationVector = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), ORIGIN_START, 0.8, COLORS.probe, 0.08, 0.04);
  root.add(sourceVector, observationVector);
  const sourceVectorLabel = plate(0.72, 0.12, '#ffc99f');
  sourceVectorLabel.position.set(-0.20, 0.83, 0.63);
  root.add(sourceVectorLabel);
  const observationVectorLabel = plate(0.75, 0.12, '#a0f3df');
  observationVectorLabel.position.set(0.58, 0.83, 0.63);
  root.add(observationVectorLabel);
  const physicalDistanceLine = line(COLORS.probe, 0.62);
  physicalDistanceLine.userData.kind = 'physical-source-to-tip-distance';
  root.add(physicalDistanceLine);
  const physicalDistanceLabel = plate(0.55, 0.11, '#a0f3df');
  root.add(physicalDistanceLabel);
  const savedMarkers = Array.from({ length: 3 }, (_, index) => {
    const marker = ball(0.045, COLORS.probe);
    const label = plate(0.45, 0.13, '#a0f3df');
    label.position.set(-0.33, 0.10, 0);
    marker.add(label);
    marker.userData.label = label;
    marker.userData.index = index;
    marker.visible = false;
    root.add(marker);
    return marker;
  });

  const exactMeter = plate(0.70, 0.19, '#a0f3df');
  exactMeter.position.set(1.44, 1.62, 0.30);
  root.add(exactMeter);
  const termMeter = plate(1.05, 0.53, '#a0f3df');
  termMeter.position.set(1.44, 1.10, 0.31);
  root.add(termMeter);

  // One small camera-relative cue replaces the large world backdrop. In free
  // mode it disappears. The two prediction choices are optional UI controls.
  const hud = new THREE.Group();
  hud.position.set(-0.47, -0.31, -1.17);
  const cue = plate(0.86, 0.20, '#c4e9e6');
  hud.add(cue);
  const sameButton = plate(0.40, 0.10, '#a0f3df');
  sameButton.position.set(-0.22, -0.17, 0.002);
  sameButton.userData.draw(['SAME V']);
  hud.add(sameButton);
  const changesButton = plate(0.40, 0.10, '#ffc99f');
  changesButton.position.set(0.22, -0.17, 0.002);
  changesButton.userData.draw(['CHANGES']);
  hud.add(changesButton);
  hud.visible = false;

  let mode = 'guided';
  let xrVisible = false;
  let selected = null;
  let mathRevealed = false;
  let prediction = null;
  let lastAction = 'initial';
  let lastResult;
  let instructionalPresentation = null;
  let presentationKey = '';
  const quat = new THREE.Quaternion();
  const probeQuat = new THREE.Quaternion();

  function setGrab(mesh, active) {
    mesh.scale.setScalar(active ? 1.13 : 1);
    if (mesh.material.emissiveIntensity !== undefined) mesh.material.emissiveIntensity = active ? 0.8 : 0.2;
  }
  function refreshCue(result) {
    let lines;
    if (selected === 'origin') lines = ['COORDINATE ORIGIN O', 'r′ leads to +q; r leads to the probe.'];
    else if (selected === 'probe') lines = ['OBSERVATION POINT', 'Compare exact V with exterior terms.'];
    else if (lastAction === 'origin') lines = ['ONLY O MOVED', 'Exact V held; moments and sphere changed.'];
    else if (lastAction === 'probe') lines = result.exterior
      ? ['PROBE MOVED', 'Physical separation changed V.']
      : ['INSIDE THE EXTERIOR SPHERE', 'Exact V exists; exterior sum paused.'];
    else if (prediction) lines = [`PREDICTION: ${prediction === 'unchanged' ? 'SAME V' : 'CHANGES'}`, 'Move O to test it.'];
    else lines = ['ORANGE +q IS FIXED', 'Move violet O or the teal probe.'];
    cue.userData.draw(lines);
    sameButton.visible = mode === 'guided';
    changesButton.visible = mode === 'guided';
    hud.visible = xrVisible && mode === 'guided' && !instructionalPresentation;
  }
  function update() {
    root.updateMatrixWorld(true);
    const tipPosition = root.worldToLocal(probeTip.getWorldPosition(new THREE.Vector3()));
    const result = pointChargeExpansion({
      charge: NANOCOULOMB, source: charge.position, origin: origin.position, observation: tipPosition,
    });
    lastResult = result;
    if (instructionalPresentation) {
      equipotentials.forEach((patch, index) => {
        const radius = instructionalPresentation.shellRadii?.[index] ?? EQUIPOTENTIAL_RADII[index];
        patch.scale.setScalar(radius / EQUIPOTENTIAL_RADII[index]);
        patch.userData.radius = radius;
        patch.userData.potential = K * NANOCOULOMB / radius;
        patch.userData.valueLabel.userData.draw([
          `R ${radius.toFixed(2)} m`, `V ${patch.userData.potential.toFixed(2)} V`,
        ]);
        patch.visible = Boolean(instructionalPresentation.shells?.[index]);
      });
      savedMarkers.forEach((marker, index) => {
        const sample = instructionalPresentation.samples?.[index];
        marker.visible = Boolean(sample);
        if (sample) {
          marker.position.set(sample.position.x, sample.position.y, sample.position.z);
          marker.userData.label.userData.draw([
            `PIN ${index + 1}`,
            `${sample.distance.toFixed(2)} m · ${sample.potential.toFixed(2)} V`,
          ]);
        }
      });
    }
    const visibleShells = equipotentials.filter((patch) => patch.visible);
    const activeShell = visibleShells.reduce((closest, patch) =>
      !closest || Math.abs(patch.userData.radius - result.physicalDistance)
        < Math.abs(closest.userData.radius - result.physicalDistance) ? patch : closest, null);
    equipotentials.forEach((patch) => {
      const active = Boolean(instructionalPresentation) && patch === activeShell;
      patch.userData.surface.material.opacity = active ? 0.17 : instructionalPresentation ? 0.065 : 0.085;
      patch.userData.valueLabel.visible = active && patch.visible;
      patch.children.slice(1, -1).forEach((child, index) => {
        if (child.material) child.material.opacity = active ? 0.65 : index === 0 && !instructionalPresentation ? 0.42 : 0.23;
      });
    });
    boundary.position.copy(origin.position);
    boundary.scale.setScalar(Math.max(result.sourceRadius, 0.001));
    boundary.visible = result.sourceRadius > 0.025
      && (!instructionalPresentation || instructionalPresentation.boundary);
    const toSource = charge.position.clone().sub(origin.position);
    const toProbe = tipPosition.clone().sub(origin.position);
    const showVectors = selected !== null
      && (!instructionalPresentation || instructionalPresentation.vectors);
    sourceVector.visible = showVectors && toSource.length() > 0.02;
    observationVector.visible = showVectors && toProbe.length() > 0.02;
    if (sourceVector.visible) {
      sourceVector.position.copy(origin.position);
      sourceVector.setDirection(toSource.clone().normalize());
      sourceVector.setLength(toSource.length(), 0.07, 0.035);
    }
    if (observationVector.visible) {
      observationVector.position.copy(origin.position);
      observationVector.setDirection(toProbe.clone().normalize());
      observationVector.setLength(toProbe.length(), 0.08, 0.04);
    }
    sourceVectorLabel.visible = showVectors;
    observationVectorLabel.visible = showVectors;
    physicalDistanceLine.visible = Boolean(instructionalPresentation?.distance);
    physicalDistanceLabel.visible = physicalDistanceLine.visible;
    if (physicalDistanceLine.visible) {
      setLine(physicalDistanceLine, charge.position, tipPosition);
      physicalDistanceLabel.position.copy(charge.position).add(tipPosition).multiplyScalar(0.5);
      physicalDistanceLabel.position.y += 0.14;
      physicalDistanceLabel.userData.draw(['distance ' + result.physicalDistance.toFixed(2) + ' m']);
    }
    sourceVectorLabel.userData.draw([`r′  O → +q    ${result.sourceRadius.toFixed(2)} m`], '#ffc99f');
    observationVectorLabel.userData.draw([`r  O → probe    ${result.r.toFixed(2)} m`], '#a0f3df');
    const exact = result.exactPotential === null ? 'undefined at charge' : `${result.exactPotential.toFixed(2)} V`;
    exactMeter.position.copy(tipPosition).add(new THREE.Vector3(0.20, 0.19, 0.08));
    exactMeter.userData.draw(['EXACT POTENTIAL', exact], '#a0f3df');
    handleMeter.userData.draw(['EXACT', exact], '#a0f3df');
    termMeter.visible = mathRevealed && (!instructionalPresentation || instructionalPresentation.terms);
    if (termMeter.visible) {
      if (selected === 'origin') {
        termMeter.userData.draw(['Qn = q(z′)ⁿ',
          'Q0 = 1 nC',
          `Q1 = ${(result.moments[1] / NANOCOULOMB).toFixed(2)} nC·m`,
          `Q2 = ${(result.moments[2] / NANOCOULOMB).toFixed(2)} nC·m²`], '#d4c7ff');
      } else drawTerms(termMeter, result);
    }
    refreshCue(result);
    onStateChange({
      mode, selected, mathRevealed, prediction, lastAction, result,
      tipPosition: tipPosition.clone(), sourcePosition: charge.position.clone(),
    });
    return result;
  }
  function select(role) {
    selected = role;
    mathRevealed = true;
    update();
  }
  function clearSelection(role) {
    if (selected === role) { selected = null; update(); }
  }
  function recordPrediction(value) {
    prediction = value;
    lastAction = 'prediction';
    update();
  }
  sameButton.userData.action = () => recordPrediction('unchanged');
  changesButton.userData.action = () => recordPrediction('changes');
  function reset() {
    origin.position.copy(ORIGIN_START);
    probe.position.copy(PROBE_START);
    probe.position.sub(WAND_TIP_OFFSET);
    probe.quaternion.identity();
    selected = null;
    mathRevealed = false;
    prediction = null;
    lastAction = 'initial';
    for (const mesh of [originHandle, originCore, originFaceRing, originDepthRing]) setGrab(mesh, false);
    setGrab(probeHandle, false);
    update();
  }
  const originInteraction = (mesh) => ({
    mesh, object: origin,
    constrain: () => {
      origin.position.x = SOURCE.x;
      origin.position.z = SOURCE.z;
      origin.position.y = THREE.MathUtils.clamp(origin.position.y, 0.79, 1.87);
    },
    onHover: (hovered) => hovered ? select('origin') : clearSelection('origin'),
    onGrab: () => { setGrab(mesh, true); select('origin'); },
    onMove: () => { lastAction = 'origin'; mathRevealed = true; update(); },
    onRelease: () => { setGrab(mesh, false); clearSelection('origin'); },
    onCancel: () => { setGrab(mesh, false); clearSelection('origin'); },
  });
  const interactables = [
    originInteraction(originHandle),
    {
      mesh: probeHandle, object: probe, rotateWithController: true,
      constrain: () => {
        probe.position.x = THREE.MathUtils.clamp(probe.position.x, -2.2, 2.2);
        probe.position.y = THREE.MathUtils.clamp(probe.position.y, 0.35, 2.4);
        probe.position.z = THREE.MathUtils.clamp(probe.position.z, -2.0, 1.1);
      },
      onHover: (hovered) => hovered ? select('probe') : clearSelection('probe'),
      onGrab: () => { setGrab(probeHandle, true); select('probe'); },
      onMove: () => { lastAction = 'probe'; mathRevealed = true; update(); },
      onRelease: () => { setGrab(probeHandle, false); clearSelection('probe'); },
      onCancel: () => { setGrab(probeHandle, false); clearSelection('probe'); },
    },
    originInteraction(originCore),
    originInteraction(originFaceRing),
    originInteraction(originDepthRing),
  ];
  reset();
  return {
    root, charge, origin, probe, probeHandle, probeTip, equipotentials, boundary,
    sourceVector, observationVector, physicalDistanceLine, savedMarkers,
    interactables, buttons: [sameButton, changesButton], update, reset, recordPrediction,
    attachHud(camera) { camera.add(hud); },
    setPresentation(value) {
      const key = JSON.stringify(value);
      if (key === presentationKey) return;
      instructionalPresentation = value;
      presentationKey = key;
      update();
    },
    get presentation() { return instructionalPresentation; },
    setVrVisible(value) { xrVisible = value; update(); },
    setMode(value) { mode = value === 'free' ? 'free' : 'guided'; update(); },
    get mode() { return mode; },
    get readout() { return lastResult; },
    get mathRevealed() { return mathRevealed; },
    faceLabels(camera) {
      camera.getWorldQuaternion(quat);
      [plus, exactMeter, termMeter, physicalDistanceLabel, sourceVectorLabel, observationVectorLabel,
        ...savedMarkers.map((marker) => marker.userData.label),
        ...equipotentials.map((patch) => patch.userData.valueLabel)]
        .forEach((mesh) => mesh.quaternion.copy(quat));
      probe.getWorldQuaternion(probeQuat).invert().multiply(quat);
      handleMeter.quaternion.copy(probeQuat);
    },
  };
}
