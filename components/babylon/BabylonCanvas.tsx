'use client'

import { useEffect, useRef } from 'react'
import type { Scene } from '@babylonjs/core'

export interface BabylonCanvasProps {
  onSceneReady?: (scene: Scene, canvas: HTMLCanvasElement) => void | Promise<void>
  onRender?: (scene: Scene) => void
  className?: string
}

export default function BabylonCanvas({
  onSceneReady,
  onRender,
  className,
}: BabylonCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Refs pour toujours appeler la version courante des callbacks sans recréer l'engine
  const onSceneReadyRef = useRef(onSceneReady)
  const onRenderRef = useRef(onRender)
  onSceneReadyRef.current = onSceneReady
  onRenderRef.current = onRender

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let engine: import('@babylonjs/core').Engine | null = null
    let scene: Scene | null = null

    async function init() {
      const { Engine, Scene, Color4 } = await import('@babylonjs/core')

      engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
      })

      scene = new Scene(engine)
      scene.clearColor = new Color4(0.93, 0.93, 0.93, 1)

      if (onSceneReadyRef.current) {
        await onSceneReadyRef.current(scene, canvas!)
      }

      engine.runRenderLoop(() => {
        if (!scene) return
        onRenderRef.current?.(scene)
        scene.render()
      })
    }

    init().then(() => {
      canvas.focus()
    }).catch(console.error)

    const handleResize = () => engine?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      scene?.dispose()
      engine?.dispose()
      scene = null
      engine = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      className={className ?? 'w-full h-full block'}
      style={{ touchAction: 'none', outline: 'none', pointerEvents: 'auto' }}
    />
  )
}
