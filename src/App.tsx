import { useEffect } from "react";
import Layout from "./components/Layout";
import { useRoute } from "./lib/router";
import Dashboard from "./pages/Dashboard";
import LearnStaking from "./pages/LearnStaking";
import StrategySimulator from "./pages/StrategySimulator";
import ValidatorDetails from "./pages/ValidatorDetails";
import ValidatorExplorer from "./pages/ValidatorExplorer";
import { StrategyProvider } from "./state/StrategyContext";
import { ValidatorsProvider } from "./state/ValidatorsContext";

const TITLES = {
  dashboard: "Dashboard",
  validators: "Validators",
  validator: "Validator details",
  simulator: "Strategy simulator",
  learn: "Learn staking",
  notfound: "Page not found",
} as const;

export default function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = `${TITLES[route.name]} · GenLayer StakeWise`;
  }, [route]);

  return (
    <ValidatorsProvider>
      <StrategyProvider>
        <Layout route={route}>
          {route.name === "dashboard" && <Dashboard />}
          {route.name === "validators" && <ValidatorExplorer />}
          {route.name === "validator" && <ValidatorDetails id={route.id} />}
          {route.name === "simulator" && <StrategySimulator />}
          {route.name === "learn" && <LearnStaking />}
          {route.name === "notfound" && (
            <section className="empty">
              <h1>Page not found</h1>
              <p>That address does not exist in this app.</p>
              <a className="btn btn-primary" href="#/">
                Go to the dashboard
              </a>
            </section>
          )}
        </Layout>
      </StrategyProvider>
    </ValidatorsProvider>
  );
}
