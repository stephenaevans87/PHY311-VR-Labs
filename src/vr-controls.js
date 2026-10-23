import * as THREE from 'three';

function button(label, action, tone = '#29445a') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.1),
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

export function createVrControls(camera, { recenter, resetLab, switchStation, switchMode, exit }) {
  // Head-relative and peripheral: these remain accessible after locomotion.
  const panel = new THREE.Group();
  panel.position.set(0.42, -0.22, -0.9);
  camera.add(panel);
  const buttons = [
    button('Recenter', recenter),
    button('Reset lab', resetLab),
    button('Station', switchStation),
    button('Mode: guided', switchMode),
    button('Exit VR', exit, '#624047'),
  ];
  buttons.forEach((mesh, i) => {
    mesh.position.y = (2 - i) * 0.12;
    panel.add(mesh);
  });
  panel.visible = false;
  return {
    buttons,
    setVisible: (visible) => { panel.visible = visible; },
    setMode: (mode) => buttons[3].userData.setLabel(`Mode: ${mode}`),
  };
}
