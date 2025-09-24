import { motion } from 'framer-motion';

const Footer = () => {
  return (
    <motion.footer 
      className="c-space pt-7 pb-3 border-t border-black-300 flex justify-between items-center flex-wrap gap-5"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="text-white-500 flex gap-2">
        <p>Terms & Conditions</p>
        <p>|</p>
        <p>Privacy Policy</p>
      </div>

      

      <p className="text-white-500">© 2024 Devanshu Bhargava. All rights reserved.</p>
    </motion.footer>
  );
};

export default Footer;
