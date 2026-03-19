import React, { useState } from 'react';
import { ArrowRight, Copy, Check, Download, Terminal, TrendingUp, BarChart3, Target, Mail, Users, Megaphone, Settings, BookOpen } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Install', href: '#install' },
  { label: 'Features', href: '#features' },
  { label: 'Niches', href: '#niches' },
  { label: 'How It Works', href: '#how-it-works' },
];

const Header: React.FC = () => (
  <header className="bg-[#0c0c0c] sticky top-0 z-50">
    <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
      <div className="flex items-center justify-between h-14 md:h-20">
        <a href="/" className="flex items-center gap-2">
          <img
            src="https://media.beehiiv.com/cdn-cgi/image/format=auto,fit=scale-down,onerror=redirect/uploads/asset/file/dc06754c-3d68-414e-8c9f-d8091d529feb/Gemini_Generated_Image_37yx9o37yx9o37yx_1.png"
            alt="beehiiv Newsletter Advisor"
            className="h-10 md:h-14"
          />
        </a>
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-[#888] hover:text-white text-sm font-medium transition-colors">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/beehiiv/beehiiv-newsletter-advisor"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-white border-2 border-transparent text-black text-base font-medium tracking-normal rounded-[6px] hover:bg-[#ddd] transition-all flex items-center gap-2"
          >
            <span className="hidden sm:inline">View on GitHub</span>
            <span className="sm:hidden">GitHub</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
    <div className="h-[2px] w-full bg-gradient-to-r from-[#0c0c0c] via-[#333] to-[#0c0c0c]"></div>
  </header>
);

const INSTALL_COMMANDS: Record<string, { command: string; note?: string }> = {
  'Claude Code': { command: 'git clone https://github.com/beehiiv/beehiiv-newsletter-advisor.git ~/.claude/skills/beehiiv-newsletter-advisor' },
  'Claude': { command: '' },
  'Cursor': { command: 'git clone https://github.com/beehiiv/beehiiv-newsletter-advisor.git .cursor/rules/beehiiv-newsletter-advisor' },
  'Manual': { command: 'curl -L https://github.com/beehiiv/beehiiv-newsletter-advisor/archive/main.tar.gz | tar xz' },
};

const FEATURES = [
  { icon: TrendingUp, title: 'Growth Strategy', desc: 'Data-backed tactics: Recommendations (2.75x faster), Boosts, Referrals, Magic Links' },
  { icon: Megaphone, title: 'Monetization', desc: 'Ad Network, Paid Subs ($19M in 2025), Boosts, Digital Products, Sponsorships' },
  { icon: BarChart3, title: 'Real Benchmarks', desc: '41.24% open rate, 3.23% CTR, 98.9% delivery — from 28B emails in 2025' },
  { icon: Mail, title: 'Deliverability', desc: 'List hygiene, ISP reputation, send timing, spam complaint reduction' },
  { icon: Settings, title: 'Platform Mastery', desc: 'Automations v4, Dynamic Content, Segmentation, A/B Testing, Website Builder' },
  { icon: Target, title: 'Subject Lines', desc: 'Short, curiosity-driven lines. Questions outperform. Best days: Tue/Wed, early AM' },
  { icon: Users, title: 'Audience Building', desc: 'Month 1 median: 482 subs → Year 1: 8,314 (17x). First dollar in 66 days' },
  { icon: BookOpen, title: 'Every Niche', desc: 'Industry breakdowns: Podcasts 51%+ open rate, Space/Poetry 7.7%+ CTR' },
];

const STATS = [
  { value: '28B', label: 'Emails Analyzed' },
  { value: '41.24%', label: 'Open Rate (2025)' },
  { value: '$19M', label: 'Paid Sub Revenue' },
  { value: '17×', label: 'Year 1 Growth' },
];

const NICHES = [
  'Podcasts', 'History', 'Religion', 'Parenting', 'Space', 'Poetry',
  'Transportation', 'News', 'Tech', 'Finance', 'Health', 'Business',
  'Education', 'Sports', 'Entertainment', 'Marketing', 'Design', 'Food',
];

const App: React.FC = () => {
  const [platform, setPlatform] = useState('Claude Code');
  const [copied, setCopied] = useState(false);

  const currentInstall = INSTALL_COMMANDS[platform];

  const copyCommand = () => {
    const text = currentInstall.command || currentInstall.note || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-[#e5e5e5] flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <div className="relative px-6 lg:px-8 pt-10 md:pt-20 pb-0 flex items-center justify-center">
          <div className="max-w-[1280px] mx-auto w-full text-center">
            <div className="animate-fade-slide-right" style={{ animationFillMode: 'both' }}>
              <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-bold text-white mb-6 uppercase leading-none tracking-normal">
                <span className="inline-block">Your Newsletter</span><br />
                <span className="inline-block text-[#888]">Growth Expert</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl leading-relaxed text-[#888] font-normal mx-auto max-w-2xl">
                Expert beehiiv newsletter advice powered by real data from 28 billion emails. Install as an AI skill and get instant, data-backed guidance.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <a
                  href="#install"
                  className="w-full sm:w-auto rounded-[6px] bg-white border-2 border-transparent px-8 py-3.5 text-[16px] font-medium tracking-normal text-black text-center flex items-center justify-center gap-2 btn-stack"
                >
                  Install Skill <Terminal className="w-4 h-4" />
                </a>
                <a
                  href="https://github.com/beehiiv/beehiiv-newsletter-advisor/releases/latest/download/beehiiv-newsletter-advisor.skill"
                  className="w-full sm:w-auto rounded-[6px] bg-transparent border-2 border-[#333] px-8 py-3.5 text-[16px] font-medium tracking-normal text-[#e5e5e5] text-center flex items-center justify-center gap-2 btn-stack"
                >
                  Download .skill <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Install Section */}
        <div id="install" className="max-w-3xl mx-auto w-full px-6 lg:px-8 pt-12 pb-8 scroll-mt-24">
          {/* Platform tabs */}
          <div className="flex gap-0 border-b border-[#333] mb-0">
            {Object.keys(INSTALL_COMMANDS).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  platform === p
                    ? 'border-white text-white'
                    : 'border-transparent text-[#666] hover:text-[#aaa]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Terminal / Instructions */}
          {currentInstall.command ? (
            <div className="terminal-block" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
              <div className="terminal-header">
                <div className="terminal-dots">
                  <div className="terminal-dot" style={{ background: '#ff5f57' }} />
                  <div className="terminal-dot" style={{ background: '#ffbd2e' }} />
                  <div className="terminal-dot" style={{ background: '#28c840' }} />
                </div>
                <button onClick={copyCommand} className="flex items-center gap-1.5 text-[#666] hover:text-white transition-colors text-xs font-mono">
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
              <div className="terminal-body">
                <code className="font-mono text-sm whitespace-nowrap">
                  <span className="text-[#888] select-none">$ </span>
                  <span className="text-gray-200">{currentInstall.command}</span>
                </code>
              </div>
            </div>
          ) : (
            <div className="border border-[#333] rounded-b-xl p-6 bg-[#111]">
              <p className="text-[#ccc] text-sm leading-relaxed">
                Go to <a href="https://claude.ai/customize/skills" target="_blank" rel="noopener noreferrer" className="text-white underline hover:no-underline">claude.ai/customize/skills</a> → Click + → Upload a skill → Upload the .skill file
              </p>
              <a
                href="https://github.com/beehiiv/beehiiv-newsletter-advisor/releases/latest/download/beehiiv-newsletter-advisor.skill"
                className="inline-flex items-center gap-1.5 mt-3 text-white text-sm font-medium hover:underline"
              >
                Download .skill file first <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="max-w-[1280px] mx-auto w-full px-6 lg:px-8 pt-8 pb-8">
          <p className="text-[#888] text-center mb-6 text-sm">
            Powered by beehiiv's 2025 dataset — real numbers from real newsletters.{' '}
            <a href="https://www.beehiiv.com/blog/2025-state-of-newsletters" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">Read the full report →</a>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="border border-[#333] rounded-xl p-5 text-center hover:border-[#555] transition-colors">
                <div className="font-display text-3xl md:text-4xl font-bold text-white">
                  {s.value}
                </div>
                <div className="text-sm text-[#888] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="max-w-[1280px] mx-auto w-full px-6 lg:px-8 py-12 scroll-mt-24">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white uppercase text-center mb-2">
            What It Knows
          </h2>
          <p className="text-[#888] text-center mb-10">Real benchmarks and strategies from beehiiv's 2025 dataset.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="border border-[#333] rounded-xl p-5 hover:border-[#555] transition-colors group">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors self-center">
                    <f.icon className="w-6 h-6 text-[#888] group-hover:text-black transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-body text-lg font-bold text-[#e5e5e5] mb-1">{f.title}</h3>
                    <p className="text-sm text-[#888] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Niches */}
        <div id="niches" className="max-w-[1280px] mx-auto w-full px-6 lg:px-8 py-12 scroll-mt-24">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white uppercase text-center mb-2">
            Every Niche
          </h2>
          <p className="text-[#888] text-center mb-8">Industry-specific benchmarks and strategies.</p>

          <div className="flex flex-wrap justify-center gap-2.5">
            {NICHES.map((n) => (
              <span key={n} className="border border-[#333] rounded-full px-4 py-2 text-sm text-[#aaa] hover:border-[#555] hover:text-white transition-colors cursor-default">
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="max-w-[1280px] mx-auto w-full px-6 lg:px-8 py-12 scroll-mt-24">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white uppercase text-center mb-10">
            How It Works
          </h2>

          <div className="space-y-8 max-w-2xl mx-auto">
            {[
              { step: '01', title: 'Install', desc: 'Clone the skill into your Claude Code (or Cursor) skills directory with one terminal command.' },
              { step: '02', title: 'Ask Anything', desc: '"How do I grow my list?" "What\'s a good open rate?" "How do I monetize?" — just ask naturally.' },
              { step: '03', title: 'Get Expert Answers', desc: 'Claude responds with data-backed advice from 28B emails, real beehiiv platform knowledge, and proven strategies.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="font-display text-4xl font-bold text-[#555] leading-none mb-2">
                  {s.step}
                </div>
                <h3 className="font-body text-xl font-bold text-[#e5e5e5] mb-1">{s.title}</h3>
                <p className="text-[#888] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-[1280px] mx-auto w-full px-6 lg:px-8 py-16 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white uppercase mb-4">
            Start Getting Better Advice
          </h2>
          <p className="text-[#888] mb-8 max-w-xl mx-auto">Free and open source. Install in seconds.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <a
              href="#install"
              className="w-full sm:w-auto rounded-[6px] bg-white border-2 border-transparent px-8 py-3.5 text-[16px] font-medium tracking-normal text-black text-center flex items-center justify-center gap-2 btn-stack"
            >
              Install Now <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/beehiiv/beehiiv-newsletter-advisor"
              target="_blank"
              rel="noopener"
              className="w-full sm:w-auto rounded-[6px] bg-transparent border-2 border-[#333] px-8 py-3.5 text-[16px] font-medium tracking-normal text-[#e5e5e5] text-center btn-stack"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#222] py-8 px-6 text-center">
        <p className="text-sm text-[#666]">
          Built by{' '}
          <a href="https://twitter.com/alwayscreating" target="_blank" rel="noopener" className="text-[#888] hover:text-white transition-colors">
            @alwayscreating
          </a>
          {' · '}
          <a href="https://github.com/beehiiv/beehiiv-newsletter-advisor" target="_blank" rel="noopener" className="text-[#888] hover:text-white transition-colors">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
