/**
 * Purpose: Main ranking dashboard.
 * Reads local SQLite data when available and falls back to sample data.
 */
import { HomePageContent } from "@/app/_route-content";

export const revalidate = 60;

export default function HomePage() {
  return <HomePageContent locale="en" />;
}
