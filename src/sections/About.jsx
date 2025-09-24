import { useState } from 'react';
import { motion } from 'framer-motion';

import Button from '../components/Button.jsx';

const About = () => {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('bhargavadevanshu10@gmail.com');
    setHasCopied(true);

    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  };

  return (
    <section className="c-space my-20" id="about">
      <motion.div 
        className="grid xl:grid-cols-3 xl:grid-rows-6 md:grid-cols-2 grid-cols-1 gap-5 h-full"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, staggerChildren: 0.2 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.div 
          className="col-span-1 xl:row-span-3"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
        >
          <div className="grid-container">
            <img src="assets/abhay.jpeg" alt="grid-1" className="w-full sm:h-[276px] h-fit object-contain" />

            <div>
              <p className="grid-headtext">Hi, I'm Devanshu Bhargava</p>
              <p className="grid-subtext">I am a Full Stack Engineer skilled in Java, Spring Boot, Python(Numpy , Pandas , Scikit-Learn) , React.
I bring advanced knowledge of Data Science and Machine Learning to build intelligent solutions.
With a strong interest in Cloud and DevOps, I focus on scalability and reliability.
I am dedicated, hardworking, and passionate about solving complex problems.
                
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="xl:col-span-2 xl:row-span-4"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="grid-container">
            <img src="assets/grid3.png" alt="grid-2" className="w-full sm:h-[276px] h-fit object-contain" />

            <div>
              <p className="grid-headtext">Tech Stack</p>
              <div className="grid-subtext space-y-4">
                <div>
                  <h4 className="text-white font-semibold mb-2">Programming Languages</h4>
                  <p className="text-gray-300">C#, Java, Python, R, SQL, JavaScript</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Frontend Development</h4>
                  <p className="text-gray-300">React.js, Redux, Tailwind CSS, React Router, Axios</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Backend Development</h4>
                  <p className="text-gray-300">Spring Boot, Spring MVC, Spring Data JPA, Hibernate, Spring Security</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Database Technologies</h4>
                  <p className="text-gray-300">MySQL, PostgreSQL, MongoDB</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Cloud & DevOps</h4>
                  <p className="text-gray-300">AWS (EC2, S3, RDS, IAM), Docker, Kubernetes, GitHub Actions, Nginx</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Machine Learning & AI</h4>
                  <p className="text-gray-300">Numpy , Pandas , Scikit-learn  , Scipy , Seaborn  , Linear/Logistic Regression, Decision Trees, Random Forests, K-means, XGBoost</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="col-span-1 xl:row-span-2"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <div className="grid-container">
            <div className="rounded-3xl w-full sm:h-[200px] h-fit flex justify-center items-center">
              <div className="flex justify-center items-center h-[200px]">
                <img src="assets/grid7.png" alt="resume" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <p className="grid-headtext">Resume</p>
              <p className="grid-subtext">Download my resume to learn more about my experience and skills.</p>
              <a href="/devnashu bahrgava new resume.pdf" download="Devanshu_Bhargava_Resume.pdf">
                <Button name="Download my resume" isBeam containerClass="w-full mt-10" />
              </a>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="xl:col-span-1 xl:row-span-1"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
.
        </motion.div>
      </motion.div>
    </section>
  );
};

export default About;