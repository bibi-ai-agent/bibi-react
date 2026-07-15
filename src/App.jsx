import { useEffect } from 'react'
import { sb } from './lib/supabase'
import { useApp } from './lib/store'
import LoadingScreen from './screens/LoadingScreen'
import AuthScreen from './screens/AuthScreen'
import ChildrenScreen from './screens/ChildrenScreen'
import ChatScreen from './screens/ChatScreen'
import ReportScreen from './screens/ReportScreen'
import FriendsScreen from './screens/FriendsScreen'

export default function App() {
  const { screen, setScreen, setCurrentUser, currentUser } = useApp()

  useEffect(() => {
    // Oturum kontrolü
    const timer = setTimeout(() => setScreen('auth'), 5000)
    sb.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timer)
      if (session?.user) {
        setCurrentUser(session.user)
        setScreen('children')
      } else {
        setScreen('auth')
      }
    }).catch(() => { clearTimeout(timer); setScreen('auth') })

    // Auth state listener
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setCurrentUser(session.user)
        if (screen === 'auth') setScreen('children')
      } else {
        setCurrentUser(null)
        setScreen('auth')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const screens = {
    loading: <LoadingScreen/>,
    auth: <AuthScreen/>,
    children: <ChildrenScreen/>,
    chat: <ChatScreen/>,
    report: <ReportScreen/>,
    friends: <FriendsScreen/>,
  }

  return screens[screen] || <LoadingScreen/>
}
