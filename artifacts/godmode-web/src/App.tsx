import { Router as WouterRouter, Switch, Route } from "wouter";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import Pricing from "@/pages/Pricing";
import Community from "@/pages/Community";
import CodeGen from "@/pages/CodeGen";
import TradingBot from "@/pages/TradingBot";
import ImageStudio from "@/pages/ImageStudio";
import Privacy from "@/pages/Privacy";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/community" component={Community} />
      <Route path="/codegen" component={CodeGen} />
      <Route path="/trading" component={TradingBot} />
      <Route path="/studio" component={ImageStudio} />
      <Route path="/privacy" component={Privacy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return (
    <WouterRouter base={base}>
      <Router />
    </WouterRouter>
  );
}

export default App;
