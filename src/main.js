import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { createLab } from './scene.js';
import { setupInteractions } from './interactions.js';
import { createPlayerRig } from './player-rig.js';
import { createVrControls } from './vr-controls.js';
import { createOriginExperiment } from './experiments/origin-experiment.js';
import './style.css';

const app = document.getElementById('app');
app.innerHTML = `
  <main>
    <div id="view" aria-label="Lesson 14 immersive physics laboratory"></div>
    <aside id="guide">
      <header><span class="eyebrow">PHY 311 · LESSON 14</span><h1>Origin, source, and observation</h1></header>
      <div class="station-switch"><button id="showLesson" class="selected">Experiment 1</button><button id="showSandbox">Electrostatics sandbox</button></div>
      <section id="lessonGuide" aria-label="Experiment 1 guide">
        <div class="mode-switch" aria-label="Experiment mode"><button id="guidedMode" class="selected">Guided Experiment</button><button id="freeMode">Free Exploration</button></div>
        <p class="role-key"><span class="source">+q Source</span><span class="origin">O Origin</span><span class="probe">◇ Probe</span></p>
        <div id="guidance"><p id="lessonPrompt"></p><div id="predictionControl"><span>Optional prediction: if only O moves, will exact V change?</span><div><button id="predictSame">Stay the same</button><button id="predictChanges">Change</button></div></div><p class="hint" id="lessonInsight"></p></div>
        <div class="readout" id="lessonReadout" aria-live="polite"></div>
        <button id="resetLesson" type="button">Reset experiment</button>
      </section>
      <section id="sandboxGuide" hidden aria-label="Electrostatics sandbox guide">
        <h2>Electrostatics sandbox</h2>
        <p>Move the positive and negative charges, probe, and Gaussian surface handle. Field arrows update with the charges.</p>
        <div class="readout" id="readout" aria-live="polite"></div>
        <button id="resetSandbox" type="button">Reset sandbox</button>
      </section>
      <p class="hint controls-hint">Desktop: drag the violet origin or teal probe immediately; drag empty space to orbit. Quest 3: near grab or ray grab with a trigger. Left stick moves, right stick snap turns. The peripheral controls provide Recenter, Reset lab, Station, Mode, and Exit VR.</p>
      <p class="hint" id="status"></p>
      <a href="./PHY311_Dipole_VR_Pilot_v3_2.html">Legacy dipole lesson</a>
    </aside>
  </main>`;

const view = document.getElementById('view');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 50);
camera.position.set(0, 1.62, 0.98);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
view.appendChild(renderer.domElement);
const player = createPlayerRig({ scene, camera, renderer });
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0.36, 1.31, -1.75);
orbit.enableDamping = true;
orbit.minDistance = 0.85;
orbit.maxDistance = 8;
orbit.update();

const lab = createLab(scene);
const labStarts = [lab.positive, lab.negative, lab.probe, lab.gaussian].map((object) => [object, object.position.clone()]);
const lessonPrompt = document.getElementById('lessonPrompt');
const lessonInsight = document.getElementById('lessonInsight');
const lessonReadout = document.getElementById('lessonReadout');
const guidance = document.getElementById('guidance');
const predictionControl = document.getElementById('predictionControl');
const predictSame = document.getElementById('predictSame');
const predictChanges = document.getElementById('predictChanges');

const experiment = createOriginExperiment(scene, { onStateChange: ({ mode, selected, mathRevealed, prediction, lastAction, result }) => {
  guidance.hidden = mode === 'free';
  document.getElementById('guidedMode').classList.toggle('selected', mode === 'guided');
  document.getElementById('freeMode').classList.toggle('selected', mode === 'free');
  predictSame.classList.toggle('selected', prediction === 'unchanged');
  predictChanges.classList.toggle('selected', prediction === 'changes');
  lessonPrompt.textContent = lastAction === 'origin'
    ? 'You moved only the coordinate origin. The charge and probe stayed fixed while their coordinates and the exterior sphere changed.'
    : lastAction === 'probe'
      ? 'You moved the observation point. Its physical separation from the charge changed, so the exact voltage changed.'
      : 'The orange charge is fixed. Move the violet coordinate origin or the teal observation probe whenever you like.';
  lessonInsight.textContent = !mathRevealed
    ? 'Point at or grab either movable object to reveal its vectors and mathematical readout.'
    : !result.exterior
      ? 'Inside the violet sphere, exact Coulomb potential is still defined except at the charge. The exterior expansion is withheld.'
      : selected === 'origin'
        ? 'For this axial point charge, Qn = q(z′)^n. Q0 stays equal to the physical charge; higher moments depend on O.'
        : 'Vn = k Qn Pn(cos θ) / r^(n+1). The displayed contributions share volts; their n≤3 sum approximates the separate exact reading.';
  const exact = result.exactPotential === null ? 'undefined at charge' : `${result.exactPotential.toFixed(2)} V`;
  let output = `Exact potential       ${exact}`;
  if (mathRevealed) {
    output += `\nObservation r         ${result.r.toFixed(2)} m\nSource radius Rmax    ${result.sourceRadius.toFixed(2)} m`;
    if (selected === 'origin') {
      output += `\nQ0 1 nC    Q1 ${(result.moments[1] / 1e-9).toFixed(2)} nC·m    Q2 ${(result.moments[2] / 1e-9).toFixed(2)} nC·m²`;
    } else if (result.exterior) {
      output += `\nExterior n≤3         ${result.truncatedPotential.toFixed(2)} V\n${result.contributions.map((value, n) => `V${n} ${value >= 0 ? '+' : ''}${value.toFixed(2)} V`).join('    ')}`;
    } else output += '\nExterior series      withheld at r ≤ Rmax';
  }
  lessonReadout.textContent = output;
} });
experiment.attachHud(camera);

