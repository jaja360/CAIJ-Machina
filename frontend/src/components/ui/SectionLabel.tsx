interface SectionLabelProps {
  children: React.ReactNode;
  right?: React.ReactNode;
}

export function SectionLabel({ children, right }: SectionLabelProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.08em] uppercase text-ink-500">
        {children}
      </div>
      {right}
    </div>
  );
}
