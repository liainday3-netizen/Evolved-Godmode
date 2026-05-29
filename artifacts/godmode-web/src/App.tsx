import { Router as WouterRouter, Switch, Route } from "wouter";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import Pricing from "@/pages/Pricing";
import Community from "@/pages/Community";
import CodeGen from "@/pages/CodeGen";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/community" component={Community} />
      <Route path="/codegen" component={CodeGen} />
      <Route>
        <Home />
      </Route>
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
