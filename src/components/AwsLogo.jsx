import { useGLTF } from '@react-three/drei';
import { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const AwsLogo = (props) => {
  const awsRef = useRef();
  const { scene } = useGLTF('/models/aws-logo/scene.gltf');
  
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color.setHex(0xFFFFFF);
        child.material.emissive.setHex(0x333333);
        child.material.needsUpdate = true;
      }
    });
  }, [scene]);
  
  useGSAP(() => {
    gsap.to(awsRef.current.position, {
      y: awsRef.current.position.y + 0.3,
      duration: 1.8,
      repeat: -1,
      yoyo: true,
    });
  });
  
  return (
    <mesh {...props} ref={awsRef} rotation={[0, Math.PI / 3, 0]} scale={0.2} position={[-10, -5, 0]}>
      <primitive object={scene} />
    </mesh>
  );
};

useGLTF.preload('/models/aws-logo/scene.gltf');

export default AwsLogo;