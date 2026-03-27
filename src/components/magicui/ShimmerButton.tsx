/** 光效按钮 - 用于主 CTA */
import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

interface ShimmerButtonProps {
  children: ReactNode
  className?: string
  shimmerColor?: string
  shimmerSize?: string
  background?: string
  href?: string
}

export function ShimmerButton({
  children,
  className,
  shimmerColor = 'rgba(255,255,255,0.2)',
  shimmerSize = '0.1em',
  background = 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
  href,
}: ShimmerButtonProps) {
  const Tag = href ? 'a' : 'button'
  return (
    <Tag
      href={href}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-8 py-3.5',
        'text-base font-medium text-white transition-all',
        'hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]',
        className
      )}
      style={{ background }}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          maskImage: 'linear-gradient(#fff, #fff)',
        }}
      >
        <div
          className="absolute inset-[-100%] animate-shimmer-slide"
          style={{
            background: `linear-gradient(90deg, transparent 30%, ${shimmerColor} 50%, transparent 70%)`,
            backgroundSize: `${shimmerSize} 100%`,
          }}
        />
      </div>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Tag>
  )
}
