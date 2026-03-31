import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { useAuth } from "@/lib/auth";

function DashboardPlaceholder() {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-white">
      <h1 className="mb-2 text-2xl font-bold">AERO Dashboard</h1>
      <p className="mb-4 text-slate-400">
        Welcome, {user?.first_name} {user?.last_name} — {user?.system_role}
      </p>
      <p className="mb-6 text-sm text-slate-500">
        Dashboard — coming in T04
      </p>
      <button
        onClick={logout}
        className="rounded-md bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
      >
        Sign out
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPlaceholder />} />
          <Route path="*" element={<DashboardPlaceholder />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
