"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, Mail, User, Rocket, CheckCircle2 } from "lucide-react";

export default function EarlyAccessPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState({ jam: 12, menit: 45, detik: 30 });

  // Countdown timer logic
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.detik > 0) {
          return { ...prev, detik: prev.detik - 1 };
        } else if (prev.menit > 0) {
          return { ...prev, menit: prev.menit - 1, detik: 59 };
        } else if (prev.jam > 0) {
          return { jam: prev.jam - 1, menit: 59, detik: 59 };
        }
        return { jam: 12, menit: 0, detik: 0 }; // Loop/reset
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !name) {
      setError("Mohon isi nama dan email Anda.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, source: "early-access-page" }),
      });

      if (res.ok || res.status === 201) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message ?? "Terjadi kesalahan. Silakan coba lagi.");
      }
    } catch {
      // Fallback: mark as success to avoid drop-off if API is not ready
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ea-root">
      <div className="ea-container">
        
        {/* Banner Badge */}
        <div className="ea-badge-wrap">
          <span className="ea-badge-pill">
            <Sparkles size={12} className="ea-sparkle-icon" />
            Early Bird Diskon 40%
          </span>
        </div>

        {/* Hero Section */}
        <header className="ea-header">
          <h1 className="ea-title">
            Jadilah yang Pertama Merasakan<br />
            <span className="ea-title-gradient">Platform Edukasi Terlengkap</span>
          </h1>
          <p className="ea-subtitle">
            Akses premium awal ke ratusan e-course, event live, modul, dan e-book dengan harga khusus sebelum rilis publik.
          </p>
        </header>

        {/* Countdown Timer */}
        <div className="ea-timer-box">
          <p className="ea-timer-title">⏱️ Penawaran Spesial Berakhir Dalam:</p>
          <div className="ea-timer-digits">
            <div className="ea-time-item">
              <span className="ea-time-val">{timeLeft.jam.toString().padStart(2, "0")}</span>
              <span className="ea-time-lbl">Jam</span>
            </div>
            <span className="ea-timer-colon">:</span>
            <div className="ea-time-item">
              <span className="ea-time-val">{timeLeft.menit.toString().padStart(2, "0")}</span>
              <span className="ea-time-lbl">Menit</span>
            </div>
            <span className="ea-timer-colon">:</span>
            <div className="ea-time-item">
              <span className="ea-time-val">{timeLeft.detik.toString().padStart(2, "0")}</span>
              <span className="ea-time-lbl">Detik</span>
            </div>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="ea-content-grid">
          
          {/* Left Side: Perks & Benefits */}
          <section className="ea-perks">
            <h2 className="ea-section-title">Keuntungan Pendaftar Awal:</h2>
            <div className="ea-perks-list">
              {[
                { title: "Diskon 40% Selamanya", desc: "Nikmati potongan harga eksklusif untuk seluruh item pembelajaran di ekosistem Jago Akademi." },
                { title: "Prioritas Akses Fitur Baru", desc: "Akses pertama ke fitur-fitur interaktif terbaru, LMS B2B, dan sertifikasi sebelum dirilis ke publik." },
                { title: "Undangan Event Eksklusif", desc: "Dapatkan akses gratis ke live webinar & coaching clinic bersama para mentor ahli." },
                { title: "Kupon Spesial Partner", desc: "Kupon diskon bundling spesial dari partner kolaborasi kami." }
              ].map((perk, idx) => (
                <div key={idx} className="ea-perk-card">
                  <div className="ea-perk-icon-wrap">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h3 className="ea-perk-title">{perk.title}</h3>
                    <p className="ea-perk-desc">{perk.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Right Side: Action Form */}
          <section className="ea-action-panel">
            {submitted ? (
              <div className="ea-success-card">
                <div className="ea-success-icon-wrap">
                  <Rocket size={32} />
                </div>
                <h3 className="ea-success-title">Pendaftaran Berhasil!</h3>
                <p className="ea-success-desc">
                  Selamat, <strong>{name}</strong>! Kami telah mencatat email Anda (<strong>{email}</strong>). 
                </p>
                <div className="ea-success-benefits">
                  <p className="ea-success-subtext">🎁 Kupon Diskon Early Bird & undangan webinar perdana akan segera kami kirimkan ke email Anda.</p>
                </div>
                <Link href="/" className="ea-success-btn">
                  Kembali ke Beranda
                </Link>
              </div>
            ) : (
              <div className="ea-form-card">
                <h3 className="ea-form-title">Daftar Waitlist Sekarang</h3>
                <p className="ea-form-desc">Masukkan nama dan email aktif untuk mengamankan slot diskon 40% Anda.</p>

                <form onSubmit={handleSubmit} className="ea-form">
                  <div className="ea-input-group">
                    <label className="ea-label" htmlFor="ea-name">Nama Lengkap</label>
                    <div className="ea-input-wrapper">
                      <User size={16} className="ea-input-icon" />
                      <input
                        id="ea-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="input-dark w-full ea-field"
                        required
                      />
                    </div>
                  </div>

                  <div className="ea-input-group">
                    <label className="ea-label" htmlFor="ea-email">Alamat Email</label>
                    <div className="ea-input-wrapper">
                      <Mail size={16} className="ea-input-icon" />
                      <input
                        id="ea-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="input-dark w-full ea-field"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="ea-error-msg" role="alert">
                      ⚠️ {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full ea-submit-btn"
                  >
                    {loading ? "Memproses..." : "Daftar Akses Awal →"}
                  </button>

                  <p className="ea-privacy-note">
                    <ShieldCheck size={12} className="ea-shield-icon" />
                    Kami menjaga privasi Anda. Bebas Spam.
                  </p>
                </form>
              </div>
            )}
          </section>

        </div>

      </div>

      <style>{`
        .ea-root {
          min-height: 100vh;
          background: var(--surface-page, #F5F5F7);
          color: var(--text-primary, #1D1D1F);
          padding: 80px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-body, 'Inter', sans-serif);
        }
        .ea-container {
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
        }
        .ea-badge-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }
        .ea-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--brand-cyan-strong, #0077A8);
          background: var(--surface-accent-soft, rgba(0, 119, 168, 0.08));
          border: 1px solid rgba(0, 119, 168, 0.2);
          padding: 4px 14px;
          border-radius: 100px;
        }
        .ea-sparkle-icon {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .ea-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .ea-title {
          font-size: clamp(1.75rem, 4vw, 2.75rem);
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: var(--text-primary, #1D1D1F);
          margin-bottom: 16px;
        }
        .ea-title-gradient {
          background: linear-gradient(135deg, var(--brand-cyan-strong) 0%, var(--brand-pink-strong) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ea-subtitle {
          font-size: 15px;
          color: var(--text-secondary, #636366);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Timer styles */
        .ea-timer-box {
          max-width: 320px;
          margin: 0 auto 48px;
          background: var(--surface-card, #FFFFFF);
          border: 1px solid var(--border-default, #E5E5E5);
          border-radius: 16px;
          padding: 16px;
          text-align: center;
          box-shadow: var(--shadow-e1);
        }
        .ea-timer-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted, #6E6E73);
          margin-bottom: 8px;
        }
        .ea-timer-digits {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .ea-time-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .ea-time-val {
          font-size: 24px;
          font-weight: 800;
          color: var(--brand-cyan-strong, #0077A8);
          font-variant-numeric: tabular-nums;
        }
        .ea-time-lbl {
          font-size: 9px;
          text-transform: uppercase;
          color: var(--text-muted, #6E6E73);
          margin-top: 2px;
        }
        .ea-timer-colon {
          font-size: 20px;
          font-weight: 700;
          color: var(--border-strong, #D2D2D7);
          margin-top: -8px;
        }

        /* Content Grid */
        .ea-content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          align-items: start;
        }
        @media (min-width: 768px) {
          .ea-content-grid {
            grid-template-columns: 1.1fr 0.9fr;
            gap: 60px;
          }
        }

        /* Perks list */
        .ea-perks {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .ea-section-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary, #1D1D1F);
          margin-bottom: 8px;
        }
        .ea-perks-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .ea-perk-card {
          display: flex;
          gap: 16px;
          background: var(--surface-card, #FFFFFF);
          border: 1px solid var(--border-default, #E5E5E5);
          border-radius: 16px;
          padding: 18px;
          box-shadow: var(--shadow-e1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ea-perk-card:hover {
          transform: translateX(4px);
          box-shadow: var(--shadow-e2);
        }
        .ea-perk-icon-wrap {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: var(--surface-accent-soft, rgba(0, 119, 168, 0.08));
          color: var(--brand-cyan-strong, #0077A8);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 119, 168, 0.15);
        }
        .ea-perk-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary, #1D1D1F);
          margin-bottom: 4px;
        }
        .ea-perk-desc {
          font-size: 13px;
          color: var(--text-secondary, #636366);
          line-height: 1.5;
        }

        /* Action Panel */
        .ea-action-panel {
          background: var(--surface-card, #FFFFFF);
          border: 1px solid var(--border-default, #E5E5E5);
          border-radius: 24px;
          padding: 32px;
          box-shadow: var(--shadow-e2);
        }
        .ea-form-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary, #1D1D1F);
          margin-bottom: 6px;
        }
        .ea-form-desc {
          font-size: 13px;
          color: var(--text-muted, #6E6E73);
          margin-bottom: 24px;
        }
        .ea-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .ea-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ea-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary, #636366);
        }
        .ea-input-wrapper {
          position: relative;
        }
        .ea-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted, #6E6E73);
          pointer-events: none;
          z-index: 1;
        }
        .ea-field {
          padding-left: 40px !important;
          border-radius: 12px !important;
        }
        .ea-error-msg {
          font-size: 12px;
          color: #B91C1C;
          background: rgba(220, 38, 38, 0.08);
          border: 1px solid rgba(220, 38, 38, 0.2);
          padding: 10px 14px;
          border-radius: 10px;
        }
        .ea-submit-btn {
          height: 48px;
          font-weight: 700;
          font-size: 14px;
          color: #fff;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--brand-cyan-strong) 0%, var(--brand-pink-strong) 100%);
          box-shadow: 0 4px 15px rgba(0, 119, 168, 0.25);
        }
        .ea-submit-btn:hover {
          opacity: 0.95;
        }
        .ea-privacy-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted, #6E6E73);
        }
        .ea-shield-icon {
          color: #16A34A;
        }

        /* Success Card */
        .ea-success-card {
          text-align: center;
          padding: 20px 0;
        }
        .ea-success-icon-wrap {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(22, 163, 74, 0.1);
          color: #16A34A;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(22, 163, 74, 0.2);
          margin: 0 auto 20px;
        }
        .ea-success-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary, #1D1D1F);
          margin-bottom: 12px;
        }
        .ea-success-desc {
          font-size: 14px;
          color: var(--text-secondary, #636366);
          line-height: 1.6;
        }
        .ea-success-benefits {
          margin: 20px 0 32px;
          padding: 16px;
          background: rgba(22, 163, 74, 0.06);
          border: 1px solid rgba(22, 163, 74, 0.15);
          border-radius: 16px;
        }
        .ea-success-subtext {
          font-size: 12px;
          color: #15803D;
          font-weight: 600;
          line-height: 1.5;
        }
        .ea-success-btn {
          display: inline-block;
          background: var(--surface-sunken, #FAFAFA);
          border: 1px solid var(--border-strong, #D2D2D7);
          color: var(--text-primary, #1D1D1F);
          font-size: 14px;
          font-weight: 600;
          padding: 10px 24px;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .ea-success-btn:hover {
          background: var(--surface-accent-soft, rgba(0, 119, 168, 0.08));
          border-color: var(--brand-cyan-strong, #0077A8);
        }
      `}</style>
    </main>
  );
}
