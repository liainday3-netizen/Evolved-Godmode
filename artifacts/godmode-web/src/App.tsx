import { Suspense, lazy } from "react";
import { Router as WouterRouter, Switch, Route } from "wouter";

const Home = lazy(() => import("@/pages/Home"));
const Chat = lazy(() => import("@/pages/Chat"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Community = lazy(() => import("@/pages/Community"));
const CodeGen = lazy(() => import("@/pages/CodeGen"));
const TradingBot = lazy(() => import("@/pages/TradingBot"));
const ImageStudio = lazy(() => import("@/pages/ImageStudio"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <WouterRouter>
      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            style={{
              minHeight: "100dvh",
              display: "grid",
              placeItems: "center",
              background: "#09090b",
              color: "#e4e4e7",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              letterSpacing: "0.08em",
            }}
          >
            LOADING GODMODE…
          </div>
        }
      >
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/chat" component={Chat} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/community" component={Community} />
          <Route path="/codegen" component={CodeGen} />
          <Route path="/trading" component={TradingBot} />
          <Route path="/studio" component={ImageStudio} />
          <Route path="/privacy" component={Privacy} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </WouterRouter>
  );
}

export default function App() {
  return <Router />;
}
