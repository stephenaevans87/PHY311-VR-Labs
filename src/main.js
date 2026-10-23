import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { createLab } from './scene.js';
import { setupInteractions } from './interactions.js';
import { createPlayerRig } from './player-rig.js';
import { createVrControls } from './vr-controls.js';
import './style.css';

const root = document.getElementById('app');
root.innerHTML = `
  <main>
    <div id="view" aria-label="Interactive electrostatics laboratory"></div>
    <aside id="guide">
      <h1>PHY 311 · Electrostatics</h1>
      <p>Move the orange +1 nC and blue −1 nC charges. Place the green probe to measure electric potential and field magnitude. Move the cyan handle to reposition the Gaussian surface.</p>
      <div class="readout" id="readout" aria-live="polite"></div>
      <p class="hint">Desktop: drag objects with the mouse; drag the background to orbit, scroll to zoom. In VR: left stick moves, right stick snaps 30° turns. Reach or point at an object, then hold a trigger to grab. Push the right stick forward/back while distance grabbing to change depth. Use the small side controls to recenter, reset the lab, or exit VR.</p>
      <button id="resetLab" type="button">Reset lab objects</button>
      <p class="hint">Meters and SI units. Probe values use Coulomb’s law and superposition. Enclosed charge and flux use Gauss’s law. Arrows sample field direction and use a compressed length scale; they are not a flux calculation.</p>
      <p class="hint" id="status"></p>
      <a href="./PHY311_Dipole_VR_Pilot_v3_2.html">Legacy dipole lesson</a>
    </aside>
  </main>`;

const view = document.getElementById('view');
const readout = document.getElementById('readout');
const status = document.getElementById('status');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 50);
camera.position.set(0, 1.65, 1.1);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
view.appendChild(renderer.domElement);
const player = createPlayerRig({ scene, camera, renderer });

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 1.35, -1.5);
orbit.enableDamping = true;
orbit.minDistance = 0.7;
orbit.maxDistance = 8;
orbit.update();

const lab = createLab(scene);
const initialPositions = [lab.positive, lab.negative, lab.probe, lab.gaussian]
  .map((object) => [object, object.position.clone()]);

function refresh() {
  const { measurement, gauss } = lab.update();
  const probe = measurement
    ? `Potential: ${measurement.potential.toFixed(3)} V\nField magnitude: ${measurement.magnitude.toFixed(3)} V/m`
    : 'Probe: move clear of a charge';
  const q = gauss.enclosedCharge === null ? 'undefined at boundary' : `${(gauss.enclosedCharge * 1e9).toFixed(0)} nC`;
  const flux = gauss.flux === null ? 'undefined at boundary' : `${gauss.flux.toFixed(1)} N·m²/C`;
  readout.textContent = `${probe}\n\nEnclosed charge: ${q}\nNet flux: ${flux}`;
}
refresh();

let interactions;
function resetLab() {
  interactions?.cancelGrabs();
  for (const [object, position] of initialPositions) object.position.copy(position);
  refresh();
}
document.getElementById('resetLab').addEventListener('click', resetLab);
const vrControls = createVrControls(camera, {
  recenter: () => { interactions?.cancelGrabs(); player.recenter(); },
  resetLab,
  exit: () => renderer.xr.getSession()?.end(),
});
interactions = setupInteractions({
  renderer, camera, playerRig: player.rig, orbit, lab,
  uiButtons: vrControls.buttons, onChange: refresh,
});
renderer.xr.addEventListener('sessionstart', () => {
  player.sessionStart();
  orbit.enabled = false;
  vrControls.setVisible(true);
  status.textContent = 'VR session active';
});
renderer.xr.addEventListener('sessionend', () => {
  interactions.sessionEnd();
  player.sessionEnd();
  vrControls.setVisible(false);
  camera.position.set(0, 1.65, 1.1);
  orbit.target.set(0, 1.35, -1.5);
  orbit.enabled = true;
  orbit.update();
  status.textContent = '';
});

const vrButton = VRButton.createButton(renderer, { requiredFeatures: ['local-floor'] });
document.body.appendChild(vrButton);

function resize() {
  const width = view.clientWidth;
  const height = view.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
renderer.setAnimationLoop((time) => {
  if (renderer.xr.isPresenting) player.update(time);
  else orbit.update();
  interactions.update(time);
  lab.faceLabels(camera);
  renderer.render(scene, camera);
});
