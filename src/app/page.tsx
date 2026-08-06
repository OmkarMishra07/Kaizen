'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Menu } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#1b1b1b] selection:bg-black selection:text-white font-sans overflow-x-hidden">
      {/* Top Navigation */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-black tracking-tighter">LevelUp</span>
          </div>
          {/* Navigation Links */}
          <nav className="hidden md:flex gap-8">
            <Link className="text-black font-bold border-b-2 border-black pb-1 text-xs uppercase transition-all duration-300 hover:scale-105" href="#">Home</Link>
            <Link className="text-gray-600 text-xs uppercase transition-all duration-300 hover:text-black hover:scale-105" href="#">Features</Link>
            <Link className="text-gray-600 text-xs uppercase transition-all duration-300 hover:text-black hover:scale-105" href="#">Pricing</Link>
            <Link className="text-gray-600 text-xs uppercase transition-all duration-300 hover:text-black hover:scale-105" href="#">Blog</Link>
          </nav>
          {/* Trailing Action */}
          <Link href="/login" className="hidden md:flex items-center gap-2 px-6 py-3 border border-black rounded-full text-xs uppercase text-black hover:bg-black hover:text-white transition-colors duration-300 group">
            Get Started
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          {/* Mobile Menu Icon */}
          <button className="md:hidden text-black">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>
      
      <main className="pt-[120px]">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-start pt-16 px-8 text-center overflow-hidden">
          {/* Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="z-10 max-w-4xl mx-auto flex flex-col items-center gap-6"
          >
            <span className="text-xl text-gray-500 italic font-serif">Your Progress, Perfectly Scored.</span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-black max-w-3xl leading-tight tracking-tight">
              Track Smarter,<br />Rank Higher
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mt-4">
              A comprehensive readiness engine that scores your DSA, backend, portfolio, and interview prep — then ranks you from L0 to L6 as you climb toward SDE-1.
            </p>
            <p className="text-sm text-gray-500 opacity-80">
              Visualize your technical evolution with real-time analytics and behavioral tracking.
            </p>
            <Link href="/login" className="mt-8 flex items-center gap-2 px-8 py-4 bg-black text-white rounded-full text-xs uppercase font-bold hover:bg-opacity-90 transition-all shadow-lg group">
              Try it Free
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Dashboard Mockup & Enhanced Gradient */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-full max-w-6xl mt-16 z-10 flex flex-col items-center perspective-1000"
          >
            {/* Dramatic Deep Violet-to-Orange Gradient Background */}
            <div className="absolute inset-0 w-[140%] h-[140%] -left-[20%] -top-[20%] opacity-20 blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle at center, #6b38d4 0%, #E66D35 70%)' }}></div>
            
            {/* Floating Dashboard Mockup */}
            <div className="relative w-[95%] md:w-[90%] aspect-video bg-[#111111] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transform hover:rotate-x-0 transition-transform duration-700 ease-out z-20">
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                {/* Fallback mockup box */}
                <span className="text-xl">Dashboard Mockup</span>
              </div>
            </div>
            
            {/* Glassmorphic Feature Callouts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 w-full px-8 z-30">
              <div className="bg-white/50 backdrop-blur-md border border-gray-200 p-4 rounded-xl text-center shadow-sm">
                <span className="text-xs uppercase text-black font-bold block mb-1">6-Tab Dashboard</span>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Unified View</p>
              </div>
              <div className="bg-white/50 backdrop-blur-md border border-gray-200 p-4 rounded-xl text-center shadow-sm">
                <span className="text-xs uppercase text-black font-bold block mb-1">Radar Charts</span>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Skill Balance</p>
              </div>
              <div className="bg-white/50 backdrop-blur-md border border-gray-200 p-4 rounded-xl text-center shadow-sm">
                <span className="text-xs uppercase text-black font-bold block mb-1">Streak Heatmaps</span>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Consistency</p>
              </div>
              <div className="bg-white/50 backdrop-blur-md border border-gray-200 p-4 rounded-xl text-center shadow-sm">
                <span className="text-xs uppercase text-black font-bold block mb-1">Score History</span>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Growth Tracking</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Second Section - Features Editorial */}
        <section className="py-32 px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-16">
            {/* Headline Left */}
            <div className="col-span-1 md:col-span-6">
              <h2 className="text-4xl md:text-5xl font-bold text-black pr-8">
                Designed to Help You <span className="italic text-gray-600 font-serif font-normal">Climb</span>,<br />Not Guess
              </h2>
            </div>
            {/* Intro Right */}
            <div className="col-span-1 md:col-span-6 flex items-end">
              <p className="text-lg text-gray-600 md:pl-16 border-l md:border-gray-200">
                Stop wandering through generic problem sets. Our platform analyzes your commit history, solving speed, and technical breadth to build a ruthless, highly structured path to your first engineering role.
              </p>
            </div>
            
            {/* Three Column Features */}
            <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-12 mt-12">
              <div className="flex flex-col gap-4 border-t border-black pt-6">
                <span className="text-xs uppercase text-purple-600 font-bold">01</span>
                <h3 className="text-2xl font-bold text-black tracking-tight">Weighted Scoring Engine</h3>
                <p className="text-sm text-gray-600">Intelligently evaluates your performance across DSA, Backend, Portfolio, Consistency, and Interview Prep, generating a holistic readiness score.</p>
              </div>
              <div className="flex flex-col gap-4 border-t border-black pt-6">
                <span className="text-xs uppercase text-purple-600 font-bold">02</span>
                <h3 className="text-2xl font-bold text-black tracking-tight">Multi-Platform Sync</h3>
                <p className="text-sm text-gray-600">Automatically aggregates your activity from LeetCode, GitHub, Codeforces, GeeksforGeeks, and HackerRank into a single, unified profile.</p>
              </div>
              <div className="flex flex-col gap-4 border-t border-black pt-6">
                <span className="text-xs uppercase text-purple-600 font-bold">03</span>
                <h3 className="text-2xl font-bold text-black tracking-tight">L0-L6 Rank Ladder</h3>
                <p className="text-sm text-gray-600">A strict, gamified progression system with hard caps. You don't rank up until your skills are verifiably ready for the next tier of technical rigor.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center px-8 py-12 max-w-7xl mx-auto gap-8">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-black">LevelUp</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6">
              <Link className="text-black font-bold text-xs uppercase opacity-80 hover:opacity-100 transition-colors" href="#">Home</Link>
              <Link className="text-gray-600 text-xs uppercase opacity-80 hover:opacity-100 hover:text-black transition-colors" href="/login">Dashboard</Link>
              <Link className="text-gray-600 text-xs uppercase opacity-80 hover:opacity-100 hover:text-black transition-colors" href="#">Features</Link>
              <Link className="text-gray-600 text-xs uppercase opacity-80 hover:opacity-100 hover:text-black transition-colors" href="#">Pricing</Link>
              <Link className="text-gray-600 text-xs uppercase opacity-80 hover:opacity-100 hover:text-black transition-colors" href="#">Blog</Link>
            </nav>
            <p className="text-sm text-gray-500">© 2026 LevelUp. Precision Engineering for Developers.</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
