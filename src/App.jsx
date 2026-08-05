import { useEffect, useState } from 'react'
import { sb } from './lib/supabase'
import { useApp } from './lib/store'

// Ortak
import LoadingScreen from './screens/LoadingScreen'
import ResetPasswordScreen from './screens/ResetPasswordScreen'

// Auth
import WelcomeScreen from './screens/WelcomeScreen'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'

// Veli
import ParentDashboard from './screens/ParentDashboard'
import ReportScreen from './screens/ReportScreen'
import SubscriptionScreen from './screens/SubscriptionScreen'
import ChildrenScreen from './screens/ChildrenScreen'
import FriendsScreen from './screens/FriendsScreen'

// Çocuk
import ChildHomeScreen from './screens/ChildHomeScreen'
import ChatScreen from './screens/ChatScreen'
import StoryScreen from './screens/StoryScreen'
import ProjectSelectScreen from './screens/ProjectSelectScreen'
import ProjectScreen from './screens/ProjectScreen'

export default function App() {
  const { screen, setScreen, setCurrentUser, setSubscription, appMode, setAppMode, currentChild } = useApp()
  const [authView, setAuthView] = useState('welcome')
  const [resetMode, setResetMode] = useState(false)
  const [ready, setReady] = useState(false)

  async function loadSubscription(userId) {
    const { data } = await sb.from('subscriptions').select('*').eq('parent_id', userId).single()
    setSubscription(data || { plan: 'free', status: 'active' })
  }

  useEffect(() => {
    // Şifre sıfırlama kontrolü
    const hash = window.location.hash
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setResetMode(true)
      setReady(true)
      return
    }

    // Mevcut oturum kontrolü
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user)
        loadSubscription(session.user.id)
        setAppMode('parent')
        setScreen('parentDashboard')
      } else {
        setScreen('auth')
      }
      setReady(true)
    }).catch(() => {
      setScreen('auth')
      setReady(true)
    })

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setResetMode(true)
        return
      }
      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUser(session.user)
        loadSubscription(session.user.id)
        setAppMode('parent')
        setScreen('parentDashboard')
      }
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setAppMode('parent')
        setScreen('auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return <LoadingScreen/>
  if (resetMode) return <ResetPasswordScreen onDone={() => { setResetMode(false); setScreen('auth') }}/>

  // ── AUTH ──────────────────────────────────────────
  if (screen === 'auth') {
    if (authView === 'login') return <LoginScreen onBack={() => setAuthView('welcome')} onForgot={() => setAuthView('forgot')} />
    if (authView === 'register') return <RegisterScreen onBack={() => setAuthView('welcome')} />
    return <WelcomeScreen onLogin={() => setAuthView('login')} onRegister={() => setAuthView('register')} />
  }

  // ── ÇOCUK MODU ────────────────────────────────────
  // Çocuk modunda sadece çocuk ekranlarına izin ver
  if (appMode === 'child' && currentChild) {
    if (screen === 'chat') return <ChatScreen/>
    if (screen === 'story') return <StoryScreen/>
    if (screen === 'projectSelect') return <ProjectSelectScreen/>
    if (screen === 'project') return <ProjectScreen/>
    return <ChildHomeScreen/>
  }

  // ── VELİ MODU ─────────────────────────────────────
  if (screen === 'report') return <ReportScreen/>
  if (screen === 'subscription') return <SubscriptionScreen/>
  if (screen === 'children') return <ChildrenScreen/>
  if (screen === 'friends') return <FriendsScreen/>
  if (screen === 'loading') return <LoadingScreen/>
  return <ParentDashboard/>
}
