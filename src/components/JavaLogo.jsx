import { useGLTF } from '@react-three/drei';
import { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const JavaLogo = (props) => {
  const javaRef = useRef();
  const { scene } = useGLTF('/models/java-logo/scene.gltf');
  
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color.setHex(0xED8B00); // Java orange
      }
    });
  }, [scene]);
  
  useGSAP(() => {
    gsap.to(javaRef.current.position, {
      y: javaRef.current.position.y + 0.3,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
    });
  });
  
  return (
    <mesh {...props} ref={javaRef} rotation={[0, Math.PI / 5, 0]} scale={1.5} position={[-10, 0, 0]}>
      <primitive object={scene} />
    </mesh>
  );
};

useGLTF.preload('/models/java-logo/scene.gltf');

export default JavaLogo;