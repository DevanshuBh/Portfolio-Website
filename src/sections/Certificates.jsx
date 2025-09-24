import { motion } from 'framer-motion';
import { certificates } from '../constants/index.js';

const Certificates = () => {
  return (
    <section className="c-space my-20" id="certificates">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <p className="head-text">Professional Certificates</p>
        
        <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-8 mt-12">
          {certificates.map((cert, index) => (
            <motion.div
              key={cert.id}
              className="bg-black-200 border border-black-300 rounded-lg p-6 hover:bg-black-300 transition-all duration-300"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-full h-48 mb-4 rounded-lg overflow-hidden bg-black-100">
                <img 
                  src={cert.image} 
                  alt={cert.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <h3 className="text-white font-semibold text-lg mb-2">{cert.title}</h3>
              <p className="text-gray-400 text-sm mb-1">{cert.issuer}</p>
              <p className="text-gray-500 text-sm mb-4">{cert.date}</p>
              
              <a 
                href={cert.credentialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-md text-sm hover:opacity-80 transition-opacity"
              >
                View Credential
              </a>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Certificates;