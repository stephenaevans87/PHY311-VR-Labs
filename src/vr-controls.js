import * as THREE from 'three';

export const GUIDE_HOME = Object.freeze({ x: 1.42, y: 1.62, z: -1.08, yaw: -Math.atan2(1.42, 1.08) });

export function resetGuidePose(panel) {
  panel.position.set(GUIDE_HOME.x, GUIDE_HOME.y, GUIDE_HOME.z);
  panel.rotation.set(0, GUIDE_HOME.yaw, 0);
}

function button(label, action, tone = '#29445a', width = 0.32, height = 0.1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, depthTest: false, depthWrite: false }),
  );
  mesh.userData.action = action;
  mesh.userData.setLabel = (value) => {
    context.fillStyle = tone;
    context.fillRect(0, 0, 512, 160);
    context.strokeStyle = '#a8d9e0';
    context.lineWidth = 7;
    context.strokeRect(4, 4, 504, 152);
    context.fillStyle = '#ffffff';
    context.font = 'bold 54px system-ui';
    context.textAlign = 'center';
    context.fillText(value, 256, 105, 470);
    texture.needsUpdate = true;
  };
  mesh.userData.setLabel(label);
  return mesh;
}

function promptPlate() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 350;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.315),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }),
  );
  mesh.userData.setText = (title, message) => {
    context.fillStyle = 'rgba(18, 34, 44, 0.94)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#9debd9';
    context.fillRect(0, 0, 12, canvas.height);
    context.font = 'bold 62px system-ui';
    context.fillText(title, 36, 76, 945);
    context.font = '44px system-ui';
    context.fillStyle = '#ffffff';
    const words = message.split(' ');
    const lines = [''];
    for (const word of words) {
      const current = lines.length - 1;
      const candidate = lines[current] ? lines[current] + ' ' + word : word;
      if (context.measureText(candidate).width > 945 && lines[current]) lines.push(word);
      else lines[current] = candidate;
    }
    lines.slice(0, 3).forEach((line, i) => context.fillText(line, 36, 151 + i * 66, 945));
    texture.needsUpdate = true;
  };
  return mesh;
}

export function createVrLessonControls(scene, actions) {
  const panel = new THREE.Group();
  panel.name = 'world-anchored-lesson-guide';
  resetGuidePose(panel);
  scene.add(panel);
  const lesson = new THREE.Group();
  panel.add(lesson);
  const grip = button('GRAB GUIDE', null, '#524d83', 0.35, 0.085);
  grip.position.set(0, 0.37, 0.012);
  lesson.add(grip);
  const prompt = promptPlate();
  lesson.add(prompt);
  const repeat = button('Repeat', actions.repeat, '#29445a', 0.28, 0.085);
  const next = button('Next', actions.next, '#29445a', 0.28, 0.085);
  const explain = button('Explain', actions.explain, '#29445a', 0.28, 0.085);
  [repeat, next, explain].forEach((mesh, i) => {
    mesh.position.set((i - 1) * 0.31, -0.23, 0.003);
    lesson.add(mesh);
  });
  const choices = Array.from({ length: 4 }, (_, i) => {
    const mesh = button('', () => {}, '#365963', 0.215, 0.085);
    mesh.position.set((i - 1.5) * 0.235, -0.34, 0.003);
    lesson.add(mesh);
    return mesh;
  });
  const distance = button('Distance', actions.distance, '#365963', 0.28, 0.085);
  distance.position.set(-0.31, -0.45, 0.003);
  lesson.add(distance);
  panel.visible = false;
  const panelInteraction = {
    mesh: grip, object: panel, rotateWithController: true,
    enabled: () => panel.visible,
    constrain: () => {
      panel.position.x = THREE.MathUtils.clamp(panel.position.x, -2.4, 2.6);
      panel.position.y = THREE.MathUtils.clamp(panel.position.y, 0.8, 2.25);
      panel.position.z = THREE.MathUtils.clamp(panel.position.z, -3.2, -0.3);
      panel.rotation.x = 0;
      panel.rotation.z = 0;
    },
  };
  function setState(view) {
    prompt.userData.setText(view.mode === 'free' ? 'FREE EXPLORATION' : view.title, view.vrMessage);
    repeat.visible = view.mode === 'guided';
    next.visible = view.mode === 'guided';
    explain.userData.setLabel(view.explained ? 'Hide help' : 'Explain');
    distance.userData.setLabel(view.showDistance ? 'Hide distance' : 'Distance');
    distance.visible = view.mode === 'guided' && !view.isOrigin;
    if (view.mode === 'free') {
      choices.forEach((mesh, i) => {
        mesh.visible = !view.isOrigin;
        mesh.userData.setLabel(i === 3
          ? (view.showDistance ? 'Distance ✓' : 'Distance')
          : (view.freeShells[i] ? 'Sphere ' + (i + 1) + ' ✓' : 'Sphere ' + (i + 1)));
        mesh.userData.action = () => i === 3 ? actions.distance() : actions.shell(i);
      });
    } else {
      const options = [...(view.canPin ? [{ label: 'Pin', action: actions.pin }] : []),
        ...view.predictionOptions.map((option) => ({
          label: option.label, action: () => actions.predict(option.value),
        }))];
      choices.forEach((mesh, i) => {
        mesh.visible = i < options.length;
        if (mesh.visible) {
          mesh.userData.setLabel(options[i].label);
          mesh.userData.action = options[i].action;
        }
      });
    }
  }
  return {
    panel, grip, interactables: [panelInteraction],
    buttons: [repeat, next, explain, ...choices, distance],
    setWorldVisible: (value) => { panel.visible = value; },
    setVisible: (value) => { lesson.visible = value; },
    resetPosition: () => resetGuidePose(panel),
    setState,
  };
}

export function createVrControls(parent, { recenter, resetLab, resetPanelPosition, switchStation, switchInvestigation, switchMode, exit }) {
  // Session controls share the stationary guide, so no UI follows head motion.
  const panel = new THREE.Group();
  panel.position.set(0.65, -0.04, 0.003);
  parent.add(panel);
  const buttons = [
    button('Recenter', recenter),
    button('Reset lab', resetLab),
    button('Reset panel', resetPanelPosition),
    button('Station', switchStation),
    button('Investigation', switchInvestigation),
    button('Mode: guided', switchMode),
    button('Exit VR', exit, '#624047'),
  ];
  buttons.forEach((mesh, i) => {
    mesh.position.y = (3 - i) * 0.12;
    panel.add(mesh);
  });
  panel.visible = false;
  return {
    buttons,
    setVisible: (visible) => { panel.visible = visible; },
    setMode: (mode) => buttons[5].userData.setLabel(`Mode: ${mode}`),
  };
}
