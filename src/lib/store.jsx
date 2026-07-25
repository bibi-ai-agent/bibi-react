import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [currentChild, setCurrentChildRaw] = useState(() => {
    try { const s = sessionStorage.getItem('bibi_child'); return s ? JSON.parse(s) : null } catch { return null }
  })
  function setCurrentChild(c) { setCurrentChildRaw(c); if(c) sessionStorage.setItem('bibi_child', JSON.stringify(c)); else sessionStorage.removeItem('bibi_child') }
  const [screen, setScreenRaw] = useState('loading')
  function setScreen(s) { setScreenRaw(s); sessionStorage.setItem('bibi_screen', s) }
  const [voiceOn, setVoiceOn] = useState(false)
  const [selectedVoiceId, setSelectedVoiceId] = useState("HllA1j2zLOqUQ4kLjMmK")
  const [elevenLabsEnabled, setElevenLabsEnabled] = useState(true)
  const [speechActive, setSpeechActive] = useState(false)
  const [speechPaused, setSpeechPaused] = useState(false)
  const [projectFriend, setProjectFriend] = useState(null)
  const [projectType, setProjectType] = useState(null)
  const [projectInviteId, setProjectInviteId] = useState(null)
  const [isProjectHost, setIsProjectHost] = useState(false)
  const [projectSessionId, setProjectSessionId] = useState(null)
  const [subscription, setSubscription] = useState({ plan: 'free', status: 'active' })

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      currentChild, setCurrentChild,
      screen, setScreen,
      voiceOn, setVoiceOn,
      selectedVoiceId, setSelectedVoiceId,
      elevenLabsEnabled, setElevenLabsEnabled,
      speechActive, setSpeechActive,
      speechPaused, setSpeechPaused,
      projectFriend, setProjectFriend,
      projectType, setProjectType,
      projectInviteId, setProjectInviteId,
      isProjectHost, setIsProjectHost,
      projectSessionId, setProjectSessionId,
      subscription, setSubscription,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
