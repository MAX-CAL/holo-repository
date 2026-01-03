import { useState, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(color);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hue, setHue] = useState(0);

  useEffect(() => {
    setHexInput(color);
    // Extract hue from color
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    setHue(h * 360);
  }, [color]);

  useEffect(() => {
    drawColorCanvas();
    drawHueSlider();
  }, [hue]);

  const drawColorCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create gradient from white to hue color
    const hueColor = `hsl(${hue}, 100%, 50%)`;
    
    // Horizontal gradient (saturation)
    const gradientH = ctx.createLinearGradient(0, 0, width, 0);
    gradientH.addColorStop(0, '#fff');
    gradientH.addColorStop(1, hueColor);
    ctx.fillStyle = gradientH;
    ctx.fillRect(0, 0, width, height);

    // Vertical gradient (brightness)
    const gradientV = ctx.createLinearGradient(0, 0, 0, height);
    gradientV.addColorStop(0, 'transparent');
    gradientV.addColorStop(1, '#000');
    ctx.fillStyle = gradientV;
    ctx.fillRect(0, 0, width, height);
  };

  const drawHueSlider = () => {
    const canvas = hueRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    for (let i = 0; i <= 360; i += 30) {
      gradient.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(x, y, 1, 1).data;
    const hex = '#' + [imageData[0], imageData[1], imageData[2]]
      .map(c => c.toString(16).padStart(2, '0'))
      .join('');
    
    onChange(hex);
  };

  const handleHueClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = hueRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newHue = (x / rect.width) * 360;
    setHue(newHue);

    // Update color with new hue
    const hslColor = `hsl(${newHue}, 100%, 50%)`;
    const tempDiv = document.createElement('div');
    tempDiv.style.color = hslColor;
    document.body.appendChild(tempDiv);
    const computed = getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);
    
    const match = computed.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if (match) {
      const hex = '#' + [match[1], match[2], match[3]]
        .map(c => parseInt(c).toString(16).padStart(2, '0'))
        .join('');
      onChange(hex);
    }
  };

  const handleHexChange = (value: string) => {
    setHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          type="button"
          className="w-8 h-8 rounded-full border-2 border-border/50 shadow-sm hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          style={{ backgroundColor: color }}
          aria-label="Pick a color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-card border-border" align="start">
        <div className="space-y-3">
          {/* Main color picker */}
          <canvas
            ref={canvasRef}
            width={224}
            height={150}
            className="w-full h-[150px] rounded-md cursor-crosshair border border-border/30"
            onClick={handleCanvasClick}
          />
          
          {/* Hue slider */}
          <canvas
            ref={hueRef}
            width={224}
            height={16}
            className="w-full h-4 rounded-md cursor-pointer border border-border/30"
            onClick={handleHueClick}
          />

          {/* Hex input */}
          <div className="flex gap-2">
            <div 
              className="w-10 h-10 rounded-full border border-border/50 shrink-0"
              style={{ backgroundColor: color }}
            />
            <Input
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#000000"
              className="font-mono text-sm bg-background/50 border-border/50"
              maxLength={7}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
