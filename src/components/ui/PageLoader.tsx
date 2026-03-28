import React from 'react'

export function PageLoader() {
  return (
    <div className="flex items-center justify-center w-full min-h-[400px]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-[var(--accent)]/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}
