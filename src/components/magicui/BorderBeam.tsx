/** 卡片边框光束扫过效果 */
import { cn } from '../../lib/utils'

interface BorderBeamProps {
  className?: string
  size?: number
  duration?: number
  delay?: number
  colorFrom?: string
  colorTo?: string
}

export function BorderBeam({
  className,
  size = 200,
  duration = 12,
  delay = 0,
  colorFrom = '#6366f1',
  colorTo = '#a855f7',
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit]',
        className
      )}
      style={{
        maskImage: `linear-gradient(transparent, transparent), linear-gradient(#fff, #fff)`,
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
        maskClip: 'padding-box, border-box',
      }}
    >
      <div
        className="absolute inset-[-2px] rounded-[inherit] animate-border-beam"
        style={{
          background: `conic-gradient(from calc(var(--border-beam-angle, 0) * 1deg), transparent 0%, ${colorFrom} 10%, ${colorTo} 20%, transparent 30%)`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  )
}
