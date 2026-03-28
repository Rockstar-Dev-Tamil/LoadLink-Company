import { useEffect, lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { AuthGuard } from './components/layout/AuthGuard';
import { GuestGuard } from './components/layout/GuestGuard';
import { BusinessGuard } from './components/layout/BusinessGuard';
import { DriverGuard } from './components/layout/DriverGuard';
import { Shell } from './components/layout/Shell';
import { PageLoader } from './components/ui/PageLoader';

// Lazy load pages
const Login = lazy(() => import('@/pages/Login'));
const SignUp = lazy(() => import('@/pages/SignUp'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ActiveShipments = lazy(() => import('@/pages/ActiveShipments'));
const Tracking = lazy(() => import('@/pages/Tracking'));
const BookShipment = lazy(() => import('@/pages/BookShipment'));
const Payments = lazy(() => import('@/pages/Payments'));
const Analytics = lazy(() => import('@/pages/Insights'));
const Maps = lazy(() => import('@/pages/Maps'));
const Messages = lazy(() => import('@/pages/Messages'));
const Settings = lazy(() => import('@/pages/Settings'));
const DriverBroadcast = lazy(() => import('@/pages/DriverBroadcast'));
const Simulator = lazy(() => import('@/pages/Simulator'));
const Drivers = lazy(() => import('@/pages/Drivers'));

// Preload next likely page on hover
const preloadDashboard = () => import('@/pages/Dashboard');
const preloadShipments = () => import('@/pages/ActiveShipments');
const preloadTracking = () => import('@/pages/Tracking');
const preloadPayments = () => import('@/pages/Payments');
const preloadMessages = () => import('@/pages/Messages');

export const PAGE_PRELOADERS = {
  dashboard: preloadDashboard,
  shipments: preloadShipments,
  tracking:  preloadTracking,
  payments:  preloadPayments,
  messages:  preloadMessages,
};

function LandingRedirect() {
  const { user, profile, initialized, loading } = useAuthStore();
  if (!initialized || loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role === 'driver') return <Navigate to="/driver" replace />;
  return <Navigate to="/dashboard" replace />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingRedirect />,
  },
  {
    element: <GuestGuard />,
    children: [
      { 
        path: '/login', 
        element: (
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        ) 
      },
      { 
        path: '/signup', 
        element: (
          <Suspense fallback={<PageLoader />}>
            <SignUp />
          </Suspense>
        ) 
      },
    ]
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <DriverGuard />,
        children: [
          {
            path: '/driver',
            element: (
              <Suspense fallback={<PageLoader />}>
                <DriverBroadcast />
              </Suspense>
            ),
          },
        ],
      },
      {
        element: <BusinessGuard />,
        children: [
          {
            element: <Shell />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { 
                path: '/dashboard', 
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Dashboard />
                  </Suspense>
                ) 
              },
              { 
                path: '/shipments', 
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <ActiveShipments />
                  </Suspense>
                ) 
              },
              { 
                path: '/tracking', 
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Tracking />
                  </Suspense>
                ) 
              },
              {
                // Alias route for direct "navigation" entry, reusing the same realtime tracking + OSRM UI.
                path: '/navigation',
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Tracking />
                  </Suspense>
                )
              },
              { 
                path: '/maps', 
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Maps />
                  </Suspense>
                ) 
              },
              { 
                path: '/book', 
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <BookShipment />
                  </Suspense>
                ) 
              },
              { 
                path: '/drivers', 
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Drivers />
                  </Suspense>
                ) 
              },
              { 
                path: '/messages', 
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Messages />
                  </Suspense>
                ) 
              },
              { 
                path: '/payments', 
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Payments />
                  </Suspense>
                ) 
              },
              { 
                path: '/analytics', 
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Analytics />
                  </Suspense>
                ) 
              },
              { 
                path: '/settings', 
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Settings />
                  </Suspense>
                ) 
              },
              { 
                path: '/simulator', 
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <Simulator />
                  </Suspense>
                ) 
              },
            ]
          }
        ],
      },
    ]
  },
  { path: '*', element: <Navigate to="/login" replace /> }
]);

export default function App() {
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <RouterProvider router={router} />;
}
