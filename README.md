# PHY 311 VR Physics Laboratory

The laboratory opens with Lesson 14 Experiment 1, **Potential around one charge**, for desktop browsers and Meta Quest 3. The original electrostatics sandbox remains available through **Electrostatics sandbox** on desktop or **Station** in VR. The former guided dipole page is preserved in [`legacy/PHY311_Dipole_VR_Pilot_v3_2.html`](legacy/PHY311_Dipole_VR_Pilot_v3_2.html).

## Run

```sh
npm ci
npm run dev
```

Open the printed local URL. Drag highlighted objects with the mouse, drag empty space to orbit, and scroll to zoom. In VR, the left thumbstick walks relative to headset direction and the right thumbstick snaps 30° turns. Reach for an object or aim a controller ray at it, hold the trigger to grab, and release to leave it in place. While holding a distant object, push the right thumbstick forward/back to adjust its distance. A small peripheral VR panel provides **Recenter**, **Reset lab**, **Station**, **Mode**, and **Exit VR**. Physical room-scale movement still works. The Quest system exit is another route.

Quest WebXR requires a secure context. Use the HTTPS GitHub Pages deployment for headset testing; a desktop `localhost` development server is suitable for desktop work.

## Lesson 14 Experiment 1

Experiment 1 opens as a sparse interaction prototype with one **fixed orange +1 nC charge**, a **movable violet coordinate origin** on the source's symmetry axis, and a **handheld teal measuring wand**. The wand's glowing tip is the observation point. Both instruments work immediately. Three transparent source-centered spherical equipotential cutaways remain hidden until the student compares equal-distance readings in Guided Experiment, or enables them in Free Exploration.

In **Guided Experiment**, pin one reading, predict the effect of a larger distance, and pin another—ideally at about twice the radius. The comparison appears before the optional Coulomb equation. Next, predict whether direction matters and pin three separated points at approximately one radius. Their comparison reveals the three equipotential patches; the patch nearest the wand tip is emphasized. Saved readings remain beside their measurement positions. **Repeat phase**, **Next**, and **Explain** remain available without locking the wand or origin. **Free Exploration** offers independent sphere and charge-to-tip distance toggles with the same underlying physics.

- Move or turn the teal wand to change its tip's physical separation from the charge and exact potential.
- Move the violet origin freely along its reference axis. The exact potential stays fixed when the charge and wand tip stay fixed.
- Walk or move the wand through a revealed amber surface: it is a visual contour of equal potential, not a barrier or field line.

For these phases, `d` in `V = (1 / 4π ε₀)q/d` means the physical distance from the charge to the wand tip. It equals the guide's observation radius `r` when the coordinate origin is placed on the charge. In Guided mode the first amber cutaway is placed at the first successful symmetry reading radius; the other two lie at 1.75 and 2.5 times that radius. In Free Exploration before such a comparison, the default radii are 0.9, 1.6, and 2.3 m. Each represents the exact level `V = kq / radius` and remains centered on the source when the origin moves. A tip exactly at the point charge has undefined potential. The lesson's polar `z` axis is represented by Three.js world `y`; the origin stays on that axis. The existing multipole engine still calculates origin-dependent moments and the exterior domain for later phases, but their overlays are hidden in Phases 1 and 2.

This progression follows the [Lecture Review Guide](references/Lesson_14/PHY311_Lesson_14_Multipole_Expansion_Examples.pdf) Sections 1–2, [Student Workbook](references/Lesson_14/PHY311_Lesson_14_Multipole_Expansion_Examples_Student_Workbook.pdf) Activities 1–2, and [Worked Answer Key](references/Lesson_14/PHY311_Lesson_14_Multipole_Expansion_Examples_Worked_Answer_Key.pdf) on point charge moments, source versus observation coordinates, and the exterior domain. The [existing interactive HTML lab](references/Lesson_14/PHY311_Lesson_14_Multipole_Expansion_Examples_Interactive_Lab.html) provided the exact-versus-truncated comparison; Experiment 1 turns its coordinate and radius controls into physical movement.

## Architecture

