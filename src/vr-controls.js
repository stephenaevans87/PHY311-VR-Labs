import * as THREE from 'three';

function button(label, action, tone = '#29445a') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext('2d');
  context.fillStyle = tone;
  context.fillRect(0, 0, 512, 160);
  context.strokeStyle = '#a8d9e0';
  context.lineWidth = 7;
  context.strokeRect(4, 4, 504, 152);
  context.fillStyle = '#ffffff';
  context.font = 'bold 58px system-ui';
  context.textAlign = 'center';
  context.fillText(label, 256, 105);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.1),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, depthTest: false, depthWrite: false }),
  );
  mesh.userData.action = action;
  return mesh;
}

export function createVrControls(camera, { recenter, resetLab, exit }) {
  // Head-relative and peripheral: these remain accessible after locomotion.
  const panel = new THREE.Group();
  panel.position.set(0.42, -0.22, -0.9);
  camera.add(panel);
  const buttons = [
    button('Recenter', recenter),
    button('Reset lab', resetLab),
    button('Exit VR', exit, '#624047'),
  ];
  buttons.forEach((mesh, i) => {
    mesh.position.y = (1 - i) * 0.12;
    panel.add(mesh);
  });
  panel.visible = false;
  return { buttons, setVisible: (visible) => { panel.visible = visible; } };
}
