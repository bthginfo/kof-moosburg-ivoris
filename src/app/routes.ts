import { createBrowserRouter } from "react-router";
import { KFOLayout } from "./components/KFOLayout";
import { KFOHomePage } from "./components/pages/KFOHomePage";
import { ImpressumDatenschutzPage } from "./components/pages/ImpressumDatenschutzPage";
import { PreisrechnerPage } from "./components/pages/PreisrechnerPage";
import { LoginPage } from "./components/pages/mitarbeiter/LoginPage";
import { ProtectedLayout } from "./components/pages/mitarbeiter/ProtectedLayout";
import { DashboardPage } from "./components/pages/mitarbeiter/DashboardPage";
import { AnfragenPage } from "./components/pages/mitarbeiter/AnfragenPage";
import { KVListPage } from "./components/pages/mitarbeiter/KVListPage";
import { KVErstellenPage } from "./components/pages/mitarbeiter/KVErstellenPage";
import { PunktwertePage } from "./components/pages/mitarbeiter/PunktwertePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: KFOLayout,
    children: [
      { index: true, Component: KFOHomePage },
      { path: "impressum-datenschutz", Component: ImpressumDatenschutzPage },
      { path: "preisrechner", Component: PreisrechnerPage },
      { path: "*", Component: KFOHomePage },
    ],
  },
  {
    path: "/mitarbeiter/login",
    Component: LoginPage,
  },
  {
    path: "/mitarbeiter",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "anfragen", Component: AnfragenPage },
      { path: "kostenvoranschlaege", Component: KVListPage },
      { path: "kv-erstellen", Component: KVErstellenPage },
      { path: "punktwerte", Component: PunktwertePage },
    ],
  },
]);
