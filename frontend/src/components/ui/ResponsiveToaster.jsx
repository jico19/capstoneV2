import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'

export function ResponsiveToaster() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 640px)').matches)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const listener = (e) => setIsMobile(e.matches)
    media.addEventListener('change', listener)
    
    return () => media.removeEventListener('change', listener)
  }, [])

  return (
    <Toaster 
      position={isMobile ? 'top-center' : 'bottom-right'} 
      richColors
      closeButton
    />
  )
}
export default ResponsiveToaster;
