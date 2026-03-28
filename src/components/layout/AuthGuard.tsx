import { useEffect } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { FullPageSpinner } from '../ui/FullPageSpinner'

export function AuthGuard() {
  const { user, loading, initialized } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!initialized || loading) return
    if (!user) {
      navigate('/login', { replace: true })
    }
  }, [user, initialized, loading, navigate])

  if (!initialized || loading) return <FullPageSpinner />
  if (!user) return null
  return <Outlet />
}
