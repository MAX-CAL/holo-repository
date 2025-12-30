import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Text } from '@react-three/drei';
import { damp3 } from 'maath/easing';
import * as THREE from 'three';
import { Category, ViewLevel } from '@/types/knowledge';
import { Starfield } from './Starfield';

// Fibonacci Sphere Algorithm for even node distribution
function getFibonacciSpherePosition(index: number, total: number, radius: number = 2): [number, number, number] {
  if (total === 0) return [0, 0, radius];
  
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
  const y = 1 - (index / (total - 1 || 1)) * 2; // y goes from 1 to -1
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = phi * index;
  
  return [
    radius * radiusAtY * Math.cos(theta),
    radius * y,
    radius * radiusAtY * Math.sin(theta)
  ];
}

interface NodeProps {
  position: [number, number, number];
  color: string;
  name: string;
  onClick: () => void;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  isSubcategory?: boolean;
  cameraPosition: THREE.Vector3;
}

function InteractiveNode({ position, color, name, onClick, isHovered, onHover, isSubcategory = false, cameraPosition }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const baseSize = isSubcategory ? 0.1 : 0.12;
  const glowSize = isSubcategory ? 0.15 : 0.2;
  
  // Check if node is on the front side of the sphere (facing camera)
  const isFrontFacing = useMemo(() => {
    const nodePos = new THREE.Vector3(...position);
    const cameraDir = cameraPosition.clone().normalize();
    const nodeDir = nodePos.clone().normalize();
    return nodeDir.dot(cameraDir) > 0.1; // Threshold for "front facing"
  }, [position, cameraPosition]);
  
  // Calculate distance-based text scale
  const textScale = useMemo(() => {
    const nodePos = new THREE.Vector3(...position);
    const dist = nodePos.distanceTo(cameraPosition);
    return Math.max(0.08, Math.min(0.12, 0.5 / dist));
  }, [position, cameraPosition]);
  
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
      {/* Outer glow - using emissive for accurate color */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[glowSize, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={isSubcategory ? 0.15 : 0.2} />
      </mesh>
      
      {/* Main node - MeshBasicMaterial for true color independent of lighting */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <sphereGeometry args={[baseSize, 32, 32]} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
        />
      </mesh>
      
      {/* Inner bright core for glow effect */}
      <mesh>
        <sphereGeometry args={[baseSize * 0.7, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Billboard text label - only for front-facing nodes */}
      {isFrontFacing && (
        <Text
          position={[0, baseSize + 0.18, 0]}
          fontSize={textScale}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.008}
          outlineColor="black"
          font="/fonts/Inter-Medium.woff"
          maxWidth={1}
        >
          {name}
        </Text>
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
  onPositionUpdate: (position: THREE.Vector3) => void;
}

function AnimatedCamera({ targetPosition, targetLookAt, onPositionUpdate }: AnimatedCameraProps) {
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

  useFrame((_, delta) => {
    // Always report camera position for label visibility
    onPositionUpdate(camera.position.clone());
    
    if (!isAnimating.current) return;

    const target = new THREE.Vector3(...targetPosition);
    const distance = camera.position.distanceTo(target);

    if (distance < 0.05) {
      isAnimating.current = false;
      return;
    }

    // Smooth damping for fluid camera movement
    const targetVec = new THREE.Vector3(...targetPosition);
    damp3(camera.position, targetVec, 0.2, delta);
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
  isMobile: boolean;
}

function SceneContent({ 
  categories, 
  subcategories, 
  level, 
  activeCategory, 
  onCategoryClick, 
  onSubcategoryClick,
  controlsEnabled,
  isMobile
}: SceneContentProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cameraPosition, setCameraPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 6));
  
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

  // Apply Fibonacci distribution to categories
  const categoriesWithPositions = useMemo(() => {
    return categories.map((cat, index) => {
      const [x, y, z] = getFibonacciSpherePosition(index, categories.length, 2);
      return { ...cat, position_x: x, position_y: y, position_z: z };
    });
  }, [categories]);

  // Apply Fibonacci distribution to subcategories
  const subcategoriesWithPositions = useMemo(() => {
    return subcategories.map((subcat, index) => {
      const [x, y, z] = getFibonacciSpherePosition(index, subcategories.length, 2);
      return { ...subcat, position_x: x, position_y: y, position_z: z };
    });
  }, [subcategories]);

  const sphereColor = activeCategory ? activeCategory.color : "hsl(158, 64%, 20%)";

  return (
    <>
      <AnimatedCamera 
        targetPosition={cameraConfig.position} 
        targetLookAt={cameraConfig.lookAt}
        onPositionUpdate={setCameraPosition}
      />
      
      <Starfield count={800} />
      
      <CentralSphere color={sphereColor} />

      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="hsl(158, 64%, 51%)" />
      <pointLight position={[-10, -10, -10]} intensity={0.4} color="hsl(172, 66%, 50%)" />

      {level === 'root' && categoriesWithPositions.map(category => (
        <InteractiveNode
          key={category.id}
          position={[category.position_x, category.position_y, category.position_z]}
          color={category.color}
          name={category.name}
          onClick={() => onCategoryClick(category)}
          isHovered={hoveredId === category.id}
          onHover={(hovered) => setHoveredId(hovered ? category.id : null)}
          cameraPosition={cameraPosition}
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
          cameraPosition={cameraPosition}
        />
      ))}

      <OrbitControls
        enablePan={!isMobile}
        minDistance={2.5}
        maxDistance={12}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={isMobile ? 0.5 : 0.8}
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
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;
  }, []);

  return (
    <div className="w-full h-full" style={{ touchAction: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneContent
          categories={categories}
          subcategories={subcategories}
          level={level}
          activeCategory={activeCategory}
          onCategoryClick={onCategoryClick}
          onSubcategoryClick={onSubcategoryClick}
          controlsEnabled={controlsEnabled}
          isMobile={isMobile}
        />
      </Canvas>
    </div>
  );
}
