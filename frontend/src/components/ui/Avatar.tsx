interface AvatarProps {
  initials: string;
  className?: string;
}

export function Avatar({ initials, className = "" }: AvatarProps) {
  return (
    <div
      className={[
        "w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center",
        "text-[11px] font-semibold shrink-0",
        className,
      ].join(" ")}
    >
      {initials}
    </div>
  );
}
