import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    question: "I'm a publisher — how can I monetize my newsletter with ads?",
    answer: (
      <>
        You can monetize your newsletter by joining the <a href="https://app.beehiiv.com/" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:text-gray-900 underline decoration-brand-accent/30 transition-colors">beehiiv Ad Network</a>. It connects publishers with premium advertisers so you can earn revenue from your audience without any extra work.
      </>
    )
  },
  {
    question: "I'm an advertiser — how can I reach newsletter audiences?",
    answer: (
      <>
        The beehiiv Ad Network gives you access to millions of engaged newsletter readers across every niche. <a href="https://www.beehiiv.com/i-want-to/advertise" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:text-gray-900 underline decoration-brand-accent/30 transition-colors">Start advertising on beehiiv</a> to get your brand in front of the right audience.
      </>
    )
  },
  {
    question: "What is Very Good Ads?",
    answer: "Very Good Ads is a curated gallery showcasing the best ads from brands and creators around the world. We highlight inspiring examples of ad creative to spark ideas for your next campaign."
  },
  {
    question: "How are ads selected?",
    answer: "We hand-pick ads based on creative quality, effectiveness, and originality. Our collection spans across industries and formats to give you a diverse source of inspiration."
  },
  {
    question: "Can I submit an ad to be featured?",
    answer: "Yes! We're always looking for great ads to showcase. Use the Submit button to send us an ad you think deserves to be featured in our collection."
  },
  {
    question: "What types of ads are featured?",
    answer: "We feature a wide range of ad formats including display ads, social media ads, video ads, landing pages, email campaigns, and more from brands of all sizes."
  },
  {
    question: "Is Very Good Ads free to use?",
    answer: "Yes, browsing our collection is completely free. We believe great ad inspiration should be accessible to everyone."
  },
  {
    question: "How often is the collection updated?",
    answer: "We add new ads regularly to keep the collection fresh and relevant. Check back often for new inspiration."
  }
];

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl mx-auto w-full pt-16 lg:pt-24 pb-8 lg:pb-12 px-6">
      <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 text-center mb-8 md:mb-16 uppercase tracking-tight">
        Frequently Asked Questions
      </h2>
      <div className="space-y-0">
        {FAQS.map((faq, index) => (
          <div key={index} className="border-b border-gray-200 last:border-b-0">
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between py-6 text-left group focus:outline-none"
            >
              <span className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-brand-accent transition-colors pr-8">
                {faq.question}
              </span>
              {openIndex === index ? (
                <ChevronUp className="w-5 h-5 text-brand-accent shrink-0 transition-transform duration-300" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-brand-accent shrink-0 transition-all duration-300" />
              )}
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${openIndex === index ? 'grid-rows-[1fr] opacity-100 pb-6' : 'grid-rows-[0fr] opacity-0 pb-0'}`}
            >
              <div className="overflow-hidden">
                <p className="text-gray-500 text-lg leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQSection;
