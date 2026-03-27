/** 渐变光线扫过效果 - 用于 Hero 区背景 */
import { useEffect, useRef } from 'react'

export function AnimatedGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0

    function resize() {
      canvas!.width = canvas!.offsetWidth * window.devicePixelRatio
      canvas!.height = canvas!.offsetHeight * window.devicePixelRatio
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    function draw() {
      const w = canvas!.offsetWidth
      const h = canvas!.offsetHeight
      ctx!.clearRect(0, 0, w, h)

      const gridSize = 60
      const cols = Math.ceil(w / gridSize) + 1
      const rows = Math.ceil(h / gridSize) + 1

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * gridSize
          const y = j * gridSize
          const dist = Math.sqrt((x - w / 2) ** 2 + (y - h / 2) ** 2)
          const pulse = Math.sin(time * 0.002 + dist * 0.005) * 0.5 + 0.5
          const opacity = pulse * 0.15

          ctx!.beginPath()
          ctx!.arc(x, y, 1, 0, Math.PI * 2)
          ctx!.fillStyle = `rgba(147, 130, 255, ${opacity})`
          ctx!.fill()
        }
      }

      time += 16
      animationId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
