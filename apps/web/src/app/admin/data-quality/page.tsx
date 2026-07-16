import type { Metadata } from "next";
import { DataQualityAdmin } from "@/components/data-quality-admin";

export const metadata: Metadata = {
  title: "Datenqualität | AI Sports Prediction",
  robots: { index: false, follow: false }
};

export default function DataQualityAdminPage() {
  return <DataQualityAdmin />;
}
