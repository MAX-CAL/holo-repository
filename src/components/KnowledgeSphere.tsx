import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Category, ViewLevel } from '@/types/knowledge';
import { Starfield } from './Starfield';

interface NodeProps {
  position: [number, number, number];
  color: string;
  name: string;
  onClick: () => void;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  isSubcategory?: boolean;
}

function InteractiveNode({ position, color, name, onClick, isHovered, onHover, isSubcategory = false }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const baseSize = isSubcategory ? 0.1 : 0.12;
  const glowSize = isSubcategory ? 0.15 : 0.2;
  
  useFrame(() => {
    if (meshRef.current && glowRef.current) {
      const scale = isHovered ? 1.3 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
      glowRef.current.scale.lerp(new THREE.Vector3(scale * 1.5, scale * 1.5, scale * 1.5), 0.1);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <group position={position}>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[glowSize, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={isSubcategory ? 0.1 : 0.15} />
      </mesh>
      
      {/* Main node */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <sphereGeometry args={[baseSize, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 1 : 0.5}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      {/* Label */}
      {isHovered && (
        <Html
          position={[0, baseSize + 0.15, 0]}
          center
          style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
        >
          <div className="px-3 py-1.5 bg-card/95 backdrop-blur-md rounded-lg border border-border/50 text-sm font-medium text-foreground shadow-xl">
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

interface CentralSphereProps {
  color?: string;
  distort?: number;
  scale?: number;
}

function CentralSphere({ color = "hsl(158, 64%, 20%)", distort = 0.15, scale = 2 }: CentralSphereProps) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y += 0.001;
    }
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y += 0.0008;
    }
  });

  return (
    <>
      <Sphere ref={sphereRef} args={[scale, 64, 64]}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={distort}
          speed={1.5}
          roughness={0.4}
          metalness={0.8}
          transparent
          opacity={0.3}
        />
      </Sphere>
      <Sphere ref={wireframeRef} args={[scale * 1.01, 32, 32]}>
        <meshBasicMaterial
          color="hsl(158, 64%, 51%)"
          wireframe
          transparent
          opacity={0.08}
        />
      </Sphere>
    </>
  );
}

interface AnimatedCameraProps {
  targetPosition: [number, number, number];
  targetLookAt: [number, number, number];
}

function AnimatedCamera({ targetPosition, targetLookAt }: AnimatedCameraProps) {
  const { camera } = useThree();
  const isAnimating = useRef(true);
  const prevTarget = useRef({ position: targetPosition, lookAt: targetLookAt });

  useEffect(() => {
    if (
      prevTarget.current.position[0] !== targetPosition[0] ||
      prevTarget.current.position[1] !== targetPosition[1] ||
      prevTarget.current.position[2] !== targetPosition[2]
    ) {
      isAnimating.current = true;
      prevTarget.current = { position: targetPosition, lookAt: targetLookAt };
    }
  }, [targetPosition, targetLookAt]);

  useFrame(() => {
    if (!isAnimating.current) return;

    const target = new THREE.Vector3(...targetPosition);
    const distance = camera.position.distanceTo(target);

    if (distance < 0.1) {
      isAnimating.current = false;
      return;
    }

    camera.position.lerp(target, 0.05);
    camera.lookAt(new THREE.Vector3(...targetLookAt));
  });

  return null;
}

interface SceneContentProps {
  categories: Category[];
  subcategories: Category[];
  level: ViewLevel;
  activeCategory: Category | null;
  onCategoryClick: (category: Category) => void;
  onSubcategoryClick: (subcategory: Category) => void;
  controlsEnabled: boolean;
}

function SceneContent({ 
  categories, 
  subcategories, 
  level, 
  activeCategory, 
  onCategoryClick, 
  onSubcategoryClick,
  controlsEnabled
}: SceneContentProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const cameraConfig = useMemo(() => {
    if (level === 'root') {
      return { position: [0, 0, 6] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] };
    } else if (level === 'category' && activeCategory) {
      const catPos = new THREE.Vector3(activeCategory.position_x, activeCategory.position_y, activeCategory.position_z);
      const direction = catPos.clone().normalize();
      const cameraPos = direction.multiplyScalar(3.5);
      return { 
        position: [cameraPos.x, cameraPos.y, cameraPos.z] as [number, number, number], 
        lookAt: [0, 0, 0] as [number, number, number] 
      };
    }
    return { position: [0, 0, 6] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] };
  }, [level, activeCategory]);

  const subcategoriesWithPositions = useMemo(() => {
    return subcategories.map((subcat, index) => {
      const theta = (index / Math.max(subcategories.length, 1)) * Math.PI * 2;
      const phi = Math.acos(2 * ((index + 0.5) / Math.max(subcategories.length, 1)) - 1);
      const radius = 2;
      
      return {
        ...subcat,
        position_x: radius * Math.sin(phi) * Math.cos(theta),
        position_y: radius * Math.sin(phi) * Math.sin(theta),
        position_z: radius * Math.cos(phi)
      };
    });
  }, [subcategories]);

  const sphereColor = activeCategory ? activeCategory.color : "hsl(158, 64%, 20%)";

  return (
    <>
      <AnimatedCamera 
        targetPosition={cameraConfig.position} 
        targetLookAt={cameraConfig.lookAt} 
      />
      
      <Starfield count={800} />
      
      <CentralSphere color={sphereColor} />

      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="hsl(158, 64%, 51%)" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="hsl(172, 66%, 50%)" />

      {level === 'root' && categories.map(category => (
        <InteractiveNode
          key={category.id}
          position={[category.position_x, category.position_y, category.position_z]}
          color={category.color}
          name={category.name}
          onClick={() => onCategoryClick(category)}
          isHovered={hoveredId === category.id}
          onHover={(hovered) => setHoveredId(hovered ? category.id : null)}
        />
      ))}

      {level === 'category' && subcategoriesWithPositions.map(subcat => (
        <InteractiveNode
          key={subcat.id}
          position={[subcat.position_x, subcat.position_y, subcat.position_z]}
          color={activeCategory?.color || '#22c55e'}
          name={subcat.name}
          onClick={() => onSubcategoryClick(subcat)}
          isHovered={hoveredId === subcat.id}
          onHover={(hovered) => setHoveredId(hovered ? subcat.id : null)}
          isSubcategory
        />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={12}
        enableDamping
        dampingFactor={0.05}
        enabled={controlsEnabled}
      />
    </>
  );
}

interface KnowledgeSphereProps {
  categories: Category[];
  subcategories: Category[];
  level: ViewLevel;
  activeCategory: Category | null;
  onCategoryClick: (category: Category) => void;
  onSubcategoryClick: (subcategory: Category) => void;
  controlsEnabled?: boolean;
}

export function KnowledgeSphere({ 
  categories, 
  subcategories, 
  level, 
  activeCategory, 
  onCategoryClick, 
  onSubcategoryClick,
  controlsEnabled = true
}: KnowledgeSphereProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <SceneContent
          categories={categories}
          subcategories={subcategories}
          level={level}
          activeCategory={activeCategory}
          onCategoryClick={onCategoryClick}
          onSubcategoryClick={onSubcategoryClick}
          controlsEnabled={controlsEnabled}
        />
      </Canvas>
    </div>
  );
}
