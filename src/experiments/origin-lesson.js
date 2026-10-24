// The origin investigation changes guidance and visible mathematics, never the apparatus.
const STEPS = [
  { title: 'C · Predict', prompt: 'Keep +q and the wand tip still. If you slide only O, will the exact voltage at the tip change?' },
  { title: 'C · Experiment', prompt: 'Grab the violet ring and slide O along the +z rail. Watch r′, the moments, and the exact wand reading.' },
  { title: 'C · Observe', prompt: 'Compare Q₀–Q₃ and V₀–V₃ with the exact reading. Which values follow the chosen origin?' },
  { title: 'C · Explain', prompt: 'Why can the expansion coefficients change while the physical voltage stays fixed? Open Explain, then say it in your own words.' },
  { title: 'C · Apply', prompt: 'Place O directly on +q. Predict which moments vanish, then check the origin readout. Try moving O across +q too.' },
];

export function createOriginLesson() {
  let step = 0;
  let mode = 'guided';
  let prediction = null;
  let centeredPrediction = null;
  let explained = false;
  let latest = null;
  let latestSample = null;
  let baseline = null;
  let moved = false;
  let probeMoved = false;

  function observe(result, sourcePosition, tipPosition, originPosition) {
    latest = result;
    const sample = { source: { ...sourcePosition }, tip: { ...tipPosition },
      origin: { ...originPosition }, exact: result.exactPotential };
    latestSample = sample;
    if (!baseline) baseline = sample;
    if (Math.abs(sample.origin.y - baseline.origin.y) > 0.015) moved = true;
    if (Math.hypot(sample.tip.x - baseline.tip.x, sample.tip.y - baseline.tip.y,
      sample.tip.z - baseline.tip.z) > 0.015) probeMoved = true;
  }
  function begin() { baseline = latestSample; moved = false; probeMoved = false; }
  function choosePrediction(value) {
    if (step === 4) centeredPrediction = value;
    else prediction = value;
  }
  function next() { step = Math.min(step + 1, STEPS.length - 1); explained = false; }
  function repeat() { step = 0; prediction = null; centeredPrediction = null; explained = false; begin(); }
  function reset() { repeat(); latest = null; latestSample = null; baseline = null; moved = false; probeMoved = false; }
  function setMode(value) { mode = value === 'free' ? 'free' : 'guided'; }
  function toggleExplain() { explained = !explained; }
  function view() {
    const centered = latest && latest.sourceRadius < 1e-9;
    const status = step === 4 && centered
      ? 'At O = +q: Q₀ = q and Q₁, Q₂, Q₃ vanish. In fact every Qₙ for n ≥ 1 vanishes.'
      : probeMoved && step <= 2
        ? 'The wand tip moved during this comparison. Its exact V can change; park it and Repeat to test only O.'
      : moved && step <= 2
        ? 'Only the coordinate origin moved. The fixed source and tip still give the same exact V.'
        : prediction && step <= 2 ? 'Keep that prediction; slide O and compare the exact reading.' : '';
    const explanation = explained ? (step === 4
      ? 'At the charge, r′ = 0, so Qₙ = q(r′)ⁿPₙ(cos θ′) = 0 for n ≥ 1. The undefined source angle causes no problem because the position factor tends to zero. Q₀ = q.'
      : 'The orange +q is the physical source; violet O chooses coordinates; the teal tip is the observation point. The vectors r′ (to source) and r (to tip) start at O; θ is the tip angle from +z. Moving O changes both vectors, so r − r′ and Vexact = kq/|r − r′| stay fixed. Qₙ describes the same charge about O, not another source. Vₙ are terms of one exterior series, not separate physical fields. A finite sum omits higher terms. The kernel expansion uses powers of r′/r, so it is guaranteed when r > Rmax = |r′|, outside the origin-centered sphere containing the source. Exact V remains defined at every tip position except the ideal point charge itself.') : '';
    return {
      mode, step, phase: 3, title: STEPS[step].title, prompt: STEPS[step].prompt,
      status, explanation, explained, equationVisible: explained,
      prediction, showDistance: true, freeShells: [false, false, false], canPin: false,
      predictionQuestion: step === 4 ? 'With O on +q, which moments vanish?'
        : 'Will moving only O change exact V at the fixed tip?',
      predictionOptions: mode === 'free' ? [] : step === 0
        ? [{ value: 'same', label: 'Same V' }, { value: 'change', label: 'Changes' }]
        : step === 4 ? [{ value: 'higher', label: 'Q₁ and above' }, { value: 'all', label: 'All moments' }]
          : [],
      vrMessage: mode === 'free' ? 'Move violet O; inspect Q₀–Q₃ and V₀–V₃ by the apparatus.'
        : explained ? (step === 4 ? 'At O = +q, r′ = 0: Q₀ = q; all higher Qₙ vanish.'
          : 'O changes r′, r, Qₙ, and Vₙ. r − r′ and exact V stay fixed. Exterior sum needs r > Rmax.')
          : status || STEPS[step].prompt,
      isOrigin: true, moved, probeMoved, centered, centeredPrediction,
    };
  }
  function presentation() {
    const reveal = mode === 'free' || moved || step >= 2;
    return { shells: [false, false, false], samples: [], distance: true,
      vectors: true, boundary: mode === 'free' || step >= 2,
      terms: reveal, moments: reveal };
  }
  return { observe, begin, choosePrediction, next, repeat, reset, setMode, toggleExplain, view, presentation };
}
