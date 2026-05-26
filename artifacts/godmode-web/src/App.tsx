import { Router as WouterRouter, Switch, Route } from "wouter";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat/:id" component={Chat} />
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
