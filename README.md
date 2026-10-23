# PHY 311 VR Physics Laboratory

The first milestone is an interactive electrostatics sandbox for desktop browsers and Meta Quest 3. The former guided dipole page is preserved unchanged in [`legacy/PHY311_Dipole_VR_Pilot_v3_2.html`](legacy/PHY311_Dipole_VR_Pilot_v3_2.html).

## Run

```sh
npm ci
npm run dev
```

Open the printed local URL. Drag objects with the mouse, drag empty space to orbit, and scroll to zoom. The cyan knob moves the Gaussian surface. In VR, the left thumbstick walks relative to headset direction and the right thumbstick snaps 30° turns. Reach for an object or aim a controller ray at it, hold the trigger to grab, and release to leave it in place. While holding a distant object, push the right thumbstick forward/back to adjust its distance. A small peripheral VR panel provides **Recenter**, **Reset lab**, and **Exit VR** from anywhere in the workspace. Physical room-scale movement still works. The Quest system exit is another route.

Quest WebXR requires a secure context. Use the HTTPS GitHub Pages deployment for headset testing; a desktop `localhost` development server is suitable for desktop work.

## Architecture

- `src/physics.js`: unit-aware Coulomb, superposition, and Gauss-law calculations, independent of rendering.
- `src/scene.js`: charge, probe, Gaussian surface, and field arrow objects; readout labels.
- `src/player-rig.js`: tracked camera and controller parent, locomotion, snap turn, and recentering.
- `src/interactions.js`: desktop dragging, near grabbing, distance ray grabbing, and release.
- `src/vr-controls.js`: small head-relative recenter, reset, and exit controls.
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

1. Enter immersive VR over HTTPS. Walk physically in the play area; check that headset and hands still track while the rig is stationary.
2. Push the left stick forward, back, left, and right while facing different directions. Movement should follow headset yaw without climbing or sinking when looking up or down. Release the stick and check that motion stops promptly.
3. Deflect the right stick horizontally and check one 30° turn per deflection. Return it to center before turning again; the tracked head should turn in place without an orbiting jump.
4. Reach for each charge, the probe, and the Gaussian handle with either controller. Hold a trigger, move, and release; verify no pickup or release jump. Then stand beyond reach, aim the ray, repeat, and use the right stick vertically while holding to move the object nearer/farther.
5. Move a charge and verify arrows and probe values update; move it across the Gaussian boundary and check enclosed charge and flux change together.
6. After joystick movement and physical walking, use **Recenter** from the peripheral controls. Check that the view returns to the starting position and faces the lab. Use **Reset lab** to restore the objects without changing the player position.
7. Aim at **Exit VR** with either controller and press a trigger; verify the desktop scene resumes. Also verify the Quest system exit route, and retry after re-entering VR.

The approved Lesson 14 refinements are recorded in [`docs/lesson14-design.md`](docs/lesson14-design.md). Those experiments have not been implemented in this milestone.

Future experiments can add their own scene and measurement modules while reusing the input and renderer setup.
