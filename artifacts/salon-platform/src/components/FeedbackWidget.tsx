import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle, ChevronDown } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

type FeedbackType = 'bug' | 'idea' | 'general';

const FEEDBACK_TYPES: { value: FeedbackType; labelAr: string; labelEn: string; emoji: string }[] = [
  { value: 'bug',     labelAr: 'مشكلة تقنية',  labelEn: 'Bug Report', emoji: '🐛' },
  { value: 'idea',    labelAr: 'اقتراح',        labelEn: 'Suggestion',  emoji: '💡' },
  { value: 'general', labelAr: 'ملاحظة عامة',  labelEn: 'General',     emoji: '💬' },
];

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, '').replace(/\/salon-platform$/, '') ?? '';

export default function FeedbackWidget() {
  const { isAr } = useLanguage();
  const [open, setOpen]         = useState(false);
  const [type, setType]         = useState<FeedbackType>('general');
  const [message, setMessage]   = useState('');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  const labels = {
    title:       isAr ? 'أرسل ملاحظتك' : 'Send Feedback',
    placeholder: isAr ? 'اكتب ملاحظتك هنا...' : 'Write your feedback here...',
    send:        isAr ? 'إرسال' : 'Send',
    sending:     isAr ? 'جارٍ الإرسال...' : 'Sending...',
    sentTitle:   isAr ? 'شكراً لك! 🎉' : 'Thank you! 🎉',
    sentBody:    isAr ? 'تم استلام ملاحظتك بنجاح.' : 'Your feedback was received.',
    another:     isAr ? 'إرسال ملاحظة أخرى' : 'Send another',
    error:       isAr ? 'فشل الإرسال. حاول مرة أخرى.' : 'Failed to send. Please try again.',
    typeLabel:   isAr ? 'النوع' : 'Type',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: message.trim() }),
      });
      setSent(true);
      setMessage('');
    } catch {
      setError(labels.error);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setSent(false);
    setError('');
    setType('general');
    setMessage('');
  };

  return (
    <div
      className={`fixed bottom-6 z-50 flex flex-col items-end gap-2 ${isAr ? 'left-6' : 'right-6'}`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Panel */}
      {open && (
        <div className="w-80 rounded-2xl shadow-2xl border border-gray-100 bg-white overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600">
            <span className="text-white font-semibold text-sm">{labels.title}</span>
            <button
              onClick={() => { setOpen(false); reset(); }}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4">
            {sent ? (
              /* Success state */
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle size={40} className="text-green-500" />
                <p className="font-semibold text-gray-800">{labels.sentTitle}</p>
                <p className="text-sm text-gray-500">{labels.sentBody}</p>
                <button
                  onClick={reset}
                  className="mt-1 text-sm text-violet-600 hover:underline"
                >
                  {labels.another}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {/* Type selector */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{labels.typeLabel}</label>
                  <div className="flex gap-2">
                    {FEEDBACK_TYPES.map(ft => (
                      <button
                        key={ft.value}
                        type="button"
                        onClick={() => setType(ft.value)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-all ${
                          type === ft.value
                            ? 'border-violet-500 bg-violet-50 text-violet-700 font-semibold'
                            : 'border-gray-200 text-gray-500 hover:border-violet-300'
                        }`}
                      >
                        <span>{ft.emoji}</span>
                        <span>{isAr ? ft.labelAr : ft.labelEn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={labels.placeholder}
                  rows={4}
                  required
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />

                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                >
                  <Send size={14} />
                  {sending ? labels.sending : labels.send}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => { setOpen(o => !o); if (sent) reset(); }}
        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
      >
        {open
          ? <ChevronDown size={18} />
          : <MessageSquarePlus size={18} />
        }
        {!open && <span>{isAr ? 'ملاحظة' : 'Feedback'}</span>}
      </button>
    </div>
  );
}
