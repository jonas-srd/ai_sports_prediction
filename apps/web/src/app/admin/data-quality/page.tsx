import type { Metadata } from "next";
import { DataQualityAdmin } from "@/components/data-quality-admin";

export const metadata: Metadata = {
  title: "Datenqualität | Residual Sports",
  robots: { index: false, follow: false }
};

export default function DataQualityAdminPage() {
  return <DataQualityAdmin />;
}
