/** Red "before" diff line */
export function DiffOld({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11.5px] leading-relaxed bg-red-50 text-red-900 ring-1 ring-red-200 px-3 py-2 rounded-md">
      <div className="flex gap-2">
        <span className="text-red-500 select-none font-bold">−</span>
        <span className="line-through decoration-red-400/70">{children}</span>
      </div>
    </div>
  );
}

/** Green "after" diff line */
export function DiffNew({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11.5px] leading-relaxed bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 px-3 py-2 rounded-md">
      <div className="flex gap-2">
        <span className="text-emerald-600 select-none font-bold">+</span>
        <span>{children}</span>
      </div>
    </div>
  );
}

/** Green addition block with left accent border */
export function DiffAdd({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11.5px] leading-relaxed bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 border-l-[3px] border-emerald-500 px-3 py-2 rounded-md">
      <div className="flex gap-2">
        <span className="text-emerald-600 select-none font-bold">+</span>
        <span>{children}</span>
      </div>
    </div>
  );
}
