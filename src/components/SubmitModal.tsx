import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, CheckCircle } from 'lucide-react';

interface SubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SubmitModal: React.FC<SubmitModalProps> = ({ isOpen, onClose }) => {
  const [productUrl, setProductUrl] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!productUrl.trim()) {
      setError('Product URL is required');
      return;
    }

    // Auto-add https:// if missing
    let finalUrl = productUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    // Basic URL validation
    try {
      new URL(finalUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl: finalUrl, email })
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setProductUrl('');
        setEmail('');
        setIsSuccess(false);
      }, 2000);
    } catch (err) {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setProductUrl('');
    setEmail('');
    setError('');
    setIsSuccess(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold font-display text-gray-900 uppercase">Submit an Ad</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="w-16 h-16 text-brand-accent mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h3>
              <p className="text-gray-500">Your submission has been received.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="productUrl" className="block text-sm font-medium text-gray-500 mb-2">
                  Ad URL <span className="text-red-500">*</span>
                </label>
                <input
                  ref={inputRef}
                  id="productUrl"
                  type="text"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="example.com/your-ad"
                  className="w-full bg-gray-50 border border-gray-200 rounded-[6px] px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-brand-accent transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-500 mb-2">
                  Your Email <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-[6px] px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-brand-accent transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-button text-white font-medium py-3 px-4 rounded-[6px] flex items-center justify-center gap-2 hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Ad
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                We'll review your submission and add it to the collection if it's a great ad.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmitModal;
