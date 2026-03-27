/** 无限滚动 Marquee - 用于用户评价区 */
import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

interface MarqueeProps {
  children: ReactNode
  className?: string
  reverse?: boolean
  pauseOnHover?: boolean
  speed?: number
}

export function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = true,
  speed = 40,
}: MarqueeProps) {
  return (
    <div
      className={cn('group flex overflow-hidden [--gap:1rem] gap-[var(--gap)]', className)}
      style={{ '--duration': `${speed}s` } as React.CSSProperties}
    >
      <div
        className={cn(
          'flex shrink-0 gap-[var(--gap)] animate-marquee items-stretch',
          reverse && '[animation-direction:reverse]',
          pauseOnHover && 'group-hover:[animation-play-state:paused]'
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          'flex shrink-0 gap-[var(--gap)] animate-marquee items-stretch',
          reverse && '[animation-direction:reverse]',
          pauseOnHover && 'group-hover:[animation-play-state:paused]'
        )}
        aria-hidden
      >
        {children}
      </div>
    </div>
  )
}
