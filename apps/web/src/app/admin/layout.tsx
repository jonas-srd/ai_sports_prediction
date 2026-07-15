import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminAccessBar } from "@/components/admin-access-bar";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-image-preview": "none",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  }
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminAccessBar />
      {children}
    </>
  );
}
