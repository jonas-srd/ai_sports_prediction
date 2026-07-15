import type { Metadata } from "next";
import { MarketingStudioPreview } from "@/components/marketing-studio-preview";

export const metadata: Metadata = {
  title: "Marketing Studio | AI Sports Prediction",
  robots: { index: false, follow: false }
};

export default function MarketingStudioPage() {
  return <MarketingStudioPreview />;
}
