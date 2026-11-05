import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";

const palette = {
  Midnight: { dial: "#25232c", strap: "#302d35" },
  Ivory: { dial: "#e9e1d3", strap: "#80664e" },
  "Cosmic Blue": { dial: "#253b64", strap: "#27374b" },
  Silver: { dial: "#c5c6c5", strap: "#777b7e" },
  Titanium: { dial: "#7a8584", strap: "#616968" },
  Black: { dial: "#17191c", strap: "#17191c" },
  Obsidian: { dial: "#242124", strap: "#2b211c" },
  Champagne: { dial: "#bca77e", strap: "#80664e" },
  "Royal Green": { dial: "#274938", strap: "#294333" },
  Onyx: { dial: "#211f20", strap: "#282627" },
  Graphite: { dial: "#363b40", strap: "#31363b" },
  Orange: { dial: "#bd552a", strap: "#b7522d" },
  Sand: { dial: "#c7b397", strap: "#a18a69" },
  Forest: { dial: "#304435", strap: "#364438" },
  Slate: { dial: "#4b555d", strap: "#414950" },
  "Rose Gold": { dial: "#b57f6d", strap: "#714b43" },
  Gold: { dial: "#b59a68", strap: "#8c7752" },
  Blue: { dial: "#304d74", strap: "#394c65" },
};

function WatchModel({ watch, variant, autoRotate, reactToPointer }) {
  const group = useRef();
  const colors = palette[variant] || { dial: watch.accent || "#36313b", strap: "#493d38" };
  const markers = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2;
    return [Math.sin(angle) * 0.53, Math.cos(angle) * 0.53, 0.19];
  }), []);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (autoRotate) group.current.rotation.y += delta * 0.16;
    if (reactToPointer) {
      group.current.rotation.x += (-state.pointer.y * 0.12 - group.current.rotation.x) * Math.min(delta * 2, 1);
      group.current.rotation.z += (state.pointer.x * 0.09 - group.current.rotation.z) * Math.min(delta * 2, 1);
    }
  });

  return (
    <group ref={group} rotation={[0.08, 0, -0.15]} scale={1.03}>
      <mesh position={[0, 0.94, -0.04]} castShadow>
        <boxGeometry args={[0.42, 0.88, 0.13]} />
        <meshStandardMaterial color={colors.strap} roughness={0.78} />
      </mesh>
      <mesh position={[0, -0.94, -0.04]} castShadow>
        <boxGeometry args={[0.42, 0.88, 0.13]} />
        <meshStandardMaterial color={colors.strap} roughness={0.78} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.77, 0.77, 0.23, 72]} />
        <meshStandardMaterial color="#b4a58c" metalness={0.85} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.69, 0.69, 0.04, 72]} />
        <meshStandardMaterial color={colors.dial} metalness={0.25} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.158]}>
        <torusGeometry args={[0.7, 0.025, 12, 72]} />
        <meshStandardMaterial color="#d7c9a8" metalness={0.9} roughness={0.2} />
      </mesh>
      {markers.map((position, index) => (
        <mesh key={index} position={position} rotation={[0, 0, -(index / 12) * Math.PI * 2]}>
          <boxGeometry args={[index % 3 === 0 ? 0.035 : 0.018, index % 3 === 0 ? 0.09 : 0.055, 0.018]} />
          <meshStandardMaterial color="#e2c99a" metalness={0.75} roughness={0.28} />
        </mesh>
      ))}
      <mesh position={[0, 0.1, 0.2]} rotation={[0, 0, -0.42]}>
        <boxGeometry args={[0.038, 0.34, 0.02]} />
        <meshStandardMaterial color="#f0e2c5" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.09, 0.22]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.025, 0.46, 0.018]} />
        <meshStandardMaterial color="#f0e2c5" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.23]}>
        <circleGeometry args={[0.045, 24]} />
        <meshStandardMaterial color="#ff6b1a" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0.81, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.22, 24]} />
        <meshStandardMaterial color="#aa9a7f" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function WatchCanvas({ watch, variant, interactive = true, autoRotate = true, reactToPointer = interactive }) {
  return (
    <div className="watch-canvas" role="img" aria-label={`Interactive 3D model of ${watch.name}; selected colour ${variant}`}>
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 36 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#f2efeb"]} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 4, 5]} intensity={3} castShadow />
        <directionalLight position={[-3, -2, 2]} intensity={1.2} color="#cdb7a1" />
        <Suspense fallback={null}>
          <WatchModel watch={watch} variant={variant} autoRotate={autoRotate} reactToPointer={reactToPointer} />
          <ContactShadows position={[0, -1.65, 0]} opacity={0.28} scale={4} blur={2.2} far={3} />
        </Suspense>
        {interactive && <OrbitControls enablePan={false} minDistance={2.6} maxDistance={5} minPolarAngle={0.65} maxPolarAngle={2.5} />}
      </Canvas>
    </div>
  );
}
