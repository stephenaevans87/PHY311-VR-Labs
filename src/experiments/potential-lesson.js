// Guided presentation and saved observations. Physical objects and exact physics
// remain independent of this state in both modes.
const STEPS = [
  { phase: 1, title: 'A · First reading', prompt: 'Place the wand tip near +q. Pin one reading.' },
  { phase: 1, title: 'A · Predict and test', prompt: 'Where should the tip go for a smaller reading? Predict, then pin a second distance. Try about twice as far.' },
  { phase: 1, title: 'A · Make sense of it', prompt: 'Compare the two distances and readings. Why did V change? Say your reason aloud, then open Explain.' },
  { phase: 2, title: 'B · Change direction', prompt: 'Predict what happens around +q at one distance. Pin three clearly different positions at about the same radius.' },
  { phase: 2, title: 'B · See the shape', prompt: 'Follow an amber surface with the wand. Why does its center stay on +q? Explain in your own words.' },
];

export function equalDistanceComparison(a, b) {
  const mean = (a.distance + b.distance) / 2;
  const radialTolerance = Math.max(0.045, mean * 0.05);
  const separation = Math.hypot(
    a.position.x - b.position.x,
    a.position.y - b.position.y,
    a.position.z - b.position.z,
  );
  return {
    equalRadius: Math.abs(a.distance - b.distance) <= radialTolerance,
    separated: separation >= Math.max(0.25, mean * 0.45),
    radialTolerance,
    separation,
  };
}

export function doubledDistanceComparison(a, b) {
  const near = a.distance <= b.distance ? a : b;
  const far = a.distance <= b.distance ? b : a;
  const ratio = far.distance / near.distance;
  return { near, far, ratio, approximatelyDouble: Math.abs(ratio - 2) <= 0.16 };
}

