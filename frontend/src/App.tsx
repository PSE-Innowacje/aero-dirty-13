import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UserListPage } from "@/pages/users/UserListPage";
import { UserFormPage } from "@/pages/users/UserFormPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/users" element={<UserListPage />} />
            <Route path="/users/new" element={<UserFormPage />} />
            <Route path="/users/:id/edit" element={<UserFormPage />} />
            <Route path="/helicopters" element={<PlaceholderPage />} />
            <Route path="/crew" element={<PlaceholderPage />} />
            <Route path="/landing-sites" element={<PlaceholderPage />} />
            <Route path="/operations" element={<PlaceholderPage />} />
            <Route path="/orders" element={<PlaceholderPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
