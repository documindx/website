/** 鼠标跟随光效卡片 — 移动端退化为普通卡片 */
import { useRef, useState, useEffect, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface MagicCardProps {
  children: ReactNode
  className?: string
  gradientColor?: string
}

export function MagicCard({
  children,
  className,
  gradientColor = 'rgba(120, 119, 198, 0.15)',
}: MagicCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches)
  }, [])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isMobile || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={ref}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => !isMobile && setOpacity(1)}
      onMouseLeave={() => !isMobile && setOpacity(0)}
    >
      {/* 光效跟随层 — 仅桌面端渲染 */}
      {!isMobile && (
        <>
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${gradientColor}, transparent 60%)`,
              opacity,
            }}
          />
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: `radial-gradient(200px circle at ${position.x}px ${position.y}px, rgba(120, 119, 198, 0.3), transparent 60%)`,
              opacity,
              maskImage: 'linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              maskClip: 'padding-box, border-box',
              padding: '1px',
            }}
          />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
