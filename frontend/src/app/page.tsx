import { redirect } from "next/navigation";

/** Root redirects to onboarding on first visit */
export default function RootPage() {
  redirect("/onboarding");
}
