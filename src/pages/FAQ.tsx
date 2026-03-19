import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SubmitCTA from '../components/SubmitCTA';
import FAQSection from '../components/FAQSection';

const FAQ: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center">
        <FAQSection />
      </main>
      <SubmitCTA />
      <Footer />
    </div>
  );
};

export default FAQ;
