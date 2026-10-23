# PHY 311 VR Physics Laboratory

The laboratory opens with Lesson 14 Experiment 1, **Origin, Source, and Observation**, for desktop browsers and Meta Quest 3. The original electrostatics sandbox remains available through **Electrostatics sandbox** on desktop or **Station** in VR. The former guided dipole page is preserved in [`legacy/PHY311_Dipole_VR_Pilot_v3_2.html`](legacy/PHY311_Dipole_VR_Pilot_v3_2.html).

## Run

```sh
npm ci
npm run dev
```

Open the printed local URL. Drag highlighted objects with the mouse, drag empty space to orbit, and scroll to zoom. In VR, the left thumbstick walks relative to headset direction and the right thumbstick snaps 30° turns. Reach for an object or aim a controller ray at it, hold the trigger to grab, and release to leave it in place. While holding a distant object, push the right thumbstick forward/back to adjust its distance. A small peripheral VR panel provides **Recenter**, **Reset lab**, **Station**, **Mode**, and **Exit VR**. Physical room-scale movement still works. The Quest system exit is another route.

Quest WebXR requires a secure context. Use the HTTPS GitHub Pages deployment for headset testing; a desktop `localhost` development server is suitable for desktop work.

## Lesson 14 Experiment 1

Experiment 1 opens as a sparse apparatus with one **fixed orange +1 nC charge**, a **movable violet coordinate origin** on the source's symmetry axis, and a **movable teal observation probe**. Both movable objects work immediately. The sandbox is hidden while Experiment 1 is active.

Use **Guided Experiment** for short contextual prompts and an optional prediction about whether shifting only the origin changes exact potential. Use **Free Exploration** to remove prompts while retaining the same simulation and readouts. Neither mode gates grabbing or movement. In VR, the prediction choices appear in a small peripheral cue; on desktop they are in the sidebar.

- Move only the violet origin: the charge and probe stay fixed, so the exact potential stays fixed. The exterior sphere and coordinate vectors change. Point at or grab the origin to see the source and observation vectors and origin-dependent moments.
- Move the teal probe: its physical separation from the charge changes, so exact potential generally changes. Point at or grab it to inspect the vectors and signed potential contributions at the probe.
- Move the probe inside the violet sphere: exact Coulomb potential remains meaningful except at the charge; the exterior sum is withheld at `r ≤ Rmax`. Move back outside to compare the truncated sum with the exact reading.

