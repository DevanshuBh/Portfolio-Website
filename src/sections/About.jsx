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
              <p className="grid-subtext">
                I am a backend-focused Software Engineer with 2+ years of experience building event-driven systems in
                Java, Spring Boot and Apache Kafka on an enterprise payment fraud detection platform. I build for
                correctness under failure (idempotency, outbox, DLQs, circuit breakers, backpressure), prove it with
                integration, load and chaos tests, and deploy on AWS with Terraform.
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
                  <h4 className="text-white font-semibold mb-2">Languages</h4>
                  <p className="text-gray-300">Java 21, Python, TypeScript, JavaScript, SQL</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Backend & Distributed Systems</h4>
                  <p className="text-gray-300">Spring Boot, FastAPI, gRPC, REST, Microservices, Kafka, Redis, Celery, Resilience4j</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Databases</h4>
                  <p className="text-gray-300">PostgreSQL, TimescaleDB, pgvector, Neo4j</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Generative AI & ML</h4>
                  <p className="text-gray-300">RAG, LangGraph, LangChain, Amazon Bedrock, Ollama, scikit-learn, MLflow</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Cloud & DevOps</h4>
                  <p className="text-gray-300">AWS (ECS, RDS, ElastiCache, S3, Cognito), Terraform, Docker, Kubernetes, GitHub Actions</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Frontend & Testing</h4>
                  <p className="text-gray-300">React, Next.js, Testcontainers, JUnit 5, pytest, k6, OpenTelemetry, Prometheus, Grafana</p>
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
              <a href="/Devanshu_Bhargava_Resume.pdf" download="Devanshu_Bhargava_Resume.pdf">
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