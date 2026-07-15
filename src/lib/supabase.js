import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://adguyijnyoicmluhursw.supabase.co"
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZ3V5aWpueW9pY21sdWh1cnN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTQwMjAsImV4cCI6MjA5ODEzMDAyMH0.uuH3Jb-4a3ZEquduTmdb9Xv6bWPcU_gXd_5DuxM82G4"

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON)
