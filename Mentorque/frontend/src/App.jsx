import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import { Spinner } from "./components/Spinner";

// Route-level code splitting: the admin surface (recommendations, analytics
// w/ recharts, profile management) is only ever loaded by admins, so it's
// kept out of the initial bundle everyone else downloads on login.
const UserAvailability = lazy(() => import("./pages/UserAvailability"));
const MentorAvailability = lazy(() => import("./pages/MentorAvailability"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminSchedules = lazy(() => import("./pages/AdminSchedules"));
const ManageProfiles = lazy(() => import("./pages/ManageProfiles"));
const RecommendationDashboard = lazy(() => import("./pages/RecommendationDashboard"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const LOGIN_PATH = "/login";

function FullPageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-ink-500">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const loginTo = location.search ? `${LOGIN_PATH}${location.search}` : LOGIN_PATH;

  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to={loginTo} replace />;
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function DefaultRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to={LOGIN_PATH} replace />;
  if (user.role === "MENTOR") return <Navigate to="/mentor" replace />;
  if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
  return <Navigate to="/availability" replace />;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path={LOGIN_PATH} element={<LoginRoute />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DefaultRedirect />} />
          <Route
            path="availability"
            element={
              <ProtectedRoute allowedRoles={["USER"]}>
                <UserAvailability />
              </ProtectedRoute>
            }
          />
          <Route
            path="mentor"
            element={
              <ProtectedRoute allowedRoles={["MENTOR"]}>
                <MentorAvailability />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/recommendations"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <RecommendationDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/analytics"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/profiles"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <ManageProfiles />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/schedules"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminSchedules />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/settings"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
