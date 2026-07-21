import { useEffect, useState } from 'react'
import { sb } from './lib/supabase'
import { useApp } from './lib/store'
import LoadingScreen from './screens/LoadingScreen'
import AuthScreen from './screens/AuthScreen'
import ChildrenScreen from './screens/ChildrenScreen'
import ChatScreen from './screens/ChatScreen'
import ReportScreen from './screens/ReportScreen'
import FriendsScreen from './screens/FriendsScreen'
import ProjectScreen from './screens/ProjectScreen'
import ProjectSelectScreen from './screens/ProjectSelectScreen'
import SubscriptionScreen from './screens/SubscriptionScreen'
import ResetPasswordScreen from './screens/ResetPasswordScreen'

export default function App() {
  const { screen, setScreen, setCurrentUser, currentUser, setSubscription } = useApp()
  const [resetMode, setResetMode] = useState(false)

  async function loadSubscription(userId) {
    const { data } = await sb.from('subscriptions').select('*').eq('parent_id', userId).single()
    if (data) setSubscription(data)
    else setSubscription({ plan: 'free', status: 'active' })
  }

  useEffect(() => {
    // Şifre sıfırlama linki kontrolü
    const hash = window.location.hash
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setResetMode(true)
      return
    }

    const timer = setTimeout(() => setScreen('auth'), 5000)
    sb.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timer)
      if (session?.user) {
        setCurrentUser(session.user)
        loadSubscription(session.user.id)
        setScreen('children')
      } else {
        setScreen('auth')
      }
    }).catch(() => { clearTimeout(timer); setScreen('auth') })

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setResetMode(true)
        return
      }
      if (session?.user) {
        setCurrentUser(session.user)
        loadSubscription(session.user.id)
        if (screen === 'auth') setScreen('children')
      } else {
        setCurrentUser(null)
        setScreen('auth')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (resetMode) return <ResetPasswordScreen onDone={() => { setResetMode(false); setScreen('auth') }}/>

  const screens = {
    loading: <LoadingScreen/>,
    auth: <AuthScreen/>,
    children: <ChildrenScreen/>,
    chat: <ChatScreen/>,
    report: <ReportScreen/>,
    friends: <FriendsScreen/>,
    project: <ProjectScreen/>,
    projectSelect: <ProjectSelectScreen/>,
    subscription: <SubscriptionScreen/>,
  }
  return screens[screen] || <LoadingScreen/>
}