export function createPotentialLesson() {
  let mode = 'guided';
  let step = 0;
  let explained = false;
  let feedback = '';
  let latest = null;
  let distanceSamples = [];
  let symmetrySamples = [];
  let distanceCompared = false;
  let symmetryCompared = false;
  let prediction = null;
  let showDistance = false;
  const freeShells = [false, false, false];
  let freeExplanation = false;

  function observe({ physicalDistance, exactPotential }, position) {
    if (!Number.isFinite(physicalDistance) || !Number.isFinite(exactPotential)) return;
    latest = {
      distance: physicalDistance, potential: exactPotential,
      position: { x: position.x, y: position.y, z: position.z },
    };
  }

  function pin() {
    if (!latest || mode !== 'guided') return;
    const sample = { ...latest, position: { ...latest.position } };
    if (step === 0) {
      distanceSamples = [sample];
      step = 1;
      prediction = null;
      feedback = `First point: ${sample.distance.toFixed(2)} m, ${sample.potential.toFixed(2)} V. Predict before pinning the next.`;
    } else if (step === 1) {
      if (!distanceSamples.length) distanceSamples = [sample];
      const first = distanceSamples[0];
      const difference = Math.abs(first.distance - sample.distance);
      if (difference < Math.max(0.18, first.distance * 0.15)) {
        feedback = 'These distances are close. Move farther from or nearer to +q, then pin again.';
        return;
      }
      distanceSamples = [first, sample];
      distanceCompared = true;
      const comparison = doubledDistanceComparison(first, sample);
      const ratioV = comparison.near.potential / comparison.far.potential;
      feedback = `Distance ×${comparison.ratio.toFixed(2)}; potential ÷${ratioV.toFixed(2)}. `
        + (comparison.approximatelyDouble
          ? 'At about twice the distance, the reading is about half.'
          : 'For a clearer test, try placing the tip about twice as far. You can pin again.');
      if (prediction && prediction !== (sample.potential < first.potential ? 'lower' : 'higher'))
        feedback += ' How does this compare with your prediction?';
    } else if (step === 3) {
      if (symmetrySamples.length === 3) symmetrySamples = [];
      const anchor = symmetrySamples[0];
      const match = anchor && equalDistanceComparison(anchor, sample);
      const distinct = symmetrySamples.every((saved) => equalDistanceComparison(saved, sample).separated);
      if (anchor && (!match.equalRadius || !distinct)) {
        feedback = !match.equalRadius
          ? `Keep about ${anchor.distance.toFixed(2)} m from +q; within ${match.radialTolerance.toFixed(2)} m is close enough.`
          : 'Try another direction; the tip is still near a saved position.';
        return;
      }
      symmetrySamples.push(sample);
      if (symmetrySamples.length < 3) {
        feedback = `${symmetrySamples.length} position${symmetrySamples.length === 1 ? '' : 's'} saved. Move around +q at about the same distance.`;
      } else {
        symmetryCompared = true;
        const low = Math.min(...symmetrySamples.map((saved) => saved.potential));
        const high = Math.max(...symmetrySamples.map((saved) => saved.potential));
        feedback = `Three directions, nearly one radius: ${low.toFixed(2)}–${high.toFixed(2)} V. `
          + 'Small differences come from imperfectly matched distances. The first amber sphere passes through your reference radius.'
          + (prediction === 'change' ? ' How do the readings compare with your prediction?' : '');
      }
    }
  }

  function choosePrediction(value) {
    prediction = value;
    feedback = step === 1
      ? 'Keep that prediction in mind. Move the tip, then pin the second reading.'
      : 'Keep that prediction in mind. Try three different directions at one radius.';
  }

  function next() {
    if (step < STEPS.length - 1) step++;
    explained = false;
    prediction = null;
    feedback = '';
  }

  function repeat() {
    step = STEPS[step].phase === 1 ? 0 : 3;
    explained = false;
    prediction = null;
    feedback = '';
    if (step === 0) {
      distanceSamples = [];
      distanceCompared = false;
    } else {
      symmetrySamples = [];
      symmetryCompared = false;
    }
  }

  function reset() {
    step = 0;
    explained = false;
    feedback = '';
    latest = null;
    distanceSamples = [];
    symmetrySamples = [];
    distanceCompared = false;
    symmetryCompared = false;
    prediction = null;
    showDistance = false;
    freeShells.fill(false);
    freeExplanation = false;
  }

  function setMode(value) { mode = value === 'free' ? 'free' : 'guided'; }
  function toggleExplain() {
    if (mode === 'free') freeExplanation = !freeExplanation;
    else explained = !explained;
  }
  function toggleDistance() { showDistance = !showDistance; }
  function toggleFreeDistance() { toggleDistance(); }
  function toggleFreeShell(index) {
    if (index >= 0 && index < 3) freeShells[index] = !freeShells[index];
  }
  function explanation() {
    if (mode === 'free') return freeExplanation
      ? 'Exact point-charge potential depends on charge-to-tip distance. Equal-distance points have equal scalar V.' : '';
    if (!explained) return '';
    if (step <= 2 && !distanceCompared)
      return 'First compare two distances. Look at the physical charge-to-tip segment, then try Explain again.';
    if (step <= 2)
      return 'V is the exact potential in volts; q is the fixed charge, d is charge-to-tip distance, and ε₀ is vacuum permittivity. Coulomb’s 1/d law matches the readings: doubling d halves V. The law follows from accumulating work per unit charge in the point charge’s radial 1/d² field. When O sits on +q, the guide calls this distance r.';
    if (!symmetryCompared)
      return 'Check three different directions at about one charge-to-tip distance. Compare their exact V readings before opening the geometry.';
    return 'Here a is a fixed distance from +q, and V(a) is the exact potential at that distance. Every point on the sphere has that same scalar value. Amber patches show constant potential, not barriers or electric field lines. The electric field is a vector pointing outward and need not vanish on the surface.';
  }

  function view() {
    const current = STEPS[step];
    const samples = step <= 2 ? distanceSamples : symmetrySamples;
    const equationVisible = mode === 'free' ? freeExplanation
      : explained && (step <= 2 ? distanceCompared : symmetryCompared);
    let status = feedback;
    const prompt = step === 4 && !symmetryCompared
      ? 'The shape is still hidden. Repeat the direction comparison, or explore the surfaces in Free Exploration.'
      : current.prompt;
    return {
      mode, step, phase: current.phase, title: current.title, prompt,
      status, explanation: explanation(), explained: mode === 'free' ? freeExplanation : explained,
      equationVisible, samples: samples.map((item) => ({ ...item, position: { ...item.position } })),
      distanceCompared, symmetryCompared, prediction, showDistance,
      freeShells: [...freeShells],
      canPin: mode === 'guided' && [0, 1, 3].includes(step),
      predictionQuestion: step === 1 ? 'At a greater distance, should V be lower, unchanged, or higher?'
        : 'At the same distance in another direction, should V stay the same?',
      predictionOptions: mode === 'free' ? [] : step === 1
        ? [{ value: 'lower', label: 'Lower' }, { value: 'same', label: 'Same' }, { value: 'higher', label: 'Higher' }]
        : step === 3
          ? [{ value: 'same', label: 'Same V' }, { value: 'change', label: 'Changes' }]
          : [],
      vrMessage: mode === 'free' ? 'Toggle amber spheres or the charge-to-tip distance.'
        : equationVisible && step <= 2 ? 'V=(1/4πε₀)q/d. q: charge; d: tip distance; ε₀: vacuum permittivity. At 2d, V halves.'
          : equationVisible ? 'On a sphere d=a, so V(a)=(1/4πε₀)q/a. Equal V is scalar; field direction is outward.'
            : symmetryCompared && step >= 3 ? 'Three directions, nearly one radius. Small V differences come from placement. Amber sphere 1 matches your reference radius.'
            : explanation() || status || prompt,
    };
  }

  function presentation() {
    return {
      shells: mode === 'free' ? [...freeShells] : [0, 1, 2].map(() => symmetryCompared && step >= 3),
      shellRadii: symmetryCompared && symmetrySamples.length
        ? [1, 1.75, 2.5].map((scale) => symmetrySamples[0].distance * scale) : null,
      distance: showDistance,
      boundary: false, vectors: false, terms: false,
      samples: (mode === 'guided' ? (step <= 2 ? distanceSamples : symmetrySamples) : [])
        .map((sample) => ({ ...sample, position: { ...sample.position } })),
    };
  }

  return {
    observe, pin, choosePrediction, next, repeat, reset, setMode, toggleExplain,
    toggleDistance, toggleFreeDistance, toggleFreeShell, view, presentation,
  };
}
