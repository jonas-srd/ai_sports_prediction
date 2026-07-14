import type { Metadata } from "next";
import { OutreachAdmin } from "@/components/outreach-admin";

export const metadata: Metadata = {
  title: "Outreach Cockpit | AI Sports Prediction",
  robots: { index: false, follow: false }
};

export default function OutreachAdminPage() {
  return <OutreachAdmin />;
}
