import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Battery, MapPin, Zap, History, Car,
  ChevronRight, Shield, BarChart3, ArrowRight,
  Menu, X, CheckCircle, Gauge
} from 'lucide-react';

/* ─── Animation Variants ─── */
const fadeUp: any = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' },
  }),
};

/* ─── Data ─── */
const features = [
  {
    icon: Gauge,
    title: 'EV Range Planner',
    desc: 'Enter your EV telemetry to evaluate usable range, safety buffer distance, and route feasibility with precision.',
    color: '#00E5A0',
  },
  {
    icon: Car,
    title: 'Personalized EV Garage',
    desc: 'Save multiple electric vehicles with their battery capacities, rated ranges, and personalized nicknames in one place.',
    color: '#38BDF8',
  },
  {
    icon: BarChart3,
    title: 'Intelligent Range Analysis',
    desc: 'Evaluate journey feasibility considering battery state, trip distance, and configurable safety reserve margins.',
    color: '#00E5A0',
  },
  {
    icon: Zap,
    title: 'Charging Recommendations',
    desc: 'Receive definitive guidance on whether you can depart immediately or need to plan an en-route fast charge stop.',
    color: '#38BDF8',
  },
  {
    icon: History,
    title: 'Journey History Logs',
    desc: 'Review every journey calculation you run, complete with feasibility status, date records, and printable summaries.',
    color: '#00E5A0',
  },
  {
    icon: MapPin,
    title: 'Trip Planning Simulation',
    desc: 'Test multiple destination distances and reserve factors before setting off to travel with total peace of mind.',
    color: '#38BDF8',
  },
];

const steps = [
  { n: '01', icon: Car,         title: 'Add Your Vehicle',     desc: 'Save your EV with its full-charge range and battery capacity.' },
  { n: '02', icon: Gauge,       title: 'Enter Cluster Telemetry', desc: 'Provide your vehicle battery percentage and current range estimate.' },
  { n: '03', icon: MapPin,      title: 'Plan Your Route',       desc: 'Input destination distance and configure your safety reserve.' },
  { n: '04', icon: CheckCircle, title: 'Get Your Results',      desc: 'Review range feasibility, margin surplus, and advice.' },
];

const stats = [
  { value: '500+',  label: 'EV Owners' },
  { value: '1200+', label: 'Journeys Planned' },
  { value: '99%',   label: 'System Accuracy' },
];

