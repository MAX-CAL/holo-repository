import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Html } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { Topic, Subtopic, ViewLevel } from '@/types/knowledge';
import { Starfield } from './Starfield';

interface NodeProps {
  position: [number, number, number];
  color: string;
  name: string;
  onClick: () => void;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  isSubtopic?: boolean;
}

function InteractiveNode({ position, color, name, onClick, isHovered, onHover, isSubtopic = false }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const baseSize = isSubtopic ? 0.1 : 0.12;
  const glowSize = isSubtopic ? 0.15 : 0.2;
  
  useFrame((state) => {
    if (meshRef.current && glowRef.current) {
      const scale = isHovered ? 1.4 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
      glowRef.current.scale.lerp(new THREE.Vector3(scale * 1.5, scale * 1.5, scale * 1.5), 0.1);
      
      // Pulse animation
      const pulse = Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.08 + 1;
      if (!isHovered) {
        meshRef.current.scale.multiplyScalar(pulse);
      }
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
        <meshBasicMaterial color={color} transparent opacity={isSubtopic ? 0.1 : 0.15} />
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

      {/* Connection line to sphere surface for subtopics */}
      {isSubtopic && (
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.1, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
      )}

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
  const currentPos = useRef(new THREE.Vector3(...targetPosition));
  const currentLookAt = useRef(new THREE.Vector3(...targetLookAt));

  useFrame(() => {
    // Smooth interpolation to target position
    currentPos.current.lerp(new THREE.Vector3(...targetPosition), 0.03);
    currentLookAt.current.lerp(new THREE.Vector3(...targetLookAt), 0.03);
    
    camera.position.copy(currentPos.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

interface SceneContentProps {
  topics: Topic[];
  subtopics: Subtopic[];
  level: ViewLevel;
  activeTopic: Topic | null;
  onTopicClick: (topic: Topic) => void;
  onSubtopicClick: (subtopic: Subtopic) => void;
}

function SceneContent({ 
  topics, 
  subtopics, 
  level, 
  activeTopic, 
  onTopicClick, 
  onSubtopicClick 
}: SceneContentProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // Calculate camera positions based on level
  const cameraConfig = useMemo(() => {
    if (level === 'root') {
      return { position: [0, 0, 6] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] };
    } else if (level === 'category' && activeTopic) {
      // Zoom into the topic position
      const topicPos = new THREE.Vector3(activeTopic.position_x, activeTopic.position_y, activeTopic.position_z);
      const direction = topicPos.clone().normalize();
      const cameraPos = direction.multiplyScalar(3.5);
      return { 
        position: [cameraPos.x, cameraPos.y, cameraPos.z] as [number, number, number], 
        lookAt: [0, 0, 0] as [number, number, number] 
      };
    }
    return { position: [0, 0, 6] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] };
  }, [level, activeTopic]);

  // Generate positions for subtopics on sphere surface
  const subtopicsWithPositions = useMemo(() => {
    return subtopics.map((subtopic, index) => {
      const theta = (index / subtopics.length) * Math.PI * 2;
      const phi = Math.acos(2 * ((index + 0.5) / subtopics.length) - 1);
      const radius = 2;
      
      return {
        ...subtopic,
        position_x: radius * Math.sin(phi) * Math.cos(theta),
        position_y: radius * Math.sin(phi) * Math.sin(theta),
        position_z: radius * Math.cos(phi)
      };
    });
  }, [subtopics]);

  // Animated sphere color based on active topic
  const sphereColor = activeTopic ? activeTopic.color : "hsl(158, 64%, 20%)";

  return (
    <>
      <AnimatedCamera 
        targetPosition={cameraConfig.position} 
        targetLookAt={cameraConfig.lookAt} 
      />
      
      <Starfield count={800} />
      
      {/* Central sphere */}
      <CentralSphere color={sphereColor} />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="hsl(158, 64%, 51%)" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="hsl(172, 66%, 50%)" />

      {/* Level 1: Topic nodes */}
      {level === 'root' && topics.map(topic => (
        <InteractiveNode
          key={topic.id}
          position={[topic.position_x, topic.position_y, topic.position_z]}
          color={topic.color}
          name={topic.name}
          onClick={() => onTopicClick(topic)}
          isHovered={hoveredId === topic.id}
          onHover={(hovered) => setHoveredId(hovered ? topic.id : null)}
        />
      ))}

      {/* Level 2: Subtopic nodes */}
      {level === 'category' && subtopicsWithPositions.map(subtopic => (
        <InteractiveNode
          key={subtopic.id}
          position={[subtopic.position_x!, subtopic.position_y!, subtopic.position_z!]}
          color={activeTopic?.color || '#22c55e'}
          name={subtopic.name}
          onClick={() => onSubtopicClick(subtopic)}
          isHovered={hoveredId === subtopic.id}
          onHover={(hovered) => setHoveredId(hovered ? subtopic.id : null)}
          isSubtopic
        />
      ))}
    </>
  );
}

interface KnowledgeSphereProps {
  topics: Topic[];
  subtopics: Subtopic[];
  level: ViewLevel;
  activeTopic: Topic | null;
  onTopicClick: (topic: Topic) => void;
  onSubtopicClick: (subtopic: Subtopic) => void;
}

export function KnowledgeSphere({ 
  topics, 
  subtopics, 
  level, 
  activeTopic, 
  onTopicClick, 
  onSubtopicClick 
}: KnowledgeSphereProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <SceneContent
          topics={topics}
          subtopics={subtopics}
          level={level}
          activeTopic={activeTopic}
          onTopicClick={onTopicClick}
          onSubtopicClick={onSubtopicClick}
        />
        <OrbitControls
          enablePan={false}
          minDistance={2.5}
          maxDistance={12}
          enableDamping
          dampingFactor={0.05}
          enabled={level !== 'editor'}
        />
      </Canvas>
    </div>
  );
}
