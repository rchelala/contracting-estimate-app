import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import AuthPage from './pages/AuthPage'
import AuthCallback from './pages/AuthCallback'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import NewEstimatePage from './pages/NewEstimatePage'
import EstimateEditPage from './pages/EstimateEditPage'
import EstimateWizardPage from './pages/EstimateWizardPage'
import SettingsPage from './pages/SettingsPage'

const router = createBrowserRouter([
  { path: '/auth', element: <AuthPage /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/estimates/new', element: <NewEstimatePage /> },
      { path: '/estimates/wizard', element: <EstimateWizardPage /> },
      { path: '/estimates/:estimateId', element: <EstimateEditPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/', element: <Navigate to="/dashboard" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

export default function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />
}
