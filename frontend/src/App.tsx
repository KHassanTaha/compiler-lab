import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AdminRoute, ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AuthProvider } from "./features/auth/AuthProvider";
import { AdminPage } from "./pages/AdminPage";
import { DocsPage } from "./pages/DocsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SharedRunPage } from "./pages/SharedRunPage";
import { WorkspacePage } from "./pages/WorkspacePage";

export default function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/docs" element={<DocsPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/runs/:id" element={<SharedRunPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppLayout>
    </AuthProvider>
  );
}
