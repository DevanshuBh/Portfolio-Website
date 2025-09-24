import { useGLTF } from '@react-three/drei';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const MLBook = (props) => {
  const bookRef = useRef();
  const { scene } = useGLTF('/textures/desk/hands-on_machine_learning_3d_book_model/scene.gltf');
  
  useGSAP(() => {
    gsap.to(bookRef.current.position, {
      y: bookRef.current.position.y + 0.2,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
    });
  });
  
  return (
    <mesh {...props} ref={bookRef} rotation={[0, Math.PI / 6, 0]} scale={2} position={[5, -8, 0]}>
      <primitive object={scene} />
    </mesh>
  );
};

useGLTF.preload('/textures/desk/hands-on_machine_learning_3d_book_model/scene.gltf');

export default MLBook;