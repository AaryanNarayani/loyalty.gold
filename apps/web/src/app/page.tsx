"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import "./landing.css";

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    class Particle {
      x: number; y: number; size: number;
      speedY: number; speedX: number; opacity: number;
      life: number; maxLife: number; currentOpacity: number;
      constructor() {
        this.x = 0; this.y = 0; this.size = 0;
        this.speedY = 0; this.speedX = 0; this.opacity = 0;
        this.life = 0; this.maxLife = 0; this.currentOpacity = 0;
        this.reset();
      }
      reset() {
        if (!canvas) return;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.3;
        this.speedY = -(Math.random() * 0.4 + 0.1);
        this.speedX = (Math.random() - 0.5) * 0.15;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.life = 0;
        this.maxLife = Math.random() * 200 + 100;
        this.currentOpacity = 0;
      }
      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.life++;
        if (this.life > this.maxLife || this.y < 0) this.reset();
        const t = this.life / this.maxLife;
        this.currentOpacity = this.opacity * (t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1);
      }
      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,168,92,${this.currentOpacity})`;
        ctx.fill();
      }
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 60; i++) {
      const p = new Particle();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }

    let animId: number;
    function animate() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-canvas" />;
}

/* -------------------------------------------------------
   FAQ Item
------------------------------------------------------- */
function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`lp-faq-item${open ? " open" : ""}`}>
      <button className="lp-faq-question" onClick={() => setOpen(o => !o)}>
        <span className="lp-faq-question-text">{q}</span>
        <span className="lp-faq-icon">+</span>
      </button>
      <div className="lp-faq-answer">
        <div className="lp-faq-answer-inner">{a}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Main Page
------------------------------------------------------- */
export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);
  const glow1Ref = useRef<HTMLDivElement>(null);
  const glow2Ref = useRef<HTMLDivElement>(null);

  // Scroll → shrink nav
  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (navRef.current) {
            navRef.current.classList.toggle("scrolled", window.scrollY > 40);
          }
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mouse parallax for ambient glows
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    if (glow1Ref.current) glow1Ref.current.style.transform = `translate(${x * 40}px, ${y * 40}px)`;
    if (glow2Ref.current) glow2Ref.current.style.transform = `translate(${-x * 40}px, ${-y * 40}px)`;
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  function handleCTA() {
    if (status === "authenticated") {
      router.push("/onboarding");
    } else {
      signIn("google", { callbackUrl: "/onboarding" });
    }
  }

  const faqs = [
    {
      q: "What exactly is tokenized gold?",
      a: "Tokenized gold is a digital representation of physical gold on a blockchain. Each loyalty.gold token (LGT) corresponds to a specific weight of physical gold held in a secured, audited vault. You can redeem, transfer, or hold it just like any digital asset — but it's always backed by something real.",
      open: true,
    },
    {
      q: "How does a merchant fund the rewards pool?",
      a: "After installing the loyalty.gold Shopify plugin, merchants configure a reward percentage (e.g. 1% of each order). Funds are drawn from the merchant's pre-funded pool and automatically converted to gold tokens at the time of purchase settlement.",
    },
    {
      q: "Does a customer need a crypto wallet?",
      a: "No. Customers can start earning gold without a wallet — loyalty.gold creates a custodial account on their behalf. When they're ready to withdraw to self-custody, they can connect any Solana-compatible wallet in seconds.",
    },
    {
      q: "Who holds the physical gold?",
      a: "Physical gold is held by SwissGold Safe Ltd., an independent, regulated custodian. Reserves are audited daily via the Pyth oracle network and quarterly by a third-party auditor. All audit reports are public and verifiable on-chain.",
    },
    {
      q: "Is loyalty.gold compliant with financial regulations?",
      a: "Yes. loyalty.gold operates within applicable regulatory frameworks. We work with licensed custodians and regulated payment infrastructure providers. Our legal documentation and compliance certifications are available for institutional partners on request.",
    },
    {
      q: "How quickly can I integrate as a Shopify merchant?",
      a: "Integration takes under 10 minutes. Install the loyalty.gold app from the Shopify App Store, connect your payment method, configure your reward percentage, and you're live. No code changes required.",
    },
  ];

  return (
    <div className="lp-root">
      {/* Noise + Glows */}
      <div className="lp-noise" />
      <div ref={glow1Ref} className="lp-ambient lp-glow-1" />
      <div ref={glow2Ref} className="lp-ambient lp-glow-2" />

      {/* ── NAV ── */}
      <nav ref={navRef} className="lp-nav">
        <a className="lp-logo" href="#">
          <div className="lp-logo-icon" />
          loyalty.gold
        </a>
        <div className="lp-nav-links">
          <a href="#product">Product</a>
          <a href="#transparency">Transparency</a>
          <a href="#ecosystem">Ecosystem</a>
          <a href="#faq">FAQ</a>
        </div>
        <button className="lp-btn-nav" onClick={handleCTA}>
          {status === "loading" ? "..." : status === "authenticated" ? "Enter App" : "Start Rewarding"}
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-bg-lines" />
        <div className="lp-hero-orb" />
        <ParticleCanvas />

        <div className="lp-container lp-hero-content">
          <div className="lp-badge">
            <div className="lp-badge-dot" />
            Now Live on Solana Mainnet
          </div>

          <h1 className="lp-hero-title">
            <span>Points Were Fake.</span>
            <span className="gold-line">Gold Is Real.</span>
          </h1>

          <p className="lp-hero-desc">
            A universal infrastructure layer enabling Shopify merchants to reward customer loyalty
            with tokenized, on-chain gold — not arbitrary points.
          </p>

          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={handleCTA}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Integrate with Shopify
            </button>
            <a href="#transparency" className="lp-btn-ghost">View Transparency</a>
          </div>

          <div className="lp-hero-stats">
            <div className="lp-stat-item">
              <span className="lp-stat-value">$45M</span>
              <span className="lp-stat-label">TVL</span>
            </div>
            <div className="lp-stat-item">
              <span className="lp-stat-value">412</span>
              <span className="lp-stat-label">Active Merchants</span>
            </div>
            <div className="lp-stat-item">
              <span className="lp-stat-value">99.9%</span>
              <span className="lp-stat-label">Gold-Backed</span>
            </div>
            <div className="lp-stat-item">
              <span className="lp-stat-value">$12.4M</span>
              <span className="lp-stat-label">Gold Issued</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ── */}
      <section id="product" className="lp-section lp-container">
        <div className="lp-section-header">
          <span className="lp-eyebrow">The Problem</span>
          <h2 className="lp-section-title">
            Loyalty Points Are{" "}
            <span className="lp-serif-italic" style={{ color: "var(--lp-text-secondary)" }}>
              Broken
            </span>
          </h2>
          <p className="lp-section-subtitle">
            Trillions of dollars in loyalty points sit dormant — expiring, locked, and worthless.
            The system is broken by design.
          </p>
        </div>
        <div className="lp-problem-grid">
          {[
            { num: "I.", title: "Points Expire", body: "Traditional points are liabilities on a balance sheet, engineered to lapse. Customers lose earned rewards before they can spend them." },
            { num: "II.", title: "Points Are Locked", body: "Siloed inside proprietary systems. Customers cannot move, trade, or collateralize their rewards anywhere else." },
            { num: "III.", title: "Points Have No Value", body: "Subject to arbitrary devaluation. A point is worth what a brand decides — today. Gold has held purchasing power for 5,000 years." },
          ].map(c => (
            <div key={c.num} className="lp-glass-card">
              <div className="lp-card-icon">{c.num}</div>
              <h3 className="lp-card-title">{c.title}</h3>
              <p className="lp-card-text">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <span className="lp-eyebrow">How It Works</span>
            <h2 className="lp-section-title">
              Turn Rewards Into{" "}
              <span className="lp-serif-italic lp-text-gold">Real Assets</span>
            </h2>
            <p className="lp-section-subtitle">
              A seamless flow from merchant treasury to customer wallet — powered by on-chain infrastructure.
            </p>
          </div>
          <div className="lp-flow-grid">
            {[
              { n: "Step 01", t: "Customer Purchases", d: "Customer completes a purchase via your Shopify store." },
              { n: "Step 02", t: "Merchant Funds Pool", d: "A % of the order value is allocated to the merchant's gold rewards pool." },
              { n: "Step 03", t: "Gold Is Minted", d: "The protocol mints tokenized gold directly to the customer's wallet." },
              { n: "Step 04", t: "Customer Owns Gold", d: "Withdraw, transfer, or self-custody anytime. No lock-ins." },
            ].map(s => (
              <div key={s.n} className="lp-flow-step">
                <span className="lp-step-number">{s.n}</span>
                <h4>{s.t}</h4>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRANSPARENCY ── */}
      <section id="transparency" className="lp-section lp-container" style={{ paddingTop: "80px" }}>
        <div className="lp-section-header">
          <span className="lp-eyebrow">Verified On-Chain</span>
          <h2 className="lp-section-title">
            Protocol <span className="lp-serif-italic">Transparency</span>
          </h2>
          <p className="lp-section-subtitle">
            Every token is backed 1:1 by physical gold. Real-time verification, immutable on-chain records.
          </p>
        </div>
        <div className="lp-transparency-grid">
          {[
            { v: "99.9%", l: "Gold Backing Ratio" },
            { v: "412", l: "Active Merchants" },
            { v: "$12.4M", l: "Customer Gold Issued" },
            { v: "$45M", l: "Total Value Locked" },
          ].map(s => (
            <div key={s.l} className="lp-tstat-card">
              <span className="lp-tstat-value">{s.v}</span>
              <div className="lp-tstat-label">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="lp-protocol-details">
          <div>
            <h3 className="lp-proof-title">Proof of Reserves</h3>
            <p className="lp-proof-text">
              Every token issued by loyalty.gold is backed 1:1 by physical gold bars stored in audited Swiss vaults.
              Smart contracts enforce solvency at the protocol level — issuance is impossible without verified physical backing.
            </p>
            <div className="lp-proof-actions">
              <a href="#" className="lp-btn-primary" style={{ fontSize: "0.75rem", padding: "12px 28px" }}>
                View Audit Reports
              </a>
              <a href="#" className="lp-btn-ghost">Smart Contract ↗</a>
            </div>
          </div>
          <ul className="lp-detail-list">
            <li><span>Custodian</span><strong>SwissGold Safe Ltd.</strong></li>
            <li><span>Blockchain</span><strong>Solana Mainnet</strong></li>
            <li><span>Oracle</span><strong>Pyth Network</strong></li>
            <li><span>Audit Cadence</span><strong>Daily Oracle · Quarterly Physical</strong></li>
            <li><span>Token Standard</span><strong>SPL / Token-2022</strong></li>
          </ul>
        </div>
      </section>

      {/* ── MERCHANT SECTION ── */}
      <section className="lp-section lp-container" style={{ paddingTop: 0 }}>
        <div className="lp-section-header">
          <span className="lp-eyebrow">For Merchants</span>
          <h2 className="lp-section-title">
            Built for Growth.<br />
            <span className="lp-serif-italic">Backed by Gold.</span>
          </h2>
          <p className="lp-section-subtitle">
            Give your customers something real. Real rewards that build real loyalty.
          </p>
        </div>
        <div className="lp-merchant-grid">
          {/* Mock Dashboard */}
          <div className="lp-dashboard">
            <div className="lp-dash-header">
              <div className="lp-dot" style={{ background: "#ff5f57" }} />
              <div className="lp-dot" style={{ background: "#ffbd2e" }} />
              <div className="lp-dot" style={{ background: "#28c840" }} />
              <span className="lp-dash-title">loyalty.gold — Merchant Dashboard</span>
            </div>
            <div className="lp-dash-body">
              <div className="lp-dash-stat-row">
                {[
                  { l: "Gold Issued This Month", v: "14.2g" },
                  { l: "Active Customers", v: "1,847" },
                  { l: "Retention Rate", v: "+34%" },
                  { l: "Pool Balance", v: "$8.4k" },
                ].map(s => (
                  <div key={s.l} className="lp-dash-stat">
                    <div className="lp-dash-stat-label">{s.l}</div>
                    <div className="lp-dash-stat-value">{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="lp-dash-chart">
                <div className="lp-dash-bar-label">Weekly Gold Distribution</div>
                {[78, 62, 91, 55, 83].map((w, i) => (
                  <div key={i} className="lp-dash-bar-track">
                    <div className="lp-dash-bar-fill" style={{ width: `${w}%`, opacity: i === 0 ? 1 : 0.5 + i * 0.12 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Benefits */}
          <ul className="lp-benefits-list">
            {[
              { icon: "↑", title: "Increase Customer Retention", text: "Customers who earn real assets return 3× more often. Gold is a reason to come back." },
              { icon: "◈", title: "Create Real Value Rewards", text: "Replace hollow points with on-chain gold. Every purchase earns something that appreciates." },
              { icon: "✦", title: "Differentiate From Competitors", text: "No other loyalty program offers tokenized gold. Be the first premium brand in your category." },
              { icon: "⬡", title: "Web3-Native From Day One", text: "Built on Solana. Plug into the growing ecosystem of DeFi, wallets, and on-chain identity." },
            ].map(b => (
              <li key={b.title} className="lp-benefit-item">
                <div className="lp-benefit-icon">{b.icon}</div>
                <div>
                  <div className="lp-benefit-title">{b.title}</div>
                  <div className="lp-benefit-text">{b.text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── ECOSYSTEM ── */}
      <section id="ecosystem" className="lp-section lp-container" style={{ paddingTop: 0 }}>
        <div className="lp-eco-divider">
          <p className="lp-eco-eyebrow">Powered By Best-In-Class Infrastructure</p>
          <div className="lp-ecosystem-wrap">
            <div className="lp-ecosystem-logos">
              {[
                { name: "Shopify", sub: "Commerce Layer" },
                { name: "SOLANA", sub: "Settlement Chain" },
                { name: "BRINKS", sub: "Gold Custodian" },
                { name: "Circle", sub: "Payments" },
              ].map(l => (
                <div key={l.name} className="lp-logo-item">
                  {l.name}
                  <span className="lp-logo-sub">{l.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="lp-section lp-container" style={{ paddingBottom: "120px" }}>
        <div className="lp-section-header" style={{ marginBottom: 0 }}>
          <span className="lp-eyebrow">Questions</span>
          <h2 className="lp-section-title">Frequently Asked</h2>
        </div>
        <div className="lp-faq-list">
          {faqs.map(f => (
            <FaqItem key={f.q} q={f.q} a={f.a} defaultOpen={f.open} />
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-container lp-final-cta">
        <span className="lp-eyebrow" style={{ display: "block", marginBottom: "32px" }}>Get Started</span>
        <h2 className="lp-gold-gradient-text">
          Loyalty Should Be Wealth.<br />
          <span className="lp-serif-italic">Not Points.</span>
        </h2>
        <p className="lp-cta-subtext">
          Join 400+ Shopify merchants already rewarding customers with real gold. Setup takes 10 minutes.
        </p>
        <div className="lp-cta-actions">
          <button className="lp-btn-primary" onClick={handleCTA} style={{ padding: "18px 48px", fontSize: "0.82rem" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {status === "authenticated" ? "Enter Application" : "Start Rewarding Customers"}
          </button>
          <a href="#" className="lp-btn-ghost" style={{ padding: "18px 36px" }}>Schedule a Demo</a>
        </div>
        <p className="lp-cta-trust">No credit card required &nbsp;·&nbsp; Free 30-day trial &nbsp;·&nbsp; Cancel anytime</p>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer lp-container">
        <div className="lp-footer-grid">
          <div>
            <a className="lp-footer-brand-logo" href="#">
              <div className="lp-logo-icon" />
              loyalty.gold
            </a>
            <p className="lp-footer-tagline">
              The universal infrastructure layer for on-chain gold rewards. Turning customer loyalty into real, lasting wealth.
            </p>
            <div className="lp-footer-social">
              <a href="#">𝕏</a>
              <a href="#">in</a>
              <a href="#">⌘</a>
            </div>
          </div>
          <div>
            <div className="lp-footer-col-title">Product</div>
            <div className="lp-footer-col-links">
              <a href="#">How It Works</a>
              <a href="#">Merchant Dashboard</a>
              <a href="#">Shopify Plugin</a>
              <a href="#">Pricing</a>
              <a href="#">Changelog</a>
            </div>
          </div>
          <div>
            <div className="lp-footer-col-title">Protocol</div>
            <div className="lp-footer-col-links">
              <a href="#">Transparency</a>
              <a href="#">Audit Reports</a>
              <a href="#">Smart Contract</a>
              <a href="#">Token Standard</a>
              <a href="#">Ecosystem</a>
            </div>
          </div>
          <div>
            <div className="lp-footer-col-title">Company</div>
            <div className="lp-footer-col-links">
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Docs</a>
              <a href="#">Support</a>
              <a href="#">Careers</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2024 Loyalty Gold Protocol, Inc. All rights reserved.</span>
          <div className="lp-footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Settings</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
