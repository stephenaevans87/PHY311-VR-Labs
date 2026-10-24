import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { createLab } from './scene.js';
import { setupInteractions } from './interactions.js';
import { createPlayerRig } from './player-rig.js';
import { createVrControls, createVrLessonControls } from './vr-controls.js';
import { createOriginExperiment } from './experiments/origin-experiment.js';
import { createPotentialLesson } from './experiments/potential-lesson.js';
import './style.css';

const app = document.getElementById('app');
app.innerHTML = `
  <main>
    <div id="view" aria-label="Lesson 14 immersive physics laboratory"></div>
    <aside id="guide">
      <header><span class="eyebrow">PHY 311 · LESSON 14</span><h1>Potential around one charge</h1></header>
      <div class="station-switch"><button id="showLesson" class="selected">Experiment 1</button><button id="showSandbox">Electrostatics sandbox</button></div>
      <section id="lessonGuide" aria-label="Experiment 1 guide">
        <div class="mode-switch" aria-label="Experiment mode"><button id="guidedMode" class="selected">Guided Experiment</button><button id="freeMode">Free Exploration</button></div>
        <p class="role-key"><span class="source">+q fixed charge</span><span class="origin">O movable origin</span><span class="probe">◇ wand tip</span></p>
        <div id="guidance">
          <p class="eyebrow" id="lessonPhase"></p>
          <h2 id="lessonTitle"></h2>
          <p id="lessonPrompt"></p>
          <p class="hint" id="lessonFeedback" aria-live="polite"></p>
          <div id="predictionControl"><span id="predictionQuestion"></span><div id="predictionChoices"></div></div>
          <button id="pinReading" type="button">Pin tip reading</button>
          <p class="hint" id="lessonSamples"></p>
        </div>
        <div id="freeControls" hidden><p>Show only the geometry you want to inspect.</p><div id="shellControls"></div></div>
        <button id="distanceToggle" type="button">Show charge-to-tip distance</button>
        <div class="lesson-actions"><button id="repeatStep" type="button">Repeat phase</button><button id="nextStep" type="button">Next</button><button id="explainStep" type="button">Explain</button></div>
        <div id="lessonExplanation" class="lesson-explanation" hidden><p id="explanationText"></p><p id="lessonEquation" class="equation" hidden></p></div>
        <div class="readout" id="lessonReadout" aria-live="polite"></div>
        <button id="resetLesson" type="button">Reset experiment</button>
      </section>
      <section id="sandboxGuide" hidden aria-label="Electrostatics sandbox guide">
        <h2>Electrostatics sandbox</h2>
        <p>Move the positive and negative charges, probe, and Gaussian surface handle. Field arrows update with the charges.</p>
        <div class="readout" id="readout" aria-live="polite"></div>
        <button id="resetSandbox" type="button">Reset sandbox</button>
      </section>
      <p class="hint controls-hint">Desktop: drag the wand handle or violet origin; drag empty space to orbit. Quest 3: near grab or ray grab with a trigger. Left stick moves, right stick snap turns. Peripheral controls provide lesson choices, Recenter, Reset lab, Station, Mode, and Exit VR.</p>
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
const flow = createPotentialLesson();
let experiment;
let vrLessonControls;
let latestReading = null;
const byId = (id) => document.getElementById(id);

function renderLesson() {
  const state = flow.view();
  byId('guidance').hidden = state.mode === 'free';
  byId('freeControls').hidden = state.mode !== 'free';
  byId('guidedMode').classList.toggle('selected', state.mode === 'guided');
  byId('freeMode').classList.toggle('selected', state.mode === 'free');
  byId('lessonPhase').textContent = `PHASE ${state.phase} OF 2`;
  byId('lessonTitle').textContent = state.title;
  byId('lessonPrompt').textContent = state.prompt;
  byId('lessonFeedback').textContent = state.status || (state.step === 0
    ? 'The wand measures at its glowing tip.' : '');
  byId('lessonSamples').textContent = state.samples.map((sample, index) =>
    `Pin ${index + 1}: ${sample.distance.toFixed(2)} m · ${sample.potential.toFixed(2)} V`).join('  |  ');
  byId('pinReading').hidden = !state.canPin;
  byId('predictionControl').hidden = state.predictionOptions.length === 0;
  byId('predictionQuestion').textContent = state.predictionQuestion;
  const choices = byId('predictionChoices');
  choices.replaceChildren();
  for (const option of state.predictionOptions) {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.textContent = option.label;
    choice.classList.toggle('selected', state.prediction === option.value);
    choice.addEventListener('click', () => { flow.choosePrediction(option.value); renderLesson(); });
    choices.appendChild(choice);
  }
  const shells = byId('shellControls');
  shells.replaceChildren();
  state.freeShells.forEach((visible, index) => {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = `${visible ? 'Hide' : 'Show'} sphere ${index + 1}`;
    control.setAttribute('aria-pressed', String(visible));
    control.addEventListener('click', () => { flow.toggleFreeShell(index); renderLesson(); });
    shells.appendChild(control);
  });
  byId('distanceToggle').textContent = state.showDistance ? 'Hide charge-to-tip distance' : 'Show charge-to-tip distance';
  byId('distanceToggle').setAttribute('aria-pressed', String(state.showDistance));
  byId('lessonExplanation').hidden = !state.explanation;
  byId('explanationText').textContent = state.explanation;
  byId('lessonEquation').hidden = !state.equationVisible;
  byId('lessonEquation').textContent = state.phase === 1
    ? 'V = (1 / 4π ε₀) · q / d'
    : 'd = a  ⇒  V(a) = (1 / 4π ε₀) · q / a';
  byId('explainStep').textContent = state.explained ? 'Hide explanation' : 'Explain';
  byId('repeatStep').hidden = state.mode === 'free';
  byId('nextStep').hidden = state.mode === 'free';
  byId('nextStep').disabled = state.step === 4;
  if (latestReading) {
    const exact = latestReading.exactPotential === null ? 'undefined at charge' : `${latestReading.exactPotential.toFixed(2)} V`;
    const shellValues = experiment
      ? experiment.equipotentials.filter((surface) => surface.visible)
        .map((surface) => `${surface.userData.radius.toFixed(2)} m → ${surface.userData.potential.toFixed(2)} V`)
        .join('\n') : '';
    byId('lessonReadout').textContent = `Wand-tip exact potential  ${exact}\nCharge-to-tip distance    ${latestReading.physicalDistance.toFixed(2)} m`
      + (shellValues ? `\n\nEqual-potential spheres\n${shellValues}` : '');
  }
  vrLessonControls?.setState(state);
  experiment?.setPresentation(flow.presentation());
}

experiment = createOriginExperiment(scene, { onStateChange: ({ result, tipPosition }) => {
  latestReading = result;
  flow.observe(result, tipPosition);
  renderLesson();
} });
experiment.attachHud(camera);
renderLesson();

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
  vrLessonControls?.setVisible(renderer.xr.isPresenting && name === 'lesson');
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
  flow.setMode(mode);
  experiment.setMode(mode);
  vrControls?.setMode(mode);
  renderLesson();
}
function resetStation() {
  interactions?.cancelGrabs();
  if (station === 'lesson') { flow.reset(); experiment.reset(); renderLesson(); }
  else {
    for (const [object, position] of labStarts) object.position.copy(position);
    refreshSandbox();
  }
}
document.getElementById('showLesson').addEventListener('click', () => showStation('lesson'));
document.getElementById('showSandbox').addEventListener('click', () => showStation('sandbox'));
document.getElementById('guidedMode').addEventListener('click', () => setMode('guided'));
document.getElementById('freeMode').addEventListener('click', () => setMode('free'));
byId('pinReading').addEventListener('click', () => { flow.pin(); renderLesson(); });
byId('repeatStep').addEventListener('click', () => { flow.repeat(); renderLesson(); });
byId('nextStep').addEventListener('click', () => { flow.next(); renderLesson(); });
byId('explainStep').addEventListener('click', () => { flow.toggleExplain(); renderLesson(); });
byId('distanceToggle').addEventListener('click', () => { flow.toggleDistance(); renderLesson(); });
document.getElementById('resetLesson').addEventListener('click', () => { interactions?.cancelGrabs(); flow.reset(); experiment.reset(); renderLesson(); });
document.getElementById('resetSandbox').addEventListener('click', () => { interactions?.cancelGrabs(); for (const [object, position] of labStarts) object.position.copy(position); refreshSandbox(); });
showStation('lesson');
const vrControls = createVrControls(camera, {
  recenter: () => { interactions?.cancelGrabs(); player.recenter(); },
  resetLab: resetStation,
  switchStation: () => showStation(station === 'lesson' ? 'sandbox' : 'lesson'),
  switchMode: () => setMode(experiment.mode === 'guided' ? 'free' : 'guided'),
  exit: () => renderer.xr.getSession()?.end(),
});
vrLessonControls = createVrLessonControls(camera, {
  repeat: () => { flow.repeat(); renderLesson(); },
  next: () => { flow.next(); renderLesson(); },
  explain: () => { flow.toggleExplain(); renderLesson(); },
  pin: () => { flow.pin(); renderLesson(); },
  predict: (value) => { flow.choosePrediction(value); renderLesson(); },
  shell: (index) => { flow.toggleFreeShell(index); renderLesson(); },
  distance: () => { flow.toggleDistance(); renderLesson(); },
});
renderLesson();
interactions = setupInteractions({
  renderer, camera, playerRig: player.rig, orbit, lab,
  uiButtons: [...vrControls.buttons, ...vrLessonControls.buttons, ...experiment.buttons],
  extraInteractables: experiment.interactables,
  onChange: refreshSandbox,
});
renderer.xr.addEventListener('sessionstart', () => {
  player.sessionStart();
  orbit.enabled = false;
  vrControls.setVisible(true);
  vrLessonControls.setVisible(station === 'lesson');
  experiment.setVrVisible(station === 'lesson');
  document.getElementById('status').textContent = 'VR session active';
});
renderer.xr.addEventListener('sessionend', () => {
  interactions.sessionEnd();
  player.sessionEnd();
  vrControls.setVisible(false);
  vrLessonControls.setVisible(false);
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