const navLinks = [
  { label: 'Home',         href: '#home' },
  { label: 'Features',     href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
];

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════════════════
          NAVBAR (76px Height, Centered Content Container)
      ══════════════════════════════════════════════════ */}
      <nav className={`site-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container navbar-inner">
          {/* Logo (Aligned to left edge of container) */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, textDecoration: 'none' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #00E5A0, #00b87f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,229,160,0.3)',
            }}>
              <Battery style={{ width: 20, height: 20, color: '#080D18' }} strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              Smart <span style={{ color: '#00E5A0' }}>EV</span>
            </span>
          </Link>

          {/* Nav Links (Centered in desktop viewport) */}
          <div className="hidden md:flex nav-links-center">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="nav-link"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Actions (Aligned to right edge of container) */}
          <div className="hidden md:flex nav-actions-right">
            <Link
              to="/login"
              style={{
                color: '#94A3B8', fontSize: '0.875rem', fontWeight: 600,
                padding: '8px 16px', borderRadius: 8,
                transition: 'color 0.2s ease', textDecoration: 'none',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F8FAFC'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 700, padding: '9px 18px' }}
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              color: '#94A3B8', padding: 8, border: 'none', background: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X style={{ width: 24, height: 24 }} /> : <Menu style={{ width: 24, height: 24 }} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(8,13,24,0.98)',
                borderTop: '1px solid rgba(37,50,71,0.6)',
                backdropFilter: 'blur(20px)',
                overflow: 'hidden',
              }}
            >
              <div className="container" style={{ paddingBlock: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {navLinks.map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'block', color: '#94A3B8',
                      padding: '10px 12px', borderRadius: 8,
                      fontSize: '0.95rem', fontWeight: 500,
                      textDecoration: 'none', transition: 'all 0.2s',
                    }}
                  >
                    {label}
                  </a>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ══════════════════════════════════════════════════
          HERO SECTION (Centered Container, Balanced 2-Column Grid)
      ══════════════════════════════════════════════════ */}
      <section id="home" className="hero-section">
        {/* Ambient Decorative Lighting */}
        <div style={{
          position: 'absolute', top: '10%', left: '8%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(0,229,160,0.06) 0%, transparent 65%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '5%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 65%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div className="container relative">
          <div className="hero-grid">

            {/* ── LEFT COLUMN ── */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="section-label"
              >
                <Zap style={{ width: 13, height: 13 }} />
                Smart Electric Mobility
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                  fontSize: 'clamp(2.3rem, 4.2vw, 3.5rem)',
                  lineHeight: 1.12, letterSpacing: '-0.03em',
                  marginBottom: 20, color: '#F8FAFC',
                }}
              >
                Your EV Journey,{' '}
                <span className="text-gradient-green">Intelligently Planned.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                style={{
                  color: '#94A3B8', fontSize: '1.05rem',
                  lineHeight: 1.7, marginBottom: 32, maxWidth: 520,
                }}
              >
                Understand your battery status, estimate realistic driving range, and assess journey
                feasibility with accurate range calculation and margin safety checks.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 40 }}
              >
                <Link to="/register" className="btn btn-primary btn-lg">
                  Start Planning <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>
                <a href="#features" className="btn btn-secondary btn-lg">
                  Explore Features <ChevronRight style={{ width: 16, height: 16 }} />
                </a>
              </motion.div>

              {/* Stats Row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: 32, paddingTop: 28,
                  borderTop: '1px solid rgba(37,50,71,0.6)',
                }}
              >
                {stats.map(({ value, label }) => (
                  <div key={label}>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.65rem', color: '#00E5A0', lineHeight: 1 }}>
                      {value}
                    </p>
                    <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: 5, fontWeight: 500 }}>
                      {label}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ── RIGHT COLUMN – Live Journey Analysis Dashboard Card ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.2 }}
              style={{ position: 'relative', width: '100%', maxWidth: 520, margin: '0 auto' }}
            >
              {/* Floating Pill: Engine Active */}
              <motion.div
                animate={{ y: [-3, 3, -3] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', top: -14, right: 12, zIndex: 10,
                  background: 'rgba(20,31,48,0.92)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(0,229,160,0.25)', borderRadius: 12,
                  padding: '7px 13px', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5A0' }} className="pulse-dot" />
                <span style={{ color: '#F8FAFC', fontSize: '0.78rem', fontWeight: 600 }}>Range Engine Active</span>
              </motion.div>

              {/* Floating Pill: Route Verified */}
              <motion.div
                animate={{ y: [3, -3, 3] }}
                transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', bottom: -14, left: 12, zIndex: 10,
                  background: 'rgba(20,31,48,0.92)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(56,189,248,0.25)', borderRadius: 12,
                  padding: '7px 13px', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                }}
              >
                <MapPin style={{ width: 14, height: 14, color: '#38BDF8' }} />
                <span style={{ color: '#F8FAFC', fontSize: '0.78rem', fontWeight: 600 }}>Route Verified</span>
              </motion.div>

              {/* Main Preview Card */}
              <div
                className="glass-card"
                style={{
                  padding: '30px 26px',
                  border: '1px solid rgba(0,229,160,0.18)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,229,160,0.07)',
                  borderRadius: 22,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <span style={{ color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>
                      Live Journey Analysis
                    </span>
                    <span style={{ color: '#475569', fontSize: '0.72rem' }}>
                      Tesla Model 3 • Long Range
                    </span>
                  </div>
                  <span className="badge badge-success">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5A0', display: 'inline-block' }} />
                    Active Simulation
                  </span>
                </div>

                {/* Battery Display */}
                <div style={{
                  background: 'rgba(8,13,24,0.65)', borderRadius: 14,
                  padding: '18px 20px', marginBottom: 16,
                  border: '1px solid rgba(37,50,71,0.5)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Battery style={{ width: 16, height: 16, color: '#00E5A0' }} />
                      <span style={{ color: '#94A3B8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                        Current Battery
                      </span>
                    </div>
                    <span style={{ color: '#00E5A0', fontWeight: 800, fontSize: '1.5rem', fontFamily: 'Outfit, sans-serif' }}>
                      72%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <motion.div
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: '72%' }}
                      transition={{ duration: 1.4, delay: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Metrics 3-Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Est. Range', value: '215 km', color: '#00E5A0' },
                    { label: 'Destination', value: '180 km', color: '#38BDF8' },
                    { label: 'Surplus',    value: '+35 km', color: '#00E5A0' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{
                      background: 'rgba(8,13,24,0.65)', borderRadius: 12,
                      padding: '13px 8px', textAlign: 'center',
                      border: '1px solid rgba(37,50,71,0.4)',
                    }}>
                      <p style={{ color, fontWeight: 800, fontSize: '1.05rem', fontFamily: 'Outfit, sans-serif', lineHeight: 1.1 }}>
                        {value}
                      </p>
                      <p style={{ color: '#475569', fontSize: '0.7rem', marginTop: 4, fontWeight: 500 }}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Status Box */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(0,229,160,0.06)',
                  border: '1px solid rgba(0,229,160,0.18)',
                  borderRadius: 14, padding: '12px 16px',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(0,229,160,0.14)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Shield style={{ width: 17, height: 17, color: '#00E5A0' }} />
                  </div>
                  <div>
                    <p style={{ color: '#00E5A0', fontWeight: 700, fontSize: '0.875rem' }}>
                      Journey Appears Feasible
                    </p>
                    <p style={{ color: '#64748b', fontSize: '0.74rem', marginTop: 1 }}>
                      35 km buffer exceeds your 10% safety reserve
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FEATURES SECTION (Centered Container, Responsive Grid)
      ══════════════════════════════════════════════════ */}
      <section id="features" style={{ padding: '80px 0', borderTop: '1px solid rgba(37,50,71,0.3)' }}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: 56 }}
          >
            <span className="section-label">Features</span>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
              color: '#F8FAFC', marginBottom: 14,
            }}>
              Everything You Need for Smarter EV Travel
            </h2>
            <p style={{ color: '#94A3B8', maxWidth: 540, margin: '0 auto', lineHeight: 1.7, fontSize: '0.95rem' }}>
              Smart EV combines vehicle profiles, precise range calculations, and a companion interface
              to give you complete confidence on the road.
            </p>
          </motion.div>

          <div className="features-grid">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass-card"
                style={{
                  padding: '28px 24px',
                  display: 'flex', flexDirection: 'column',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(0,229,160,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20, flexShrink: 0,
                }}>
                  <Icon style={{ width: 22, height: 22, color }} />
                </div>
                <h3 style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                  fontSize: '1.1rem', color: '#F8FAFC', marginBottom: 10,
                }}>
                  {title}
                </h3>
                <p style={{ color: '#94A3B8', fontSize: '0.875rem', lineHeight: 1.65 }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          HOW IT WORKS (Centered Container, Responsive 4-Step Grid)
      ══════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding: '80px 0', borderTop: '1px solid rgba(37,50,71,0.3)', background: 'rgba(15,23,38,0.3)' }}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: 56 }}
          >
            <span className="section-label">Workflow</span>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif', fontWeight: 800,
              fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
              color: '#F8FAFC', marginBottom: 14,
            }}>
              From Planning to Journey — in Minutes
            </h2>
            <p style={{ color: '#94A3B8', maxWidth: 500, margin: '0 auto', lineHeight: 1.7, fontSize: '0.95rem' }}>
              Four straightforward steps to eliminate range anxiety before every trip.
            </p>
          </motion.div>

          <div className="steps-grid">
            {steps.map(({ n, icon: Icon, title, desc }, i) => (
              <motion.div
                key={n}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass-card"
                style={{
                  padding: '28px 22px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Step number watermark */}
                <div style={{
                  position: 'absolute', top: 14, right: 14,
                  fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                  fontSize: '3.2rem', color: 'rgba(0,229,160,0.06)',
                  lineHeight: 1, userSelect: 'none',
                }}>
                  {n}
                </div>

                {/* Step Badge */}
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: '#00E5A0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <Icon style={{ width: 19, height: 19, color: '#080D18' }} />
                </div>

                <h3 style={{
                  fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                  fontSize: '1.05rem', color: '#F8FAFC', marginBottom: 8,
                }}>
                  {title}
                </h3>
                <p style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.65 }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CALL TO ACTION (Centered Container, Banner Card)
      ══════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(0,229,160,0.18)',
              borderRadius: 24,
              padding: 'clamp(40px, 6vw, 64px) 24px',
              textAlign: 'center',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 0 60px rgba(0,229,160,0.06)',
            }}
          >
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: '80%', height: '50%',
              background: 'radial-gradient(ellipse, rgba(0,229,160,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
              <h2 style={{
                fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                fontSize: 'clamp(1.8rem, 3.8vw, 2.4rem)',
                color: '#F8FAFC', marginBottom: 14,
              }}>
                Ready to Drive Smarter?
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '1rem', marginBottom: 32, lineHeight: 1.7 }}>
                Join EV drivers using Smart EV to assess range, prevent unexpected stops,
                and plan confident journeys.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Get Started Free <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>
                <Link to="/login" className="btn btn-secondary btn-lg">
                  Sign In
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FOOTER (Centered Container, Edge Aligned)
      ══════════════════════════════════════════════════ */}
      <footer style={{
        borderTop: '1px solid var(--border-default)',
        padding: '36px 0',
      }}>
        <div className="container">
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'space-between',
            gap: 20,
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(135deg, #00E5A0, #00b87f)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Battery style={{ width: 16, height: 16, color: '#080D18' }} strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#F8FAFC', fontSize: '1rem' }}>
                Smart EV
              </span>
            </div>

            {/* Disclaimer */}
            <p style={{ color: '#475569', fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.6, maxWidth: 460 }}>
              © 2024 Smart EV – Intelligent Charging &amp; Range Planner.
              Range estimates are approximate and rely on driver-provided telemetry.
            </p>

            {/* Links */}
            <div style={{ display: 'flex', gap: 24 }}>
              {[{ label: 'Get Started', to: '/register' }, { label: 'Sign In', to: '/login' }].map(({ label, to }) => (
                <Link
                  key={label}
                  to={to}
                  style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