The lesson's polar `z` axis is represented by Three.js world `y`. Keeping the movable origin on that axis preserves the axial symmetry assumed by the Lesson 14 guide. The source moments are `Q_n = q(z')^n` about the chosen origin. The displayed term bars are signed **potential contributions in volts** at the probe, `V_n = k Q_n P_n(cos θ) / r^(n+1)`, through `n = 3`; they do not compare moments with different units. The exact point-charge potential is `kq / |r-r'|`. A probe exactly at the point charge has undefined potential. The exterior sphere is centered on the selected origin and has radius `Rmax = |r'|`. Its wire rings show the domain, not a physical conducting shell.

This progression follows the [Lecture Review Guide](references/Lesson_14/PHY311_Lesson_14_Multipole_Expansion_Examples.pdf) Sections 1–2, [Student Workbook](references/Lesson_14/PHY311_Lesson_14_Multipole_Expansion_Examples_Student_Workbook.pdf) Activities 1–2, and [Worked Answer Key](references/Lesson_14/PHY311_Lesson_14_Multipole_Expansion_Examples_Worked_Answer_Key.pdf) on point charge moments, source versus observation coordinates, and the exterior domain. The [existing interactive HTML lab](references/Lesson_14/PHY311_Lesson_14_Multipole_Expansion_Examples_Interactive_Lab.html) provided the exact-versus-truncated comparison; Experiment 1 turns its coordinate and radius controls into physical movement.

## Architecture

- `src/physics.js`: unit-aware Coulomb, superposition, and Gauss-law calculations, independent of rendering.
- `src/scene.js`: charge, probe, Gaussian surface, and field arrow objects; readout labels.
- `src/player-rig.js`: tracked camera and controller parent, locomotion, snap turn, and recentering.
- `src/interactions.js`: desktop dragging, near grabbing, distance ray grabbing, and release.
- `src/vr-controls.js`: small head-relative recenter, reset, station switch, mode, and exit controls.
- `src/experiments/origin-physics.js`: pure point-source multipole math and exterior-domain checks.
- `src/experiments/origin-experiment.js`: Experiment 1 geometry, contextual guidance, visualization, and station-specific interactions.
- `src/main.js`: renderer, camera, app shell, and module wiring.

All positions are metres; each charge is ±1 nC. The probe displays analytical point-charge potential in volts and electric-field magnitude in V/m. The Gaussian sphere has a fixed radius of 0.38 m and displays the exact enclosed charge and net flux `Q_enclosed / ε₀`. Flux is undefined when a point charge lies exactly on its boundary. The field arrows are samples of the analytical field; arrow lengths are compressed for legibility and do not represent flux integration. The probe readout is suppressed while its visible sphere overlaps a charge.

## Verification

```sh
npm test
npm run build
```

The test suite covers Coulomb scaling, opposite-charge superposition, singularities, enclosed charge, flux, origin-dependent moments, invariant exact potential, multipole contributions, and the exterior convergence boundary. The build uses the repository-name base path `/PHY311-VR-Labs/`; `legacy/` is Vite's public directory so the archived page is available in the build. The GitHub Actions workflow runs tests and builds before publishing `dist/` to Pages. Configure the repository's Pages source as **GitHub Actions** to use it. This milestone is not deployed automatically.

### Quest 3 physical test checklist

The following need physical headset verification; desktop tests cannot establish them:

1. Enter immersive VR over HTTPS. Walk physically in the play area; check that headset and hands still track while the rig is stationary.
2. Push the left stick forward, back, left, and right while facing different directions. Movement should follow headset yaw without climbing or sinking when looking up or down. Release the stick and check that motion stops promptly.
3. Deflect the right stick horizontally and check one 30° turn per deflection. Return it to center before turning again; the tracked head should turn in place without an orbiting jump.
4. Reach for each charge, the probe, and the Gaussian handle with either controller. Hold a trigger, move, and release; verify no pickup or release jump. Then stand beyond reach, aim the ray, repeat, and use the right stick vertically while holding to move the object nearer/farther.
5. Move a charge and verify arrows and probe values update; move it across the Gaussian boundary and check enclosed charge and flux change together.
6. After joystick movement and physical walking, use **Recenter** from the peripheral controls. Check that the view returns to the starting position and faces the lab. Use **Reset lab** to restore the objects without changing the player position.
7. Aim at **Exit VR** with either controller and press a trigger; verify the desktop scene resumes. Also verify the Quest system exit route, and retry after re-entering VR.
8. At the Lesson 14 station, immediately near grab and ray grab **both** the violet origin and teal probe. Check that the orange source cannot be grabbed. When either movable object is pointed at or held, its geometry vectors should appear; otherwise they should clear.
9. Move only the origin and confirm the exact voltage holds while the exterior sphere and moments change. Move only the probe and confirm its exact voltage changes. Move it inside the sphere and check that the exterior sum is withheld while exact voltage remains available.
10. Toggle **Free Exploration** and verify prompts disappear but grabbing and physics continue. Return to **Guided Experiment** and try the optional prediction control. Check that the cue and prediction buttons remain peripheral, readable, and clear of the apparatus. Use **Station** to switch to the sandbox and verify its old objects and readouts still work.

The approved Lesson 14 refinements are recorded in [`docs/lesson14-design.md`](docs/lesson14-design.md). Those experiments have not been implemented in this milestone.

Future experiments can add their own scene and measurement modules while reusing the input and renderer setup.
