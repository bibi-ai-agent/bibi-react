import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [currentChild, setCurrentChild] = useState(null)
  const [screen, setScreen] = useState('loading')
  const [voiceOn, setVoiceOn] = useState(false)
  const [selectedVoiceId, setSelectedVoiceId] = useState("HllA1j2zLOqUQ4kLjMmK")
  const [elevenLabsEnabled, setElevenLabsEnabled] = useState(true)
  const [speechActive, setSpeechActive] = useState(false)
  const [speechPaused, setSpeechPaused] = useState(false)

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
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
