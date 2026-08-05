import { useEffect, useState } from 'react'
import { sb } from './lib/supabase'
import { seedStories } from './lib/seedStories'
import { useApp } from './lib/store'
import SplashScreen from './screens/SplashScreen'
import WelcomeScreen from './screens/WelcomeScreen'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import ParentDashboard from './screens/ParentDashboard'
import ChildHomeScreen from './screens/ChildHomeScreen'
import ChildSelectScreen from './screens/ChildSelectScreen'
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
import StoryScreen from './screens/StoryScreen'

export default function App() {
  const [authView, setAuthView] = useState('welcome') // welcome | login | register | childSelect
  const { screen, setScreen, setCurrentUser, currentUser, setSubscription } = useApp()
  const [resetMode, setResetMode] = useState(false)

  async function loadSubscription(userId) {
    const { data } = await sb.from('subscriptions').select('*').eq('parent_id', userId).single()
    if (data) setSubscription(data)
    else setSubscription({ plan: 'free', status: 'active' })
  }

  useEffect(() => {
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
        const saved = sessionStorage.getItem('dai_screen')
        const safeScreens = ['chat', 'children', 'report', 'friends', 'subscription', 'story', 'projectSelect', 'project']
        if (saved && safeScreens.includes(saved)) setScreen(saved)
        else setScreen('children')
      } else {
        setScreen('auth')
      }
    }).catch(() => { clearTimeout(timer); setScreen('auth') })
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { setResetMode(true); return }
      if (session?.user) {
        setCurrentUser(session.user)
        loadSubscription(session.user.id)
        if (screen === 'auth') setScreen('parentDashboard')
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
    auth: authView === 'login'
      ? <LoginScreen onBack={() => setAuthView('welcome')} onForgot={() => setAuthView('forgot')} />
      : authView === 'register'
      ? <RegisterScreen onBack={() => setAuthView('welcome')} />
      : authView === 'childSelect'
      ? <ChildSelectScreen onBack={() => setAuthView('welcome')} />
      : <WelcomeScreen onParent={() => setAuthView('login')} onChild={() => setAuthView('childSelect')} />,
    children: <ChildrenScreen/>,
    parentDashboard: <ParentDashboard/>,
    childHome: <ChildHomeScreen/>,
    chat: <ChatScreen/>,
    report: <ReportScreen/>,
    friends: <FriendsScreen/>,
    project: <ProjectScreen/>,
    projectSelect: <ProjectSelectScreen/>,
    subscription: <SubscriptionScreen/>,
    story: <StoryScreen/>,
  }

  return screens[screen] || <LoadingScreen/>
}