- `src/physics.js`: unit-aware Coulomb, superposition, and Gauss-law calculations, independent of rendering.
- `src/scene.js`: charge, probe, Gaussian surface, and field arrow objects; readout labels.
- `src/player-rig.js`: tracked camera and controller parent, locomotion, snap turn, and recentering.
- `src/interactions.js`: desktop dragging, near grabbing, distance ray grabbing, and release.
- `src/vr-controls.js`: small head-relative station and contextual lesson controls.
- `src/experiments/potential-lesson.js`: Phase 1 and 2 prompts, evidence checks, and overlay visibility.
- `src/experiments/origin-physics.js`: pure point-source multipole math and exterior-domain checks.
- `src/experiments/origin-experiment.js`: Experiment 1 geometry, exact tip readout, and station-specific interactions.
- `src/main.js`: renderer, camera, app shell, and module wiring.

All positions are metres; each charge is ±1 nC. The probe displays analytical point-charge potential in volts and electric-field magnitude in V/m. The Gaussian sphere has a fixed radius of 0.38 m and displays the exact enclosed charge and net flux `Q_enclosed / ε₀`. Flux is undefined when a point charge lies exactly on its boundary. The field arrows are samples of the analytical field; arrow lengths are compressed for legibility and do not represent flux integration. The probe readout is suppressed while its visible sphere overlaps a charge.

## Verification

```sh
npm test
npm run build
```

The test suite covers Coulomb scaling, opposite-charge superposition, singularities, enclosed charge, flux, origin-dependent moments, invariant exact potential, multipole contributions, and the exterior convergence boundary. It also covers Phase 1 and 2 evidence checks, visibility, and free toggles. The build uses the repository-name base path `/PHY311-VR-Labs/`; `legacy/` is Vite's public directory so the archived page is available in the build. The GitHub Actions workflow runs tests and builds before publishing `dist/` to Pages. Configure the repository's Pages source as **GitHub Actions** to use it. This milestone is not deployed automatically.

### Quest 3 physical test checklist

The following need physical headset verification; desktop tests cannot establish them:

1. Enter immersive VR over HTTPS. Walk physically in the play area; check that headset and hands still track while the rig is stationary.
2. Push the left stick forward, back, left, and right while facing different directions. Movement should follow headset yaw without climbing or sinking when looking up or down. Release the stick and check that motion stops promptly.
3. Deflect the right stick horizontally and check one 30° turn per deflection. Return it to center before turning again; the tracked head should turn in place without an orbiting jump.
4. Reach for each charge, the probe, and the Gaussian handle with either controller. Hold a trigger, move, and release; verify no pickup or release jump. Then stand beyond reach, aim the ray, repeat, and use the right stick vertically while holding to move the object nearer/farther.
5. Move a charge and verify arrows and probe values update; move it across the Gaussian boundary and check enclosed charge and flux change together.
6. After joystick movement and physical walking, use **Recenter** from the peripheral controls. Check that the view returns to the starting position and faces the lab. Use **Reset lab** to restore the objects without changing the player position.
7. Aim at **Exit VR** with either controller and press a trigger; verify the desktop scene resumes. Also verify the Quest system exit route, and retry after re-entering VR.
8. At the Lesson 14 station, near grab and ray grab **both** the violet origin grip and teal wand handle. Turn the wand and verify its tip and exact reading move together. Check that the orange source cannot be grabbed. Move only the origin and confirm the exact reading holds.
9. Complete the two-distance and three-direction comparisons using the peripheral **Pin**, **Next**, **Repeat**, prediction, **Distance**, and **Explain** controls. Check that the first equation appears only after two readings and the sphere equation only after three matched-radius readings. Verify the first amber patch crosses the reference radius, all three stay centered on the charge, and none blocks movement.
10. Toggle **Free Exploration** and verify independent sphere visibility, optional distance overlay, and unrestricted grabbing. Return to **Guided Experiment** and verify progress persists. Check peripheral controls remain readable and clear of the apparatus. Use **Station** to switch to the sandbox and verify its objects and readouts still work.

The full instructional sequence is specified in [`docs/lesson14-experiment1-instructional-blueprint.md`](docs/lesson14-experiment1-instructional-blueprint.md). This milestone implements its first two phases; the coordinate-origin, multipole, convergence, and transfer phases remain for later work.

Future experiments can add their own scene and measurement modules while reusing the input and renderer setup.
