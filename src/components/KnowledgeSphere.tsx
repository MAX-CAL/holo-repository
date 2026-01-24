import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
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
  onLongPress?: (e: { clientX: number; clientY: number }) => void;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  isSubcategory?: boolean;
  isFocused?: boolean;
}

function InteractiveNode({ position, color, onClick, onLongPress, isHovered, onHover, isSubcategory = false, isFocused = false }: Omit<NodeProps, 'name'>) {
  const meshRef = useRef<THREE.Mesh>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  
  // 50% bigger nodes: was 0.1/0.12, now 0.15/0.18
  const baseSize = isSubcategory ? 0.15 : 0.18;
  
  useFrame(() => {
    if (meshRef.current) {
      // Scale up when hovered or focused
      const scale = isHovered ? 1.4 : isFocused ? 1.2 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isLongPress.current = false;
    
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (onLongPress) {
        // Get screen coordinates from the native event
        const nativeEvent = e.nativeEvent;
        onLongPress({ clientX: nativeEvent.clientX, clientY: nativeEvent.clientY });
      }
    }, 500);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // Only trigger click if it wasn't a long press
    if (!isLongPress.current) {
      onClick();
    }
    isLongPress.current = false;
  };

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    onHover(false);
  };

  const handlePointerCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerOver={() => onHover(true)}
        onPointerLeave={handlePointerLeave}
      >
        <sphereGeometry args={[baseSize, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          metalness={0}
          emissive={isFocused ? color : '#000000'}
          emissiveIntensity={isFocused ? 0.3 : 0}
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
    <Sphere args={[scale, 128, 128]} castShadow receiveShadow>
      <meshStandardMaterial
        color="#d4d4d4"
        roughness={1}
        metalness={0}
      />
    </Sphere>
  );
}

interface AnimatedCameraProps {
  targetPosition: [number, number, number];
  targetLookAt: [number, number, number];
  onAnimationComplete?: () => void;
}

function AnimatedCamera({ targetPosition, targetLookAt, onAnimationComplete }: AnimatedCameraProps) {
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
    if (!isAnimating.current) return;

    const target = new THREE.Vector3(...targetPosition);
    const distance = camera.position.distanceTo(target);

    if (distance < 0.05) {
      isAnimating.current = false;
      onAnimationComplete?.();
      return;
    }

    // Smooth damping for fluid camera movement
    const targetVec = new THREE.Vector3(...targetPosition);
    damp3(camera.position, targetVec, 0.2, delta);
    camera.lookAt(new THREE.Vector3(...targetLookAt));
  });

  return null;
}

// Helper to calculate which node is most facing the camera
interface CategoryWithPosition extends Category {
  position_x: number;
  position_y: number;
  position_z: number;
}

function useFocusedNode(
  nodes: CategoryWithPosition[],
  onFocusedNodeChange: ((node: Category | null) => void) | undefined
) {
  const { camera } = useThree();
  const lastFocusedId = useRef<string | null>(null);
  const debounceTimer = useRef<number>(0);

  useFrame(() => {
    if (nodes.length === 0) {
      if (lastFocusedId.current !== null) {
        lastFocusedId.current = null;
        onFocusedNodeChange?.(null);
      }
      return;
    }

    // Get camera direction (normalized vector pointing from camera toward center)
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    let maxDot = -Infinity;
    let focusedNode: CategoryWithPosition | null = null;

    for (const node of nodes) {
      const nodePos = new THREE.Vector3(node.position_x, node.position_y, node.position_z);
      
      // Check if node is in FRONT of the camera (visible side of the sphere)
      // Vector from camera to node
      const cameraToNode = nodePos.clone().sub(camera.position);
      
      // If dot product with camera direction is negative, node is behind camera
      const isBehindCamera = cameraDirection.dot(cameraToNode) < 0;
      if (isBehindCamera) continue;
      
      // Check if node is on the front-facing side of the sphere
      // Node is visible if its position vector points toward the camera
      const nodeToCamera = camera.position.clone().sub(nodePos).normalize();
      const nodeNormal = nodePos.clone().normalize(); // Sphere surface normal at node
      const isFrontFacing = nodeNormal.dot(nodeToCamera) > 0.1; // Must face camera
      if (!isFrontFacing) continue;
      
      // Now calculate alignment with camera center
      const toNode = cameraToNode.normalize();
      const dot = cameraDirection.dot(toNode);
      
      if (dot > maxDot) {
        maxDot = dot;
        focusedNode = node;
      }
    }

    // Higher threshold since we're now only considering visible nodes
    const MIN_ALIGNMENT = 0.5;
    
    if (maxDot >= MIN_ALIGNMENT && focusedNode && focusedNode.id !== lastFocusedId.current) {
      const now = Date.now();
      if (now - debounceTimer.current > 100) {
        lastFocusedId.current = focusedNode.id;
        debounceTimer.current = now;
        onFocusedNodeChange?.(focusedNode);
      }
    } else if ((maxDot < MIN_ALIGNMENT || !focusedNode) && lastFocusedId.current !== null) {
      lastFocusedId.current = null;
      onFocusedNodeChange?.(null);
    }
  });

  return lastFocusedId.current;
}

