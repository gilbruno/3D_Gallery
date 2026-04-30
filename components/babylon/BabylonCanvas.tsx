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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let engine: import('@babylonjs/core').Engine | null = null
    let scene: Scene | null = null

    async function init() {
      // Import dynamique : Babylon n'est jamais évalué côté serveur
      const { Engine, Scene } = await import('@babylonjs/core')

      engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
      })

      scene = new Scene(engine)

      // Fond blanc légèrement grisé (0.93, 0.93, 0.93) — identique à la couleur des murs.
      // Sans plafond, le "ciel" visible au-dessus des murs se fond naturellement
      // dans le fond de scène : l'espace paraît ouvert et infini vers le haut.
      const { Color4 } = await import('@babylonjs/core')
      scene.clearColor = new Color4(0.93, 0.93, 0.93, 1)

      // onSceneReady initialise caméra, géométrie, matériaux et textures GUI.
      // On le fait AVANT de démarrer le render loop pour éviter l'erreur WebGL
      // "uniformMatrix4fv: location is not from the associated program" qui survient
      // quand AdvancedDynamicTexture compile ses shaders pendant un render en cours.
      if (onSceneReady) {
        await onSceneReady(scene, canvas!)
      }

      engine.runRenderLoop(() => {
        if (!scene) return
        if (onRender) {
          onRender(scene)
        }
        scene.render()
      })
    }

    init().then(() => {
      canvas.focus()
    }).catch(console.error)

    const handleResize = () => {
      engine?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      scene?.dispose()
      engine?.dispose()
      scene = null
      engine = null
    }
    // onSceneReady et onRender sont des callbacks stables — on les exclut
    // intentionnellement pour éviter de recréer l'engine à chaque render React.
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
