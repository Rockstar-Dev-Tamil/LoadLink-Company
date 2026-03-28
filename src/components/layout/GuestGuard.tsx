import { useEffect } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { FullPageSpinner } from '../ui/FullPageSpinner'

export function GuestGuard() {
  const { user, profile, initialized, loading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!initialized || loading) return
    if (!user) return
    if (profile?.role === 'driver') navigate('/driver', { replace: true })
    else navigate('/dashboard', { replace: true })
  }, [user, profile, initialized, loading, navigate])

  if (!initialized || loading) return <FullPageSpinner />
  if (user) return null
  return <Outlet />
}
