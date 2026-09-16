import { useEffect, useRef } from 'react';

interface WaveformRibbonProps {
  isActive: boolean;
  audioLevel?: number; // 0 to 1
  height?: number;
}

export default function WaveformRibbon({ isActive, audioLevel = 0, height = 70 }: WaveformRibbonProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      // Phase increment (faster when active)
      phaseRef.current += isActive ? 0.05 + audioLevel * 0.08 : 0.015;
      const phase = phaseRef.current;

      // Base amplitude
      const baseAmp = isActive ? Math.max(12, audioLevel * (h * 0.42)) : 4;

      // Layer definitions: [color, amplitudeMultiplier, frequency, phaseShift, alpha]
      const layers: [string, number, number, number, number][] = [
        ['#3b82f6', 1.0, 0.012, 0, 0.6],       // Blue
        ['#a855f7', 0.85, 0.016, 1.4, 0.7],    // Purple
        ['#06b6d4', 0.65, 0.02, 2.8, 0.55],    // Cyan
        ['#ec4899', 0.45, 0.024, 4.2, 0.4],    // Pink accent
      ];

      const centerY = h / 2;

      layers.forEach(([color, ampMult, freq, shift, alpha]) => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = isActive ? 16 : 6;

        for (let x = 0; x < width; x++) {
          // Attenuation envelope: 0 at edges, 1 in center
          const envelope = Math.sin((x / width) * Math.PI);
          const y = centerY + Math.sin(x * freq + phase + shift) * baseAmp * ampMult * envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, audioLevel]);

  return (
    <div className="relative w-full overflow-hidden flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={750}
        height={height}
        className="w-full h-full pointer-events-none"
      />
    </div>
  );
}
