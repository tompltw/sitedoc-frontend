'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Activity, Bot, Shield, Zap } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-lg tracking-tight">SiteDoc</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-slate-300 hover:text-white text-sm px-4 py-2 rounded-lg transition hover:bg-slate-800"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <Activity className="w-3.5 h-3.5" />
            Powered by AI
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6 tracking-tight">
            AI-powered WordPress maintenance.{' '}
            <span className="text-blue-400">
              Fix issues before your users notice.
            </span>
          </h1>

          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            SiteDoc continuously monitors your WordPress sites, diagnoses problems instantly,
            and applies fixes automatically — so you can focus on what matters.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3 rounded-xl transition text-sm"
            >
              Start free trial
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-7 py-3 rounded-xl transition text-sm"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Instant Diagnosis */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition">
            <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl w-fit mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-white font-semibold mb-2">Instant Diagnosis</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              AI scans your site in seconds, identifies root causes, and assigns a confidence
              score to every finding so you know exactly what to trust.
            </p>
          </div>

          {/* Automated Fixes */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition">
            <div className="bg-green-500/10 text-green-400 p-3 rounded-xl w-fit mb-4">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-white font-semibold mb-2">Automated Fixes</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Approve a fix with one click. The agent handles everything — plugin updates,
              config changes, and cache clears — with a full audit trail.
            </p>
          </div>

          {/* 24/7 Monitoring */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition">
            <div className="bg-purple-500/10 text-purple-400 p-3 rounded-xl w-fit mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-white font-semibold mb-2">24/7 Monitoring</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Continuous health checks around the clock. Get alerted the moment something
              goes wrong, before your visitors ever notice.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 text-center text-slate-600 text-xs py-5 flex-shrink-0">
        © {new Date().getFullYear()} SiteDoc — keeping your sites healthy.
      </footer>
    </div>
  );
}
