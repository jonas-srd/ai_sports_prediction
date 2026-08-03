export default function LoadingPage() {
  return (
    <main aria-busy="true" aria-label="Loading page" className="routeLoadingShell">
      <div className="routeLoadingHeader">
        <span className="routeLoadingPulse" />
        <span />
        <span />
      </div>
      <div className="routeLoadingGrid">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
