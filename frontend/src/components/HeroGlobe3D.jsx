import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';

function WireframeGlobe({ prefersReducedMotion }) {
  const meshRef = useRef();
  const innerRef = useRef();
  const ringRef = useRef();

  useFrame((state, delta) => {
    if (!prefersReducedMotion && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.25;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
    if (!prefersReducedMotion && innerRef.current) {
      innerRef.current.rotation.y -= delta * 0.15;
    }
    if (!prefersReducedMotion && ringRef.current) {
      ringRef.current.rotation.z += delta * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer Wireframe Globe */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2.2, 24, 24]} />
        <meshBasicMaterial
          color="#D4AF37"
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Inner Dense Wireframe Core */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshBasicMaterial
          color="#F3E5AB"
          wireframe
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* Inner Glowing Central Sphere */}
      <mesh>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial
          color="#AA8820"
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Emergency Orbital Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[2.5, 2.58, 48]} />
        <meshBasicMaterial
          color="#D4AF37"
          transparent
          opacity={0.4}
          side={2} // DoubleSide
        />
      </mesh>
    </group>
  );
}

export default function HeroGlobe3D() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    // Simple WebGL detection check
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (!hasWebGL) {
    return (
      <div className="w-full h-[320px] sm:h-[400px] flex items-center justify-center">
        <div className="w-48 h-48 rounded-full border border-gold/30 flex items-center justify-center bg-gold/5 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
          <div className="w-32 h-32 rounded-full border border-gold/40 border-dashed animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[320px] sm:h-[420px] relative pointer-events-none sm:pointer-events-auto">
      {/* Glow backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12)_0%,transparent_70%)] pointer-events-none" />

      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#FFF8DC" />
        <Suspense fallback={null}>
          <Float speed={prefersReducedMotion ? 0 : 1.5} rotationIntensity={0.2} floatIntensity={0.3}>
            <WireframeGlobe prefersReducedMotion={prefersReducedMotion} />
          </Float>
        </Suspense>
      </Canvas>
    </div>
  );
}
