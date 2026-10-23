# Approved Lesson 14 design constraints

This note records the approved instructional design refinements. Technical Milestone 1 adds only reusable locomotion and interaction; none of the Lesson 14 experiments are implemented yet.

## Multipole visualization

The common comparison scale will be the **signed contribution to electric potential at the current probe**:

\[V_n(r,\theta)=\frac{1}{4\pi\varepsilon_0}\frac{Q_n}{r^{n+1}}P_n(\cos\theta).\]

Moments \(Q_n\) have different units (C·m\(^n\)) and must not be plotted as comparable bars. A future readout may show an individual moment with its correct units, but the spatial comparison will use \(V_n\) in volts. Full potential, truncated series, and numerical reference calculations will be identified separately.

## Experiment 1: a movable coordinate origin

The physical charge and observation probe remain fixed in world space while the student moves the origin along the lesson's symmetry axis. The reference axis, vector from origin to source \(\mathbf r'\), vector from origin to observation \(\mathbf r\), and exterior convergence boundary \(R_{\max}\) update immediately. The exact physical potential remains fixed. The exterior series is shown only where \(r>R_{\max}\).

The first prompt asks for a physical prediction without formulas. After students observe that the potential stays fixed while the coordinate geometry changes, a contextual reveal introduces source and observation notation. Multipole terms and the series appear only after the student has used the vectors and convergence boundary. Subsequent experiments follow the same physical-first progression.
