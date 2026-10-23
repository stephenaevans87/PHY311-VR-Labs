import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { createLab } from './scene.js';
import { setupInteractions } from './interactions.js';
import './style.css';

const root = document.getElementById('app');
root.innerHTML = `
  <main>
    <div id="view" aria-label="Interactive electrostatics laboratory"></div>
    <aside id="guide">
      <h1>PHY 311 · Electrostatics</h1>
      <p>Move the orange +1 nC and blue −1 nC charges. Place the green probe to measure electric potential and field magnitude. Move the cyan handle to reposition the Gaussian surface.</p>
      <div class="readout" id="readout" aria-live="polite"></div>
      <p class="hint">Desktop: drag objects with the mouse; drag the background to orbit, scroll to zoom. In VR: reach to an object and hold a trigger to grab it. Point a controller at <strong>Exit VR</strong> and press the trigger to leave.</p>
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

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 1.35, -1.5);
orbit.enableDamping = true;
orbit.minDistance = 0.7;
orbit.maxDistance = 8;
orbit.update();

const lab = createLab(scene);

const exitCanvas = document.createElement('canvas');
exitCanvas.width = 512;
exitCanvas.height = 160;
const ctx = exitCanvas.getContext('2d');
ctx.fillStyle = '#25364b';
ctx.fillRect(0, 0, 512, 160);
ctx.strokeStyle = '#a8d9e0';
ctx.lineWidth = 8;
ctx.strokeRect(4, 4, 504, 152);
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 65px system-ui';
ctx.textAlign = 'center';
ctx.fillText('Exit VR', 256, 105);
const exitTexture = new THREE.CanvasTexture(exitCanvas);
exitTexture.colorSpace = THREE.SRGBColorSpace;
const exitButton = new THREE.Mesh(
  new THREE.PlaneGeometry(0.48, 0.15),
  new THREE.MeshBasicMaterial({ map: exitTexture, side: THREE.DoubleSide }),
);
exitButton.position.set(1.12, 1.65, -1.15);
exitButton.visible = false;
scene.add(exitButton);

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

const updateInteractions = setupInteractions({ renderer, camera, scene, orbit, lab, exitButton, onChange: refresh });
renderer.xr.addEventListener('sessionstart', () => {
  orbit.enabled = false;
  exitButton.visible = true;
  status.textContent = 'VR session active';
});
renderer.xr.addEventListener('sessionend', () => {
  orbit.enabled = true;
  exitButton.visible = false;
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
renderer.setAnimationLoop(() => {
  if (!renderer.xr.isPresenting) orbit.update();
  updateInteractions();
  lab.faceLabels(renderer.xr.isPresenting ? renderer.xr.getCamera() : camera);
  renderer.render(scene, camera);
});