function refreshSandbox() {
  const { measurement, gauss } = lab.update();
  const probe = measurement
    ? `Potential: ${measurement.potential.toFixed(3)} V\nField magnitude: ${measurement.magnitude.toFixed(3)} V/m`
    : 'Probe: move clear of a charge';
  const q = gauss.enclosedCharge === null ? 'undefined at boundary' : `${(gauss.enclosedCharge * 1e9).toFixed(0)} nC`;
  const flux = gauss.flux === null ? 'undefined at boundary' : `${gauss.flux.toFixed(1)} N·m²/C`;
  document.getElementById('readout').textContent = `${probe}\n\nEnclosed charge: ${q}\nNet flux: ${flux}`;
}
refreshSandbox();
let interactions;
let station = 'lesson';
function showStation(name) {
  interactions?.cancelGrabs();
  station = name;
  experiment.root.visible = name === 'lesson';
  lab.root.visible = name === 'sandbox';
  experiment.setVrVisible(renderer.xr.isPresenting && name === 'lesson');
  document.getElementById('lessonGuide').hidden = name !== 'lesson';
  document.getElementById('sandboxGuide').hidden = name !== 'sandbox';
  document.getElementById('showLesson').classList.toggle('selected', name === 'lesson');
  document.getElementById('showSandbox').classList.toggle('selected', name === 'sandbox');
  if (!renderer.xr.isPresenting) {
    camera.position.set(0, 1.62, 0.98);
    orbit.target.set(name === 'lesson' ? 0.36 : 0, 1.31, name === 'lesson' ? -1.75 : -1.55);
    orbit.update();
  }
}
function setMode(mode) {
  experiment.setMode(mode);
  vrControls?.setMode(mode);
}
function resetStation() {
  interactions?.cancelGrabs();
  if (station === 'lesson') experiment.reset();
  else {
    for (const [object, position] of labStarts) object.position.copy(position);
    refreshSandbox();
  }
}
document.getElementById('showLesson').addEventListener('click', () => showStation('lesson'));
document.getElementById('showSandbox').addEventListener('click', () => showStation('sandbox'));
document.getElementById('guidedMode').addEventListener('click', () => setMode('guided'));
document.getElementById('freeMode').addEventListener('click', () => setMode('free'));
predictSame.addEventListener('click', () => experiment.recordPrediction('unchanged'));
predictChanges.addEventListener('click', () => experiment.recordPrediction('changes'));
document.getElementById('resetLesson').addEventListener('click', () => { interactions?.cancelGrabs(); experiment.reset(); });
document.getElementById('resetSandbox').addEventListener('click', () => { interactions?.cancelGrabs(); for (const [object, position] of labStarts) object.position.copy(position); refreshSandbox(); });
showStation('lesson');
const vrControls = createVrControls(camera, {
  recenter: () => { interactions?.cancelGrabs(); player.recenter(); },
  resetLab: resetStation,
  switchStation: () => showStation(station === 'lesson' ? 'sandbox' : 'lesson'),
  switchMode: () => setMode(experiment.mode === 'guided' ? 'free' : 'guided'),
  exit: () => renderer.xr.getSession()?.end(),
});
interactions = setupInteractions({
  renderer, camera, playerRig: player.rig, orbit, lab,
  uiButtons: [...vrControls.buttons, ...experiment.buttons],
  extraInteractables: experiment.interactables,
  onChange: refreshSandbox,
});
renderer.xr.addEventListener('sessionstart', () => {
  player.sessionStart();
  orbit.enabled = false;
  vrControls.setVisible(true);
  experiment.setVrVisible(station === 'lesson');
  document.getElementById('status').textContent = 'VR session active';
});
renderer.xr.addEventListener('sessionend', () => {
  interactions.sessionEnd();
  player.sessionEnd();
  vrControls.setVisible(false);
  experiment.setVrVisible(false);
  camera.position.set(0, 1.62, 0.98);
  orbit.target.set(station === 'lesson' ? 0.36 : 0, 1.31, station === 'lesson' ? -1.75 : -1.55);
  orbit.enabled = true;
  orbit.update();
  document.getElementById('status').textContent = '';
});
document.body.appendChild(VRButton.createButton(renderer, { requiredFeatures: ['local-floor'] }));
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
  experiment.faceLabels(camera);
  renderer.render(scene, camera);
});