interface SceneContentProps {
  categories: Category[];
  subcategories: Category[];
  level: ViewLevel;
  activeCategory: Category | null;
  onCategoryClick: (category: Category) => void;
  onSubcategoryClick: (subcategory: Category) => void;
  onCategoryLongPress?: (category: Category, event: { clientX: number; clientY: number }) => void;
  onFocusedNodeChange?: (node: Category | null) => void;
  controlsEnabled: boolean;
  isMobile: boolean;
  controlsRef: React.RefObject<any>;
}

function SceneContent({ 
  categories, 
  subcategories, 
  level, 
  activeCategory, 
  onCategoryClick, 
  onSubcategoryClick,
  onCategoryLongPress,
  onFocusedNodeChange,
  controlsEnabled,
  isMobile,
  controlsRef
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

  // Track focused node based on current level
  const currentNodes = level === 'root' ? categoriesWithPositions : subcategoriesWithPositions;
  const focusedId = useFocusedNode(currentNodes, onFocusedNodeChange);

  // Reset OrbitControls when transitioning between levels
  useEffect(() => {
    if (controlsRef.current) {
      // Always reset target to center
      controlsRef.current.target.set(0, 0, 0);
      // Force enable controls
      controlsRef.current.enabled = true;
      controlsRef.current.update();
    }
  }, [level, controlsRef]);

  return (
    <>
      <AnimatedCamera 
        targetPosition={cameraConfig.position} 
        targetLookAt={cameraConfig.lookAt}
      />

      <CentralSphere />

      {/* Improved lighting for white background - higher ambient for good color visibility */}
      <ambientLight intensity={1.2} />
      <directionalLight 
        position={[5, 10, 7]} 
        intensity={0.8} 
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />

      {level === 'root' && categoriesWithPositions.map(category => (
        <InteractiveNode
          key={category.id}
          position={[category.position_x, category.position_y, category.position_z]}
          color={category.color}
          onClick={() => onCategoryClick(category)}
          onLongPress={(e) => onCategoryLongPress?.(category, e)}
          isHovered={hoveredId === category.id}
          onHover={(hovered) => setHoveredId(hovered ? category.id : null)}
          isFocused={focusedId === category.id}
        />
      ))}

      {level === 'category' && subcategoriesWithPositions.map(subcat => (
        <InteractiveNode
          key={subcat.id}
          position={[subcat.position_x, subcat.position_y, subcat.position_z]}
          color={subcat.color}
          onClick={() => onSubcategoryClick(subcat)}
          onLongPress={(e) => onCategoryLongPress?.(subcat, e)}
          isHovered={hoveredId === subcat.id}
          onHover={(hovered) => setHoveredId(hovered ? subcat.id : null)}
          isSubcategory
          isFocused={focusedId === subcat.id}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={2.5}
        maxDistance={12}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={isMobile ? 0.5 : 0.8}
        enabled={controlsEnabled}
        enableZoom={true}
        enableRotate={true}
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
  onCategoryLongPress?: (category: Category, event: { clientX: number; clientY: number }) => void;
  onFocusedNodeChange?: (node: Category | null) => void;
  controlsEnabled?: boolean;
}

export function KnowledgeSphere({ 
  categories, 
  subcategories, 
  level, 
  activeCategory, 
  onCategoryClick, 
  onSubcategoryClick,
  onCategoryLongPress,
  onFocusedNodeChange,
  controlsEnabled = true
}: KnowledgeSphereProps) {
  const controlsRef = useRef<any>(null);
  
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;
  }, []);

  // Force re-enable controls when level changes back to root
  useEffect(() => {
    if (level === 'root' && controlsRef.current) {
      controlsRef.current.enabled = true;
      controlsRef.current.update();
    }
  }, [level]);

  return (
    <div className="w-full h-full absolute inset-0" style={{ touchAction: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        shadows
      >
        <color attach="background" args={['#ffffff']} />
        <SceneContent
          categories={categories}
          subcategories={subcategories}
          level={level}
          activeCategory={activeCategory}
          onCategoryClick={onCategoryClick}
          onSubcategoryClick={onSubcategoryClick}
          onCategoryLongPress={onCategoryLongPress}
          onFocusedNodeChange={onFocusedNodeChange}
          controlsEnabled={controlsEnabled}
          isMobile={isMobile}
          controlsRef={controlsRef}
        />
      </Canvas>
    </div>
  );
}
