import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import { damp3 } from 'maath/easing';
import * as THREE from 'three';
import { Category, ViewLevel } from '@/types/knowledge';

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

function InteractiveNode({ position, color, onClick, isHovered, onHover, isSubcategory = false }: Omit<NodeProps, 'name' | 'cameraPosition'> & { name?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const baseSize = isSubcategory ? 0.1 : 0.12;
  
  useFrame(() => {
    if (meshRef.current) {
      const scale = isHovered ? 1.4 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <group position={position}>
      {/* Main node - solid color, no text */}
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
    </group>
  );
}

interface CentralSphereProps {
  scale?: number;
}

function CentralSphere({ scale = 2 }: CentralSphereProps) {
  return (
    <Sphere args={[scale, 128, 128]}>
      <meshStandardMaterial
        color="#d4d4d4"
        roughness={0.3}
        metalness={0.1}
      />
    </Sphere>
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
  
  const cameraConfig = useMemo(() => {
    if (level === 'root') {
      return { position: [0, 0, 8] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] };
    } else if (level === 'category' && activeCategory) {
      const catPos = new THREE.Vector3(activeCategory.position_x, activeCategory.position_y, activeCategory.position_z);
      const direction = catPos.clone().normalize();
      const cameraPos = direction.multiplyScalar(5);
      return { 
        position: [cameraPos.x, cameraPos.y, cameraPos.z] as [number, number, number], 
        lookAt: [0, 0, 0] as [number, number, number] 
      };
    }
    return { position: [0, 0, 8] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] };
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

  return (
    <>
      <AnimatedCamera 
        targetPosition={cameraConfig.position} 
        targetLookAt={cameraConfig.lookAt}
        onPositionUpdate={() => {}}
      />

      <CentralSphere />

      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[-10, -10, -10]} intensity={0.3} />

      {level === 'root' && categoriesWithPositions.map(category => (
        <InteractiveNode
          key={category.id}
          position={[category.position_x, category.position_y, category.position_z]}
          color={category.color}
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
          onClick={() => onSubcategoryClick(subcat)}
          isHovered={hoveredId === subcat.id}
          onHover={(hovered) => setHoveredId(hovered ? subcat.id : null)}
          isSubcategory
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
    <div className="w-full h-full absolute inset-0" style={{ touchAction: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#0a0a0a']} />
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
