import { useRef, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Topic } from '@/types/knowledge';

interface TopicNodeProps {
  topic: Topic;
  onClick: (topic: Topic) => void;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}

function TopicNode({ topic, onClick, isHovered, onHover }: TopicNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && glowRef.current) {
      const scale = isHovered ? 1.3 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
      glowRef.current.scale.lerp(new THREE.Vector3(scale * 1.5, scale * 1.5, scale * 1.5), 0.1);
      
      // Pulse animation
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.05 + 1;
      if (!isHovered) {
        meshRef.current.scale.multiplyScalar(pulse);
      }
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick(topic);
  };

  return (
    <group position={[topic.position_x, topic.position_y, topic.position_z]}>
      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={topic.color} transparent opacity={0.15} />
      </mesh>
      
      {/* Main node */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => onHover(topic.id)}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial
          color={topic.color}
          emissive={topic.color}
          emissiveIntensity={isHovered ? 0.8 : 0.4}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      {/* Label */}
      {isHovered && (
        <Html
          position={[0, 0.3, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <div className="px-3 py-1.5 bg-card/90 backdrop-blur-sm rounded-lg border border-border/50 text-sm font-medium text-foreground shadow-lg">
            {topic.name}
          </div>
        </Html>
      )}
    </group>
  );
}

interface MainSphereProps {
  topics: Topic[];
  onTopicClick: (topic: Topic) => void;
}

function MainSphere({ topics, onTopicClick }: MainSphereProps) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y += 0.001;
    }
  });

  return (
    <>
      {/* Main brain sphere */}
      <Sphere ref={sphereRef} args={[2, 64, 64]}>
        <MeshDistortMaterial
          color="hsl(158, 64%, 20%)"
          attach="material"
          distort={0.15}
          speed={1.5}
          roughness={0.4}
          metalness={0.8}
          transparent
          opacity={0.3}
        />
      </Sphere>

      {/* Wireframe overlay */}
      <Sphere args={[2.02, 32, 32]}>
        <meshBasicMaterial
          color="hsl(158, 64%, 51%)"
          wireframe
          transparent
          opacity={0.1}
        />
      </Sphere>

      {/* Topic nodes */}
      {topics.map(topic => (
        <TopicNode
          key={topic.id}
          topic={topic}
          onClick={onTopicClick}
          isHovered={hoveredId === topic.id}
          onHover={setHoveredId}
        />
      ))}

      {/* Ambient particles */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="hsl(158, 64%, 51%)" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="hsl(172, 66%, 50%)" />
    </>
  );
}

interface KnowledgeSphereProps {
  topics: Topic[];
  onTopicClick: (topic: Topic) => void;
}

export function KnowledgeSphere({ topics, onTopicClick }: KnowledgeSphereProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <MainSphere topics={topics} onTopicClick={onTopicClick} />
        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={10}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
