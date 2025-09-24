import { useGLTF } from '@react-three/drei';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const PythonLogo = (props) => {
  const pythonRef = useRef();
  const { scene } = useGLTF('/models/python-logo/scene.gltf');
  

  
  useGSAP(() => {
    gsap.to(pythonRef.current.position, {
      y: pythonRef.current.position.y + 0.4,
      duration: 2,
      repeat: -1,
      yoyo: true,
    });
  });
  
  return (
    <mesh {...props} ref={pythonRef} rotation={[0, -Math.PI / 4, 0]} scale={0.5} position={[10, -2, 0]}>
      <primitive object={scene} />
    </mesh>
  );
};

useGLTF.preload('/models/python-logo/scene.gltf');

export default PythonLogo;