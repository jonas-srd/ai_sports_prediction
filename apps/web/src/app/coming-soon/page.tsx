import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Sport Prediction | Stay Tuned",
  description: "AI predictions for football, NFL, NBA and tennis are getting ready for launch."
};

export const revalidate = 300;

export default function ComingSoonPage() {
  return (
    <main className="comingSoonShell" aria-labelledby="coming-soon-title">
      <section className="comingSoonHero">
        <img className="comingSoonMark" src="/site-icon.png" alt="" aria-hidden="true" />
        <p className="comingSoonEyebrow">AI Sport Prediction</p>
        <h1 id="coming-soon-title">Stay tuned</h1>
        <p className="comingSoonText">Football, NFL, NBA and tennis predictions are getting ready.</p>
      </section>
    </main>
  );
}
