// Nines mark: a pixel fuel pump in the Beacon night ramp with the warm lamp nozzle.
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <span className="flex size-8 items-center justify-center rounded-lg border border-input bg-card">
        <svg width="18" height="18" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="1" y="0" width="3" height="1" fill="#8AA5DC" />
          <rect x="1" y="1" width="3" height="1" fill="#DFE7FB" />
          <rect x="1" y="2" width="3" height="3" fill="#4C7DFF" />
          <rect x="4" y="2" width="1" height="1" fill="#8AA5DC" />
          <rect x="5" y="2" width="1" height="3" fill="#8AA5DC" />
          <rect x="5" y="1" width="1" height="1" fill="#FFD27A" />
          <rect x="0" y="5" width="5" height="1" fill="#DFE7FB" />
          <rect x="0" y="6" width="5" height="1" fill="#3558A6" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-[-0.01em]">Nines</span>
    </span>
  );
}
