# PHY 311 VR Physics Laboratory

The first milestone is an interactive electrostatics sandbox for desktop browsers and Meta Quest 3. The former guided dipole page is preserved unchanged in [`legacy/PHY311_Dipole_VR_Pilot_v3_2.html`](legacy/PHY311_Dipole_VR_Pilot_v3_2.html).

## Run

```sh
npm ci
npm run dev
```

Open the printed local URL. Drag objects with the mouse, drag empty space to orbit, and scroll to zoom. The cyan knob moves the Gaussian surface. In VR, reach to an object and hold a controller trigger; release to leave it in place. Point at the small **Exit VR** control and press a trigger to end the immersive session. The browser or headset system exit is another route.

Quest WebXR requires a secure context. Use the HTTPS GitHub Pages deployment for headset testing; a desktop `localhost` development server is suitable for desktop work.

## Architecture

- `src/physics.js`: unit-aware Coulomb, superposition, and Gauss-law calculations, independent of rendering.
- `src/scene.js`: charge, probe, Gaussian surface, and field arrow objects; readout labels.
- `src/interactions.js`: desktop dragging, controller proximity grabbing, release, and the exit ray.
- `src/main.js`: renderer, camera, app shell, and module wiring.

All positions are metres; each charge is ±1 nC. The probe displays analytical point-charge potential in volts and electric-field magnitude in V/m. The Gaussian sphere has a fixed radius of 0.38 m and displays the exact enclosed charge and net flux `Q_enclosed / ε₀`. Flux is undefined when a point charge lies exactly on its boundary. The field arrows are samples of the analytical field; arrow lengths are compressed for legibility and do not represent flux integration. The probe readout is suppressed while its visible sphere overlaps a charge.

## Verification

```sh
npm test
npm run build
```

The test suite covers Coulomb scaling, opposite-charge superposition, singularities, enclosed charge, and flux. The build uses the repository-name base path `/PHY311-VR-Labs/`; `legacy/` is Vite's public directory so the archived page is available in the build. The GitHub Actions workflow runs tests and builds before publishing `dist/` to Pages. Configure the repository's Pages source as **GitHub Actions** to use it.

### Quest 3 physical test checklist

The following need physical headset verification; desktop tests cannot establish them:

1. Enter immersive VR over HTTPS and confirm a floor-level, room-scale reference space.
2. Reach for both charges, the probe, and the Gaussian handle with each controller; hold a trigger, move, and release. Confirm no object jumps when first grabbed.
3. Move a charge and observe field arrow direction and probe values update; move a charge across the Gaussian boundary and check enclosed charge and flux change together.
4. Walk around the workspace and verify labels remain readable and the experiment stays unobstructed.
5. Aim at **Exit VR** with either controller and press a trigger; verify the desktop scene resumes. Also verify the Quest system exit route.

Future experiments can add their own scene and measurement modules while reusing the input and renderer setup.
