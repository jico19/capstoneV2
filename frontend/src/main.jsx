// Patch Node.prototype.removeChild and insertBefore to prevent crashes caused by
// Google Translate, browser extensions, or external DOM mutations.
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (console) {
        console.warn('Cannot remove child: not a child of this node', this, child);
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) {
        console.warn('Cannot insert before: reference node not a child of this node', this, referenceNode);
      }
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments);
  };
}

import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'


const queryClient = new QueryClient()

function ResponsiveToaster() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    setIsMobile(media.matches)

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


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ResponsiveToaster />
    </QueryClientProvider>
  </StrictMode>,
)

