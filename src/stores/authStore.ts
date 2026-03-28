import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface Profile {
  id:                        string
  role:                      string
  name:                      string
  email:                     string
  home_city:                 string | null
  subscription_tier:         'Starter' | 'Growth' | 'Pro'
  subscription_expires_at:   string | null
  subscription_billing_cycle: 'monthly' | 'yearly'
}

interface SignUpInput {
  name:      string
  email:     string
  password:  string
  home_city?: string
}

interface AuthState {
  user:        { id: string; email: string } | null
  profile:     Profile | null
  loading:     boolean
  initialized: boolean
  signOutLoading: boolean
  initialize:  () => Promise<void>
  signIn:      (email: string, password: string) => Promise<void>
  signUp:      (data: SignUpInput) => Promise<void>
  signOut:     () => Promise<void>
  refreshProfile: () => Promise<void>
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, role, name, email, home_city, subscription_tier, subscription_expires_at, subscription_billing_cycle')
    .eq('id', userId)
    .maybeSingle()
  return (data as unknown as Profile) ?? null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:        null,
  profile:     null,
  loading:     true,
  initialized: false,
  signOutLoading: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (profile) {
          set({
            user: { id: session.user.id, email: session.user.email! },
            profile,
            loading: false,
            initialized: true,
          })
        } else {
          // If session exists but profile doesn't, force sign out
          await supabase.auth.signOut()
          set({ user: null, profile: null, loading: false, initialized: true })
        }
      } else {
        set({ user: null, profile: null, loading: false, initialized: true })
      }
    } catch (err) {
      console.error('Auth initialization error:', err)
      set({ user: null, profile: null, loading: false, initialized: true })
    }

    // Listen to all auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const profile = await fetchProfile(session.user.id)
        set({
          user: { id: session.user.id, email: session.user.email! },
          profile,
        })
      }
      if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null })
      }
    })
  },

  signIn: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      set({ loading: false })
      if (error.message.includes('Invalid login credentials'))
        throw new Error('Incorrect email or password.')
      if (error.message.includes('Email not confirmed'))
        throw new Error('Please verify your email before signing in.')
      throw error
    }

    const profile = await fetchProfile(data.user.id)

    if (!profile) {
      await supabase.auth.signOut()
      set({ loading: false })
      throw new Error('Account setup incomplete. Please contact support.')
    }

    set({
      user: { id: data.user.id, email: data.user.email! },
      profile,
      loading: false,
    })
  },

  signUp: async ({ name, email, password, home_city }) => {
    set({ loading: true })

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          name,
          role: 'business'
        }
      }
    })

    if (error) {
      set({ loading: false })
      if (error.message.includes('already registered'))
        throw new Error('An account with this email already exists.')
      throw error
    }

    if (!data.user) {
      set({ loading: false })
      throw new Error('Signup failed. Please try again.')
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id:        data.user.id,
        role:      'business',
        name:      name.trim(),
        email:     email.toLowerCase().trim(),
        home_city: home_city?.trim() ?? null,
      })

    if (profileError) {
      set({ loading: false })
      throw new Error('Failed to create profile. Please try again.')
    }

    const profile = await fetchProfile(data.user.id)
    set({
      user: { id: data.user.id, email: data.user.email! },
      profile,
      loading: false,
    })
  },

  signOut: async () => {
    try {
      set({ signOutLoading: true })
      await supabase.auth.signOut()
    } catch (err) {
      console.error('SignOut error:', err)
    } finally {
      // CLEAR LOCAL STORAGE FOR SUPABASE
      localStorage.clear()
      set({ 
        user: null, 
        profile: null, 
        signOutLoading: false,
        loading: false 
      })
      window.location.href = '/login'
    }
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return
    const profile = await fetchProfile(user.id)
    set({ profile })
  },
}))
