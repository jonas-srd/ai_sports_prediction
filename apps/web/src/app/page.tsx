/**
 * Purpose: Main ranking dashboard.
 * Reads local SQLite data when available and falls back to sample data.
 */
import { HomePageContent } from "@/app/_route-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return <HomePageContent locale="en" />;
}
