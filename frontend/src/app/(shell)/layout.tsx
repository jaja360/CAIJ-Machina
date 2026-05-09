import { ShellWrapper } from "@/components/layout/ShellWrapper";

/**
 * Shell layout wraps all main app pages with the retractable sidebar
 * and agent panel. Onboarding lives outside this group and renders standalone.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <ShellWrapper>{children}</ShellWrapper>;
}
