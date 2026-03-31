import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UserListPage } from "@/pages/users/UserListPage";
import { UserFormPage } from "@/pages/users/UserFormPage";
import { HelicopterListPage } from "@/pages/helicopters/HelicopterListPage";
import { HelicopterFormPage } from "@/pages/helicopters/HelicopterFormPage";
import { CrewListPage } from "@/pages/crew/CrewListPage";
import { CrewFormPage } from "@/pages/crew/CrewFormPage";
import { LandingSiteListPage } from "@/pages/landing-sites/LandingSiteListPage";
import { LandingSiteFormPage } from "@/pages/landing-sites/LandingSiteFormPage";
import { OperationListPage } from "@/pages/operations/OperationListPage";
import { OperationFormPage } from "@/pages/operations/OperationFormPage";
import { OrderListPage } from "@/pages/orders/OrderListPage";
import { OrderFormPage } from "@/pages/orders/OrderFormPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Dashboard — all roles */}
            <Route path="/" element={<DashboardPage />} />

            {/* Users — Administrator only */}
            <Route element={<RoleGuard allowedRoles={["Administrator"]} />}>
              <Route path="/users" element={<UserListPage />} />
              <Route path="/users/new" element={<UserFormPage />} />
              <Route path="/users/:id/edit" element={<UserFormPage />} />
            </Route>

            {/* Resources — Admin, Supervisor, Pilot (NOT Planner) */}
            <Route element={<RoleGuard allowedRoles={["Administrator", "Osoba nadzorująca", "Pilot"]} />}>
              <Route path="/helicopters" element={<HelicopterListPage />} />
              <Route path="/helicopters/new" element={<HelicopterFormPage />} />
              <Route path="/helicopters/:id/edit" element={<HelicopterFormPage />} />
              <Route path="/crew" element={<CrewListPage />} />
              <Route path="/crew/new" element={<CrewFormPage />} />
              <Route path="/crew/:id/edit" element={<CrewFormPage />} />
              <Route path="/landing-sites" element={<LandingSiteListPage />} />
              <Route path="/landing-sites/new" element={<LandingSiteFormPage />} />
              <Route path="/landing-sites/:id/edit" element={<LandingSiteFormPage />} />
            </Route>

            {/* Orders — Admin, Supervisor, Pilot (NOT Planner) */}
            <Route element={<RoleGuard allowedRoles={["Administrator", "Osoba nadzorująca", "Pilot"]} />}>
              <Route path="/orders" element={<OrderListPage />} />
              <Route path="/orders/new" element={<OrderFormPage />} />
              <Route path="/orders/:id" element={<OrderFormPage />} />
            </Route>

            {/* Operations — all roles (no guard needed) */}
            <Route path="/operations" element={<OperationListPage />} />
            <Route path="/operations/new" element={<OperationFormPage />} />
            <Route path="/operations/:id" element={<OperationFormPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
