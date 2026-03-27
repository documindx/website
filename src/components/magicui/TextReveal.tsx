/** 滚动文字渐显效果 */
import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

interface TextRevealProps {
  text: string
  className?: string
}

export function TextReveal({ text, className }: TextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wordsRef = useRef<HTMLSpanElement[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          wordsRef.current.forEach((word, i) => {
            setTimeout(() => {
              word.style.opacity = '1'
              word.style.transform = 'translateY(0)'
              word.style.filter = 'blur(0)'
            }, i * 60)
          })
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const words = text.split(' ')

  return (
    <div ref={containerRef} className={cn('flex flex-wrap justify-center gap-x-2 gap-y-1', className)}>
      {words.map((word, i) => (
        <span
          key={i}
          ref={el => { if (el) wordsRef.current[i] = el }}
          className="inline-block transition-all duration-500 ease-out"
          style={{
            opacity: 0,
            transform: 'translateY(12px)',
            filter: 'blur(4px)',
          }}
        >
          {word}
        </span>
      ))}
    </div>
  )
}
