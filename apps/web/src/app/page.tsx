/**
 * Purpose: Main Residual Sports frontend.
 * Reads production data through the dedicated API and falls back to sample data locally.
 */
import { HomePageContent } from "@/app/_route-content";

export const revalidate = 60;
export const dynamic = "force-static";

export default function HomePage() {
  return <HomePageContent locale="en" />;
}
