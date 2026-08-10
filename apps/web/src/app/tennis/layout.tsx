import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tennis Predictions, Rankings & Players | Residual Sports",
  description: "AI tennis predictions, win probabilities, predicted sets, player rankings, tournaments and match reasoning."
};

export default function TennisLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
