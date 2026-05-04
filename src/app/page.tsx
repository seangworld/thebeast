'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser()

      if (data.user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }

    check()
  }, [])

  return null
}