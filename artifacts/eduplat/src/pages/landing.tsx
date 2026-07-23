import { Link } from "wouter";
import { useGetPlatformStats } from "@workspace/api-client-react";
import { 
  GraduationCap, Award, Briefcase, ArrowRight, ChevronRight, BookOpen, 
  Trophy, MessageSquare, Shield, Cpu, Globe, Code, Sparkles, 
  Smartphone, Sun, Moon, CheckCircle, Target, Users, Landmark, 
  Phone, Instagram, Facebook, Send, Globe2, ShieldCheck, X, Search,
  BadgeCheck, XCircle, Loader2, Calendar, Hash, Star
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/layout/ThemeContext";
import { useLanguage } from "@/components/layout/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { SkillsLogo } from "@/components/shared/SkillsLogo";

// ─── Floating Certificate Verifier Widget ───────────────────────────────────
function FloatingCertVerifier({ isAr }: { isAr: boolean }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (data.verified && data.certificate) {
        setResult(data.certificate);
      } else {
        setError(data.error || (isAr ? "لم يتم التعرف على الكود" : "Code not recognized"));
      }
    } catch {
      setError(isAr ? "خطأ في الاتصال بالخادم" : "Server connection error");
    } finally {
      setLoading(false);
    }
  };

  const certTypeLabel = (type: string) => {
    const map: Record<string, { ar: string; en: string; color: string }> = {
      workshop: { ar: "ورشة عمل", en: "Workshop", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
      track: { ar: "مسار تعليمي", en: "Learning Track", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
      course: { ar: "دورة تدريبية", en: "Training Course", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    };
    return map[type] || { ar: "شهادة", en: "Certificate", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
  };

  const levelLabel = (level: number) => {
    const map: Record<number, { ar: string; en: string }> = {
      1: { ar: "خبير متقدم", en: "Master" },
      2: { ar: "خبير متخصص", en: "Expert Specialist" },
      3: { ar: "أخصائي محترف", en: "Professional" },
      4: { ar: "حضور ومشاركة", en: "Participation" },
    };
    return map[level] || { ar: "عام", en: "General" };
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-[340px] rounded-2xl border border-border/60 backdrop-blur-2xl overflow-hidden shadow-2xl"
            style={{
              background: "rgba(8,12,25,0.95)",
              boxShadow: "0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05), 0 0 50px rgba(59,130,246,0.08)"
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">{isAr ? "التحقق من الشهادة" : "Verify Certificate"}</p>
                  <p className="text-[9px] text-white/40 font-medium">{isAr ? "أدخل كود التحقق" : "Enter verification code"}</p>
                </div>
              </div>
              <button
                onClick={() => { setOpen(false); setResult(null); setError(null); setCode(""); }}
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white/50" />
              </button>
            </div>

            {/* Input Section */}
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleVerify()}
                  placeholder={isAr ? "MH-VFY-XXXXXX-YYYY" : "MH-VFY-XXXXXX-YYYY"}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:outline-none focus:border-primary/60 focus:bg-white/8 transition-all font-mono tracking-wider"
                  dir="ltr"
                />
                <button
                  onClick={handleVerify}
                  disabled={loading || !code.trim()}
                  className="px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-xs font-bold text-white shadow-lg shadow-primary/20"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  {isAr ? "تحقق" : "Verify"}
                </button>
              </div>

              {/* Error State */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/25"
                >
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-300 leading-relaxed font-medium">{error}</p>
                </motion.div>
              )}

              {/* Success Result */}
              {result && (() => {
                const typeInfo = certTypeLabel(result.type);
                const levelInfo = levelLabel(result.level);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Verified badge */}
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <BadgeCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-300">{isAr ? "شهادة موثقة وصحيحة" : "Verified & Authentic"}</p>
                        <p className="text-[8px] text-emerald-400/70">{isAr ? "التوقيع الرقمي مطابق" : "Cryptographic signature matched"}</p>
                      </div>
                    </div>

                    {/* Certificate card */}
                    <div
                      className="rounded-xl border border-white/8 overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      {/* Top accent stripe */}
                      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981)" }} />

                      <div className="p-3 space-y-2.5">
                        {/* Owner name */}
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-black text-primary">
                            {(result.userName || "?").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-white truncate">{result.userName || "—"}</p>
                            <p className="text-[9px] text-white/40 font-medium">{isAr ? "صاحب الشهادة" : "Certificate Holder"}</p>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-white/5" />

                        {/* Type badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeInfo.color}`}>
                            {isAr ? typeInfo.ar : typeInfo.en}
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/30 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5" />
                            {isAr ? levelInfo.ar : levelInfo.en}
                          </span>
                        </div>

                        {/* Title */}
                        {(result.workshopTitle || result.trackTitle) && (
                          <p className="text-[10px] font-semibold text-white/80 leading-snug">
                            {result.workshopTitle || result.trackTitle}
                          </p>
                        )}

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                          <div className="flex items-center gap-1.5 text-white/50">
                            <Hash className="w-2.5 h-2.5 shrink-0" />
                            <span className="font-mono truncate">{result.certificateNumber}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-white/50">
                            <Calendar className="w-2.5 h-2.5 shrink-0" />
                            <span>{result.issuedAt ? new Date(result.issuedAt).toLocaleDateString(isAr ? "ar-IQ" : "en-GB") : "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-white/50">
                            <Award className="w-2.5 h-2.5 shrink-0" />
                            <span>{isAr ? `الدرجة: ${result.score ?? 100}%` : `Score: ${result.score ?? 100}%`}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle className="w-2.5 h-2.5 shrink-0" />
                            <span className="font-bold">{isAr ? "صادرة" : "Issued"}</span>
                          </div>
                        </div>

                        {/* Platform stamp */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                          <SkillsLogo className="w-4 h-4" showBg={false} />
                          <p className="text-[8px] text-white/25 font-bold tracking-wide uppercase">Mharat Skills Platform</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2.5 pl-3 pr-4 h-12 rounded-2xl text-white text-sm font-bold shadow-2xl transition-all"
        style={{
          background: open
            ? "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)"
            : "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)",
          boxShadow: "0 8px 32px rgba(59,130,246,0.4), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
          border: "1px solid rgba(59,130,246,0.4)"
        }}
      >
        <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          {open ? <X className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
        </div>
        <span className="text-xs font-black">{isAr ? "تحقق من شهادة" : "Verify Certificate"}</span>
        {!open && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
        )}
      </motion.button>
    </div>
  );
}

// 4-Pillars Interactive Hub (Training, Certificates, Careers, Volunteering)
export function HeroInteractiveHub({ isAr }: { isAr: boolean }) {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [orbitAngle, setOrbitAngle] = useState(0);
  const { data: stats } = useGetPlatformStats();

  const getRealNumber = (id: string) => {
    switch (id) {
      case "training":
        const st = stats?.studentsTrained ?? 12840;
        return st >= 1000 ? (st / 1000).toFixed(1).replace(/\.0$/, "") + "K" : st.toString();
      case "certs":
        const ci = stats?.certificatesIssued ?? 5230;
        return ci >= 1000 ? (ci / 1000).toFixed(1).replace(/\.0$/, "") + "K" : ci.toString();
      case "careers":
        const aj = stats?.activeJobs ?? 340;
        return aj >= 1000 ? (aj / 1000).toFixed(1).replace(/\.0$/, "") + "K" : aj.toString();
      case "community":
        const jf = stats?.jobsFilled ?? 1890;
        return jf >= 1000 ? (jf / 1000).toFixed(1).replace(/\.0$/, "") + "K" : jf.toString();
      default:
        return "";
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setOrbitAngle(prev => (prev + 0.4) % 360);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  const nodes = [
    {
      id: "training",
      titleAr: "التعليم والتطوير",
      titleEn: "Education & Skills",
      descAr: "منظومة ورش عمل تطبيقية ودورات عملية مكثفة (CCNA, TOT، الأمن السيبراني) تحاكي السوق الفعلي.",
      descEn: "Practical, market-aligned workshops and tracks including CCNA, TOT, and Cybersecurity.",
      icon: BookOpen,
      posClass: "top-4 left-4",
      angle: 225,
      color: "from-blue-600 to-sky-500",
      glowColor: "rgba(59, 130, 246, 0.6)",
      bgGlow: "rgba(59, 130, 246, 0.2)",
      borderColor: "border-blue-500/50",
      iconColor: "text-blue-400",
      pulseColor: "#3b82f6",
      badgeAr: "CCNA, Cyber, TOT",
      badgeEn: "CCNA, Cyber, TOT",
      metricAr: "92% نسبة الإكمال",
      metricEn: "92% Completion Rate"
    },
    {
      id: "certs",
      titleAr: "الشهادات الرقمية",
      titleEn: "Verified Certificates",
      descAr: "شهادات تخرج واجتياز فورية مشفرة برمز تحقق وتوقيع إلكتروني مانع للتزوير لحماية الكفاءات.",
      descEn: "Instant cryptographically secured certificates with unique verification codes.",
      icon: Award,
      posClass: "top-4 right-4",
      angle: 315,
      color: "from-yellow-500 to-amber-400",
      glowColor: "rgba(234, 179, 8, 0.6)",
      bgGlow: "rgba(234, 179, 8, 0.2)",
      borderColor: "border-yellow-500/50",
      iconColor: "text-yellow-400",
      pulseColor: "#eab308",
      badgeAr: "توقيع موثق",
      badgeEn: "Secure Seal",
      metricAr: "تم إصدار 5,230 شهادة",
      metricEn: "5,230 Certificates Issued"
    },
    {
      id: "careers",
      titleAr: "فرص التوظيف",
      titleEn: "Career Pathways",
      descAr: "ربط متكامل ومباشر مع شركات القطاع الخاص والعام والشركاء لتسهيل وصول الكفاءات لسوق العمل.",
      descEn: "Direct employment placement and recruitment pathways with premier business partners.",
      icon: Briefcase,
      posClass: "bottom-4 right-4",
      angle: 45,
      color: "from-emerald-500 to-teal-400",
      glowColor: "rgba(16, 185, 129, 0.6)",
      bgGlow: "rgba(16, 185, 129, 0.2)",
      borderColor: "border-emerald-500/50",
      iconColor: "text-emerald-400",
      pulseColor: "#10b981",
      badgeAr: "340 وظيفة نشطة",
      badgeEn: "340 Active Jobs",
      metricAr: "توظيف مباشر للشباب",
      metricEn: "Direct Career Hiring"
    },
    {
      id: "community",
      titleAr: "العطاء والتطوع",
      titleEn: "Youth & Volunteering",
      descAr: "مبادرة شبابية وطنية ذاتية تهدف لربط وتمكين الخريجين عبر برامج العمل المجتمعي والتعاون المشترك.",
      descEn: "Youth-led voluntary initiative empowering graduates through community impact programs.",
      icon: Users,
      posClass: "bottom-4 left-4",
      angle: 135,
      color: "from-amber-600 to-orange-500",
      glowColor: "rgba(245, 158, 11, 0.6)",
      bgGlow: "rgba(245, 158, 11, 0.2)",
      borderColor: "border-orange-500/50",
      iconColor: "text-orange-400",
      pulseColor: "#f59e0b",
      badgeAr: "جهود شبابية ذاتية",
      badgeEn: "100% Youth-Led",
      metricAr: "تأثير مجتمعي مستدام",
      metricEn: "Sustainable Social Impact"
    }
  ];

  // Compute orbit particle positions
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const orbitR1 = 130;
  const orbitR2 = 160;

  return (
    <div className="relative w-full max-w-[500px] h-[500px] mx-auto flex items-center justify-center select-none">
      
      {/* Advanced 3D SVG Scene */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
        <defs>
          {/* Radial glow for center */}
          <radialGradient id="centralGlow3d" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#0f172a" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          {/* Deep background ring gradient */}
          <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(59,130,246,0.08)" />
          </radialGradient>
          {/* Blue glow filter */}
          <filter id="blueGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Strong glow for center hub */}
          <filter id="hubGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="partnershipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* Deep background ambient disc */}
        <circle cx="200" cy="200" r="175" fill="url(#ringGlow)" />
        <circle cx="200" cy="200" r="140" fill="url(#centralGlow3d)" />

        {/* Outer orbit ring */}
        <ellipse cx="200" cy="200" rx="165" ry="55"
          stroke="rgba(59,130,246,0.12)" strokeWidth="1" fill="none"
          transform="rotate(-20 200 200)"
        />
        {/* Mid orbit ring */}
        <ellipse cx="200" cy="200" rx="130" ry="44"
          stroke="rgba(99,102,241,0.15)" strokeWidth="1" fill="none"
          transform="rotate(-20 200 200)"
        />
        {/* Inner orbit ring */}
        <ellipse cx="200" cy="200" rx="88" ry="29"
          stroke="rgba(139,92,246,0.18)" strokeWidth="1" fill="none"
          transform="rotate(-20 200 200)"
        />

        {/* Dashed connector lines from center to each node */}
        <line x1="200" y1="200" x2="88" y2="88" stroke="rgba(59,130,246,0.3)" strokeWidth="1.5" strokeDasharray="5,5" />
        <line x1="200" y1="200" x2="312" y2="88" stroke="rgba(234,179,8,0.3)" strokeWidth="1.5" strokeDasharray="5,5" />
        <line x1="200" y1="200" x2="312" y2="312" stroke="rgba(16,185,129,0.3)" strokeWidth="1.5" strokeDasharray="5,5" />
        <line x1="200" y1="200" x2="88" y2="312" stroke="rgba(245,158,11,0.3)" strokeWidth="1.5" strokeDasharray="5,5" />

        {/* Partnership Infinity Path & pulsing yellow dot */}
        <path
          d="M 200 200 C 150 160, 150 240, 200 200 C 250 160, 250 240, 200 200 Z"
          fill="none"
          stroke="url(#partnershipGradient)"
          strokeWidth="1.8"
          opacity="0.8"
          filter="url(#blueGlow)"
        />
        <circle r="3" fill="#facc15" opacity="0.95" filter="url(#blueGlow)">
          <animateMotion dur="5.5s" repeatCount="indefinite" path="M 200 200 C 150 160, 150 240, 200 200 C 250 160, 250 240, 200 200 Z" />
        </circle>

        {/* Central hub glow ring */}
        <circle cx="200" cy="200" r="55" stroke="rgba(59,130,246,0.35)" strokeWidth="1.5" fill="none" filter="url(#blueGlow)" />
        <circle cx="200" cy="200" r="65" stroke="rgba(59,130,246,0.12)" strokeWidth="1" fill="none" />

        {/* Orbiting particle on inner ring */}
        <circle
          cx={200 + 88 * Math.cos(rad(orbitAngle - 20))}
          cy={200 + 29 * Math.sin(rad(orbitAngle - 20))}
          r="3.5" fill="#818cf8" opacity="0.85" filter="url(#blueGlow)"
        />
        {/* Orbiting particle on mid ring (opposite direction) */}
        <circle
          cx={200 + 130 * Math.cos(rad(-orbitAngle * 0.7 - 20))}
          cy={200 + 44 * Math.sin(rad(-orbitAngle * 0.7 - 20))}
          r="3" fill="#38bdf8" opacity="0.75" filter="url(#blueGlow)"
        />
        {/* Orbiting particle on outer ring */}
        <circle
          cx={200 + 165 * Math.cos(rad(orbitAngle * 0.5 + 60 - 20))}
          cy={200 + 55 * Math.sin(rad(orbitAngle * 0.5 + 60 - 20))}
          r="2.5" fill="#a78bfa" opacity="0.65" filter="url(#blueGlow)"
        />

        {/* Laser pulse particles from center to each node */}
        <circle r="5" fill="#3b82f6" opacity="0.9" filter="url(#blueGlow)">
          <animateMotion dur="3.2s" repeatCount="indefinite" path="M 200 200 L 88 88" />
        </circle>
        <circle r="5" fill="#eab308" opacity="0.9" filter="url(#blueGlow)">
          <animateMotion dur="4.0s" repeatCount="indefinite" path="M 200 200 L 312 88" />
        </circle>
        <circle r="5" fill="#10b981" opacity="0.9" filter="url(#blueGlow)">
          <animateMotion dur="3.6s" repeatCount="indefinite" path="M 200 200 L 312 312" />
        </circle>
        <circle r="5" fill="#f59e0b" opacity="0.9" filter="url(#blueGlow)">
          <animateMotion dur="4.4s" repeatCount="indefinite" path="M 200 200 L 88 312" />
        </circle>

        {/* Reverse particles (from nodes to center) */}
        <circle r="3" fill="#93c5fd" opacity="0.5">
          <animateMotion dur="3.2s" repeatCount="indefinite" path="M 88 88 L 200 200" />
        </circle>
        <circle r="3" fill="#fde68a" opacity="0.5">
          <animateMotion dur="4.0s" repeatCount="indefinite" path="M 312 88 L 200 200" />
        </circle>
        <circle r="3" fill="#6ee7b7" opacity="0.5">
          <animateMotion dur="3.6s" repeatCount="indefinite" path="M 312 312 L 200 200" />
        </circle>
        <circle r="3" fill="#fcd34d" opacity="0.5">
          <animateMotion dur="4.4s" repeatCount="indefinite" path="M 88 312 L 200 200" />
        </circle>

        {/* Node glow dots at corners */}
        <circle cx="88" cy="88" r="8" fill="rgba(59,130,246,0.15)" filter="url(#blueGlow)" />
        <circle cx="312" cy="88" r="8" fill="rgba(234,179,8,0.15)" filter="url(#blueGlow)" />
        <circle cx="312" cy="312" r="8" fill="rgba(16,185,129,0.15)" filter="url(#blueGlow)" />
        <circle cx="88" cy="312" r="8" fill="rgba(245,158,11,0.15)" filter="url(#blueGlow)" />

        {/* Floating data particles scattered */}
        {[...Array(8)].map((_, i) => (
          <circle
            key={i}
            r={1 + (i % 2) * 0.8}
            fill="rgba(148,163,184,0.4)"
            cx={80 + i * 35}
            cy={200 + Math.sin(i * 0.8) * 60}
          >
            <animate
              attributeName="opacity"
              values="0.2;0.7;0.2"
              dur={`${2 + i * 0.3}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      {/* Central Hub */}
      <div className="relative z-20 flex items-center justify-center">
        {/* Pulsing outer ring */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.1, 0.4] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          className="absolute inset-0 -m-5 rounded-full border border-primary/40 pointer-events-none"
        />
        {/* Second pulsing ring */}
        <motion.div
          animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.05, 0.3] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
          className="absolute inset-0 -m-8 rounded-full border border-blue-400/25 pointer-events-none"
        />

        <div className="flex items-center gap-1.5 relative select-none">
          {/* Skills Core */}
          <motion.div 
            animate={{ y: [0, -3, 0], rotate: [0, 2, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center relative border border-primary/40 shadow-lg shadow-primary/25 bg-[#0f172a]/90 backdrop-blur-md"
          >
            {/* Inner glass ring */}
            <div className="absolute inset-1.5 rounded-full border border-white/5" />
            <SkillsLogo className="w-8 h-8 sm:w-10 sm:h-10 relative z-10" showBg={false} />
          </motion.div>

          {/* Plus connector / link icon */}
          <div className="w-5 h-5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center z-20 -mx-3 shadow-md">
            <span className="text-[10px] font-extrabold text-primary animate-pulse">+</span>
          </div>

          {/* Code Master Core */}
          <motion.div 
            animate={{ y: [0, 3, 0], rotate: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center relative border border-blue-500/30 shadow-lg shadow-blue-500/25 bg-[#0f172a] overflow-hidden"
          >
            {/* Inner glass ring */}
            <div className="absolute inset-1.5 rounded-full border border-white/5" />
            <img src="/codemaster_logo.jpg" alt="Code Master Logo" className="w-full h-full object-cover scale-105" />
          </motion.div>
          
          {/* Glowing partnership label badge */}
          <div className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-gradient-to-r from-primary to-blue-600 border border-primary/30 px-3 py-1 rounded-full shadow-lg shadow-primary/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[9px] font-extrabold text-white tracking-wide whitespace-nowrap">
              {isAr ? "شريك التدريب: كود ماستر" : "Training Partner: Code Master"}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Satellite Nodes */}
      {(() => {
        const getNodePosition = (id: string) => {
          switch (id) {
            case "training": return { left: "22%", top: "22%" };
            case "certs": return { left: "78%", top: "22%" };
            case "careers": return { left: "78%", top: "78%" };
            case "community": return { left: "22%", top: "78%" };
            default: return {};
          }
        };

        const activeNodeData = nodes.find(n => n.id === activeNode);

        return (
          <>
            {nodes.map(node => {
              const IconComponent = node.icon;
              const isActive = activeNode === node.id;
              const positionStyle = getNodePosition(node.id);
              
              return (
                <div 
                  key={node.id}
                  style={positionStyle}
                  className="absolute ml-[-32px] mt-[-32px] z-30 group"
                  onMouseEnter={() => setActiveNode(node.id)}
                  onMouseLeave={() => setActiveNode(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveNode(activeNode === node.id ? null : node.id);
                  }}
                >
                  <div className="relative">
                    {/* Ambient glow behind node */}
                    <div 
                      className="absolute -inset-3 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ backgroundColor: node.bgGlow }}
                    />
                    
                    {/* Node Card - Professional 3D Style */}
                    <motion.div 
                      whileHover={{ scale: 1.12, y: -3 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`w-16 h-16 rounded-2xl border-2 ${node.borderColor} backdrop-blur-xl flex flex-col items-center justify-center cursor-pointer relative z-10 overflow-hidden p-1`}
                      style={{
                        background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.08) 0%, rgba(15,23,42,0.85) 100%)`,
                        boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${node.bgGlow}, inset 0 1px 0 rgba(255,255,255,0.08)`
                      }}
                    >
                      {/* Glass highlight */}
                      <div className="absolute inset-0 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%)" }} />
                      {/* Icon */}
                      <IconComponent className={`w-5 h-5 ${node.iconColor} group-hover:scale-110 transition-transform duration-300 relative z-10 drop-shadow-lg mb-0.5 opacity-80`} />
                      {/* Real stat number inside the square card */}
                      <span className="text-[10px] font-black text-white relative z-10 leading-none tracking-tight">
                        {getRealNumber(node.id)}
                      </span>
                      {/* Bottom shimmer */}
                      <div className="absolute bottom-0 left-0 right-0 h-px opacity-40" style={{ background: `linear-gradient(90deg, transparent, ${node.glowColor}, transparent)` }} />
                    </motion.div>

                    {/* Active pulse indicator */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
                      <div className="w-1.5 h-1.5 rounded-full opacity-60" style={{ backgroundColor: node.pulseColor }}>
                        <div className="w-full h-full rounded-full animate-ping opacity-75" style={{ backgroundColor: node.pulseColor }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Tooltip card for mobile/desktop */}
            <AnimatePresence>
              {activeNodeData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`z-50 text-start space-y-2.5 p-4 rounded-2xl border border-border/60 backdrop-blur-2xl shadow-2xl w-[285px] md:w-[265px]
                    max-md:fixed max-md:bottom-20 max-md:left-4 max-md:right-4 max-md:w-[calc(100%-32px)] max-md:z-[100] max-md:pointer-events-auto
                    md:absolute
                    ${activeNodeData.id === "training" ? "md:left-[calc(22%+40px)] md:top-[calc(22%-32px)]" : ""}
                    ${activeNodeData.id === "certs" ? "md:right-[calc(22%+40px)] md:top-[calc(22%-32px)]" : ""}
                    ${activeNodeData.id === "careers" ? "md:right-[calc(22%+40px)] md:bottom-[calc(22%-32px)]" : ""}
                    ${activeNodeData.id === "community" ? "md:left-[calc(22%+40px)] md:bottom-[calc(22%-32px)]" : ""}
                  `}
                  style={{
                    background: "rgba(10,15,30,0.95)",
                    boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 30px ${activeNodeData.bgGlow}`
                  }}
                >
                  {/* Top border gradient accent */}
                  <div className="absolute top-0 left-4 right-4 h-px rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${activeNodeData.glowColor}, transparent)` }} />
                  
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/8">
                    <span className="text-xs font-black text-white">{isAr ? activeNodeData.titleAr : activeNodeData.titleEn}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[8px] font-bold px-1.5 py-0 bg-white/8 text-white/70 border-white/10">
                        {isAr ? activeNodeData.badgeAr : activeNodeData.badgeEn}
                      </Badge>
                      {/* Close button for mobile */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveNode(null); }}
                        className="w-5 h-5 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors md:hidden pointer-events-auto"
                      >
                        <X className="w-3 h-3 text-white/60" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/60 leading-relaxed font-medium">
                    {isAr ? activeNodeData.descAr : activeNodeData.descEn}
                  </p>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold" style={{ color: activeNodeData.pulseColor }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: activeNodeData.pulseColor }} />
                    {isAr ? activeNodeData.metricAr : activeNodeData.metricEn}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );
      })()}

    </div>
  );
}

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span>{count.toLocaleString()}</span>;
}

function HeroMockup({ isAr }: { isAr: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative w-full max-w-md mx-auto aspect-video md:aspect-square lg:h-[430px] rounded-2xl border border-border/50 bg-card/65 backdrop-blur-xl p-5 shadow-2xl overflow-hidden group glow-box-primary text-start"
    >
      <div className="absolute -top-20 -left-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">skills-console-v4.0.sh</span>
      </div>

      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-background/50 border border-border/50 flex items-center justify-between hover:border-primary/45 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-primary/10">
              AH
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{isAr ? "علي حسين" : "Ali Hussein"}</p>
              <p className="text-[9px] text-muted-foreground">{isAr ? "مسار الأمن السيبراني" : "Cybersecurity Track"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-amber-500 flex items-center gap-0.5">🔥 {isAr ? "7 أيام" : "7 Days"}</p>
            <p className="text-[9px] text-muted-foreground">Streak</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background/50 border border-border/50 space-y-2 hover:border-primary/45 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-primary dark:text-blue-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              {isAr ? "مقيم المقابلات الذكي (AI Coach)" : "AI Interview Coach"}
            </span>
            <span className="text-[8px] text-muted-foreground">{isAr ? "الآن" : "Just Now"}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isAr 
              ? '"إجابتك ممتازة بخصوص بروتوكول TCP/IP، ولكن يفضل شرح الفارق بينه وبين UDP لتحصل على درجة أعلى في التقييم."'
              : '"Your answer about TCP/IP is great, but it is recommended to explain the difference from UDP for a higher score."'}
          </p>
          <div className="flex gap-1.5">
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              {isAr ? "التقييم: 90%" : "Score: 90%"}
            </span>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-secondary/15 text-amber-700 dark:text-amber-400 border border-secondary/25 font-bold">
              {isAr ? "ممتاز" : "Excellent"}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-background/50 border border-border/50 flex items-center justify-between hover:border-primary/45 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-amber-500/10 flex items-center justify-center text-[13px]">
              💼
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{isAr ? "مهندس شبكات مبتدئ" : "Junior Network Engineer"}</p>
              <p className="text-[9px] text-muted-foreground">{isAr ? "شركة أسياسيل - بغداد" : "Asiacell - Baghdad"}</p>
            </div>
          </div>
          <span className="text-[9px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
            {isAr ? "مؤهل للتقديم" : "Eligible"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const { data: stats } = useGetPlatformStats();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const isAr = language === "ar";

  const visionItems = [
    {
      title: isAr ? "الرؤية" : "Vision",
      desc: isAr 
        ? "نطمح إلى أن يكون المشروع هو البوابة الحقيقية في دعم الخريجين والباحثين عن العمل من الجامعات العراقية عبر منهجية متكاملة تلبي متطلبات سوق العمل بشكل كامل."
        : "We aim to be the definitive gateway supporting graduates and job seekers from Iraqi universities through an integrated methodology that fully satisfies labor market demands."
    },
    {
      title: isAr ? "الهدف" : "Goal",
      desc: isAr
        ? "أن يشكل المشروع إضافة نوعية متكاملة في مجال أهم المهارات المطلوبة والتي يحتاجها سوق العمل لتمكين الخريجين والباحثين عن العمل من الحصول على الوظائف الأكثر طلباً."
        : "To deliver a qualitative and integrated addition in the most demanded skills required by the labor market to empower graduates and job seekers to land high-demand jobs."
    },
    {
      title: isAr ? "الأولوية" : "Priority",
      desc: isAr
        ? "نقل المهارات إلى خبرات عبر منظومة الورش والدورات التدريبية وفق أحدث الممارسات القائمة على التطبيق العملي."
        : "Transforming skills into practical expertise through a structured ecosystem of workshops and training courses based on real-world application."
    },
    {
      title: isAr ? "الرسالة" : "Mission",
      desc: isAr
        ? "بناء مسار عملي متكامل يربط مخرجات التعليم الجامعي باحتياجات سوق العمل الفعلية وتمكين الطاقات الشبابية وتزويدها بالأدوات الحديثة للمنافسة والريادة."
        : "Building an integrated practical track that connects university education outcomes with actual market needs, empowering youth with modern tools to compete and lead."
    }
  ];

  const targetAudience = [
    isAr ? "الشباب والخريجين الباحثين عن العمل من الجامعات العراقية." : "Youth and graduates seeking jobs from Iraqi universities.",
    isAr ? "تطوير الملاكات الوظيفية في مؤسسات القطاع الخاص والعام، ومواكبة التطورات الحديثة." : "Developing workforce skills in public and private institutions to match modern changes.",
    isAr ? "الموظفين الجدد في مؤسسات القطاع الخاص كونهم بحاجة إلى مهارات كافية تساعدهم على مواكبة التطورات." : "New employees in private sector companies who need essential skills to stay updated.",
    isAr ? "الراغبين بتطوير مهاراتهم في المجالات المتاحة عبر ربطهم بأحدث أدوات التكنولوجيا الحديثة." : "Individuals wishing to advance their skills by linking them with the latest technology tools.",
    isAr ? "المؤسسات الراغبة بدعم الطاقات الشابة والخريجين عبر منظومة الورش والدورات." : "Institutions wanting to support young talents and graduates through workshop ecosystems.",
    isAr ? "حاضنات الأعمال القائمة لاكتشاف المواهب والابتكارات لدى الشباب وفق أحدث الممارسات العملية." : "Existing business incubators discovering youth talents and innovations via modern practical methods.",
    isAr ? "رواد الأعمال من خلال دعم مشاريعهم وتمكينهم اقتصادياً في هذا المجال." : "Entrepreneurs, by supporting their projects and economically empowering them in their fields."
  ];

  const objectives = [
    isAr ? "تطوير المهارات المعرفية والوظيفية للمتدربين وتزويدهم بالمهارات المطلوبة في سوق العمل." : "Developing cognitive and professional skills for trainees and providing them with in-demand skills.",
    isAr ? "ترصين المهارات الذاتية بقيمة حقيقية مضافة تحقق التنافسية عند التقديم للوظائف المختلفة." : "Solidifying self-skills with real value added that achieves competitiveness when applying for jobs.",
    isAr ? "الريادة المجتمعية عبر دعم الطاقات الشابة من الخريجين والباحثين عن العمل." : "Social leadership by supporting young energy among graduates and job seekers.",
    isAr ? "تحقيق تنمية بشرية مستدامة من خلال العمل على تحقيق التكامل بين مختلف القطاعات." : "Achieving sustainable human development by working towards integration between various sectors.",
    isAr ? "المساهمة في إعداد مشاريع متكاملة تساهم في تمكين المرأة وجعلها قادرة على ممارسة دورها." : "Contributing to integrated projects that empower women and enable them to practice their role in society.",
    isAr ? "عمل برامج مبتكرة لتحقيق التنمية المستدامة عبر منظومة التدريب والتطوير المستمر." : "Creating innovative programs for sustainable development through continuous training and development.",
    isAr ? "إعداد دراسات عملية وفعلية تحفز على الأنشطة التطوعية الخاصة في مجال البيئة." : "Preparing practical and actual studies that stimulate volunteer activities specifically in environmental fields.",
    isAr ? "التركيز على دور المهارات الضرورية في إعداد السيرة الذاتية لمواكبة احتياجات سوق العمل." : "Focusing on the role of essential skills in preparing resumes to match labor market requirements.",
    isAr ? "تطبيق الممارسات الحديثة في التدريب المهني." : "Applying modern practices in professional and vocational training.",
    isAr ? "إيجاد فرص عمل حقيقية للشباب والخريجين الباحثين من خلال مخرجات التدريب في المشروع." : "Creating real job opportunities for youth and graduates through the training outcomes of the project."
  ];

  const sponsorBenefits = [
    isAr ? "الانضمام إلى مجتمع من الشباب لكي يكونوا على معرفة بمؤسستك وخدماتها." : "Joining a community of youth to keep them informed about your institution and services.",
    isAr ? "الحصول على قنوات تواصل شبابية فعالة ترغب بتطوير مهاراتها بشكل مستمر." : "Gaining active youth communication channels eager to continuously develop their skills.",
    isAr ? "إتاحة الفرصة لتسويق خدمات المؤسسة الخاصة بك بشكل دوري ومستمر وبطرق سهلة." : "Having the opportunity to market your institution's services periodically, continuously, and easily.",
    isAr ? "توفير حاضنة أعمال حقيقية لدعم المشاريع والأفكار الإبداعية من فئة الشباب." : "Providing a real business incubator to support projects and creative ideas of youth.",
    isAr ? "التعرف على أحدث الأنشطة الخاصة في التدريب عبر منظومة الورش والدورات في المشروع." : "Learning about the latest training activities through the workshops and courses of the project.",
    isAr ? "المساهمة بتطوير مهارات الخريجين والباحثين واستقطاب الموهوبين منهم." : "Contributing to developing skills of graduates and job seekers and recruiting talented individuals.",
    isAr ? "سهولة البحث عن القدرات الإبداعية وأصحاب المشاريع." : "Ease of searching for creative capabilities and project owners.",
    isAr ? "الحصول على فرصة لتغطية الأنشطة التطوعية الخاصة بالمؤسسة عبر التطوع لتلك الأنشطة مستقبلاً." : "Receiving opportunities to cover institutional volunteer activities by joining volunteer efforts in the future."
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] left-[-20%] w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="border-b border-border/50 bg-card/65 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SkillsLogo className="w-9 h-9 shadow-lg shadow-primary/10" />
            <div>
              <span className="font-extrabold text-base tracking-tight leading-tight block text-foreground">
                {isAr ? "مهارات" : "Skills"}
              </span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest block font-bold">Skills</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
            <Link href="/jobs" className="hover:text-foreground transition-colors">{isAr ? "الوظائف" : "Jobs"}</Link>
            <Link href="/workshops" className="hover:text-foreground transition-colors">{isAr ? "الورش" : "Workshops"}</Link>
            <Link href="/learn" className="hover:text-foreground transition-colors">{isAr ? "المسارات" : "Learning Paths"}</Link>
            <Link href="/leaderboard" className="hover:text-foreground transition-colors">{isAr ? "لوحة الصدارة" : "Leaderboard"}</Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(isAr ? "en" : "ar")}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-xs font-bold transition-all"
            >
              {isAr ? "English" : "العربية"}
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              data-testid="button-theme-toggle"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/jobs">
              <Button size="sm" className="rounded-xl px-4 font-semibold shadow-md shadow-primary/15" data-testid="button-get-started">
                {isAr ? "ابدأ رحلتك" : "Get Started"}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with 3D Animated Canvas and Mockup */}
      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 max-w-7xl mx-auto px-6 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: isAr ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 space-y-6 text-center lg:text-start"
          >
            <Badge variant="outline" className="mb-2 bg-primary/5 text-primary border-primary/25 font-bold rounded-full px-4 py-1 gap-1.5 inline-flex items-center">
              <Sparkles className="w-3.5 h-3.5" /> 
              {isAr ? "المنصة الوطنية لتأهيل وتوظيف الشباب - بالتعاون مع شركة كود ماستر" : "The National Platform for Youth Qualification & Employment - In collaboration with Code Master"}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.15] text-foreground">
              {isAr ? <>تدرب. تخرّج.<br />واحصل على وظيفتك.</> : <>Train. Certify.<br />Get Hired.</>}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
              {isAr 
                ? "المنصة التقنية الأكثر شمولاً في العراق لتطوير مهاراتك الفنية والمهنية، والحصول على شهادات موثقة رقمياً، والوصول المباشر لسوق العمل العراقي بالتعاون مع كبريات الشركات."
                : "The most comprehensive platform in Iraq to develop your technical and professional skills, earn verified digital certificates, and gain direct access to the Iraqi job market in collaboration with top employers."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Link href="/learn">
                <Button size="lg" className="rounded-xl gap-2 font-bold px-8 shadow-lg shadow-primary/20" data-testid="button-hero-learn">
                  {isAr ? "ابدأ التعلم الآن" : "Start Learning"} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/jobs">
                <Button size="lg" variant="outline" className="rounded-xl font-bold px-8 bg-card/45 border-border/60 hover:bg-accent/40" data-testid="button-hero-jobs">
                  {isAr ? "استعرض لوحة الوظائف" : "Browse Jobs"}
                </Button>
              </Link>
            </div>
          </motion.div>

          <div className="lg:col-span-5 flex justify-center items-center relative min-h-[450px] w-full">
            <HeroInteractiveHub isAr={isAr} />
          </div>

        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border/50 bg-card/45 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: isAr ? "طالب تم تدريبه" : "Students Trained", labelEn: "Students Trained", value: stats?.studentsTrained ?? 12840, icon: GraduationCap, color: "text-primary bg-primary/10" },
              { label: isAr ? "شهادة صادرة" : "Certificates Issued", labelEn: "Certificates Issued", value: stats?.certificatesIssued ?? 5230, icon: Award, color: "text-emerald-500 bg-emerald-500/10" },
              { label: isAr ? "وظيفة تم ملؤها" : "Jobs Filled", labelEn: "Jobs Filled", value: stats?.jobsFilled ?? 1890, icon: Briefcase, color: "text-blue-500 bg-blue-500/10" },
              { label: isAr ? "شواغر وظيفة نشطة" : "Active Jobs", labelEn: "Active Jobs", value: stats?.activeJobs ?? 340, icon: Sparkles, color: "text-amber-500 bg-amber-500/10" },
            ].map(({ label, labelEn, value, icon: Icon, color }) => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={label} 
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-background/40 border border-border/30 shadow-sm"
              >
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shadow-inner`}>
                  <Icon className="w-5.5 h-5.5" />
                </div>
                <div className="text-3xl font-extrabold text-foreground tracking-tight" data-testid={`stat-${labelEn.toLowerCase().replace(/\s+/g, "-")}`}>
                  <AnimatedCounter target={value} />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Profile Section (نبذة عن المشروع) */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative z-10 text-start">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <div className="p-8 rounded-3xl bg-gradient-to-tr from-primary/10 to-primary/5 border border-primary/20 shadow-2xl relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <SkillsLogo className="w-48 h-48 mx-auto shadow-2xl rounded-3xl relative z-10 transform group-hover:scale-105 transition-transform duration-500" />
              <div className="text-center mt-6">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest block font-mono">S K I L L S</span>
                <span className="text-[10px] text-primary/80 font-bold block mt-1">{isAr ? "مشروع مهارات" : "Skills Project"}</span>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-7 space-y-6">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold rounded-full px-4">
              {isAr ? "نبذة عن المشروع" : "About the Project"}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">
              {isAr ? "مبادرة شبابية ذاتية لتمكين الكوادر العراقية" : "Youth-Led Initiative Empowering Iraqi Workforce"}
            </h2>
            <div className="text-sm text-muted-foreground space-y-4 font-medium leading-relaxed">
              <p>
                {isAr 
                  ? "مشروع مهارات هو مبادرة أنشأتها جهود شبابية ذاتية بهدف تدريب وتمكين وربط مجموعة متنوعة من الشباب والخريجين الباحثين عن العمل في الجامعات العراقية لتفعيل دورهم في بناء مجتمع طلابي واعٍ ومزدهر في العراق."
                  : "Skills Project is a youth-led self-initiative designed to train, empower, and connect a diverse group of young talents and university graduates in Iraq to activate their role in building a conscious student community."}
              </p>
              <p>
                {isAr
                  ? "اعتمد البرنامج على توفير بيئة تدريبية عملية تحاكي متطلبات سوق العمل عبر منظومة الورش والدورات التدريبية المهنية. نحن نتطلع من خلال مشروعنا إلى مواصلة تعاوننا مع الجامعات العراقية ومؤسسات القطاع الخاص والعام في العراق، لتعزيز تأثير الشباب على واقع الاقتصاد العراقي في البلاد."
                  : "The program relies on providing a practical training environment simulating labor market requirements through professional workshops and courses. We look forward to continuing our collaboration with universities, public, and private institutions to maximize the impact of youth on the local economy."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision, Goal, Priority, Message (الرؤية، الهدف، الأولوية، الرسالة) */}
      <section className="bg-card/45 border-y border-border/50 backdrop-blur-md relative z-10 text-start">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visionItems.map(({ title, desc }) => (
              <motion.div 
                whileHover={{ y: -6 }}
                key={title} 
                className="p-6 rounded-2xl border border-border/50 bg-background/50 hover:border-primary/40 transition-all duration-300 shadow-sm relative group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20 group-hover:scale-105 transition-transform">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-extrabold text-base text-foreground mb-3">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-semibold">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience (ماذا يستهدف مشروعنا؟) */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative z-10 text-start">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold rounded-full px-4">
            {isAr ? "الفئات المستهدفة" : "Target Audience"}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
            {isAr ? "ماذا يستهدف مشروعنا؟" : "Who Does Our Project Target?"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-medium">
            {isAr
              ? "نستهدف بناء جسور الكفاءة المهنية لجميع أطراف المنظومة المهنية والتعليمية في العراق."
              : "We aim to build professional capacity bridges across all sectors of the Iraqi workforce."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {targetAudience.map((target, idx) => (
            <motion.div
              whileHover={{ scale: 1.015 }}
              key={idx}
              className="p-5 rounded-2xl border border-border/60 bg-card/40 flex items-start gap-4 hover:border-primary/45 transition-colors shadow-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/15 text-primary font-bold text-xs">
                {idx + 1}
              </div>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed pt-0.5">{target}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Project Methodology (منهجية عمل المشروع) */}
      <section className="bg-card/45 border-y border-border/50 backdrop-blur-md relative z-10 text-start">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="p-8 md:p-12 rounded-3xl border border-primary/15 bg-background/60 shadow-inner flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/25 shrink-0 text-amber-500">
              <Cpu className="w-8 h-8" />
            </div>
            <div className="space-y-4">
              <h3 className="font-extrabold text-xl text-foreground">
                {isAr ? "منهجية عمل المشروع" : "Project Methodology"}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-semibold">
                {isAr
                  ? "نحن نتبنى منهجية عمل متكاملة قادرة على إيجاد مسار عملي يمكن مختلف المؤسسات والقطاعات من تطوير قدرات مواردها البشرية عبر نقل المهارات إلى خبرات تلبي متطلبات سوق العمل تحت إشراف مزيج من الخبراء بين مختلف القطاعات وبالتالي تحقيق الاستفادة الفعلية من مخرجات المشروع."
                  : "We adopt an integrated working methodology capable of establishing a practical path that enables institutions to develop human resource capabilities by transferring skills into expertise under expert supervision, achieving actual benefit from outputs."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Project Objectives (أهداف المشروع) */}
      <section className="max-w-7xl mx-auto px-6 py-24 relative z-10 text-start">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold rounded-full px-4">
            {isAr ? "أهداف المنصة" : "Project Objectives"}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
            {isAr ? "أهداف مشروع مهارات" : "Skills Project Objectives"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-medium">
            {isAr
              ? "الخطوط الإستراتيجية الواضحة التي يرتكز عليها البرنامج لتحسين بيئة العمل والتأهيل."
              : "The strategic pillars on which our training program is built to scale up professional paths."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {objectives.map((obj, idx) => (
            <motion.div
              whileHover={{ x: isAr ? -6 : 6 }}
              key={idx}
              className="p-4 rounded-xl border border-border/50 bg-card/60 flex items-center gap-3.5 hover:border-primary/40 transition-all shadow-sm"
            >
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-xs text-muted-foreground font-semibold leading-normal">{obj}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sponsorship Section (ماذا نقدم للرعاة والداعمين؟) */}
      <section className="bg-card/45 border-y border-border/50 backdrop-blur-md relative z-10 text-start">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold rounded-full px-4">
              {isAr ? "الرعاية والشركاء" : "Sponsorship & Partners"}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              {isAr ? "ماذا نقدم للرعاة والداعمين؟" : "What We Offer to Sponsors & Supporters"}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto font-medium">
              {isAr
                ? "قيمة متبادلة وتكامل فعلي بين قطاعات التدريب وبين العلامات التجارية والممولين."
                : "Mutual value and real integration between training projects and corporate sponsors."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sponsorBenefits.map((benefit, idx) => (
              <motion.div
                whileHover={{ y: -5 }}
                key={idx}
                className="p-5 rounded-2xl border border-border/60 bg-background/50 flex flex-col justify-between hover:border-amber-500/40 transition-colors shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 border border-amber-500/20 text-amber-600">
                  <Landmark className="w-4.5 h-4.5" />
                </div>
                <p className="text-xs text-muted-foreground font-semibold leading-relaxed flex-1">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section (تواصل معنا) */}
      <section className="max-w-5xl mx-auto px-6 py-24 relative z-10 text-start">
        <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-primary via-primary/95 to-slate-900 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-6">
              <Badge variant="outline" className="border-white/20 bg-white/10 text-white font-extrabold rounded-full px-4">
                {isAr ? "قنوات الاتصال" : "Get in Touch"}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {isAr ? "تواصل معنا مباشرة" : "Connect With Us Directly"}
              </h2>
              <p className="text-slate-200 text-xs md:text-sm font-semibold leading-relaxed max-w-md">
                {isAr
                  ? "فريق مهارات متاح دائماً للإجابة على استفساراتكم المتعلقة بالرعاية، التدريب، أو فرص التوظيف."
                  : "Skills team is always available to answer your inquiries regarding sponsorship, training, or employment."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold pt-2">
                <a href="tel:07740777165" className="flex items-center gap-3 text-slate-100 hover:text-amber-400 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Phone className="w-4 h-4" /></div>
                  <span>07740777165</span>
                </a>
                <a href="https://instagram.com/skills.iq" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-100 hover:text-amber-400 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Instagram className="w-4 h-4" /></div>
                  <span>SKILLS.IQ</span>
                </a>
                <a href="https://t.me/skills_iq1" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-100 hover:text-amber-400 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Send className="w-4 h-4" /></div>
                  <span>SKILLS_IQ1</span>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-100 hover:text-amber-400 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Facebook className="w-4 h-4" /></div>
                  <span>SKILLS-مهارات</span>
                </a>
                <a href="http://www.skillsiraq.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-slate-100 hover:text-amber-400 transition-colors sm:col-span-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Globe2 className="w-4 h-4" /></div>
                  <span>www.skillsiraq.com</span>
                </a>
              </div>
            </div>

            {/* QR Code Layout Mockup */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="bg-white p-4.5 rounded-2xl border-4 border-amber-500/20 shadow-2xl flex flex-col items-center">
                <div className="w-36 h-36 bg-slate-100 flex items-center justify-center rounded-xl border border-slate-200 p-2">
                  <svg className="w-full h-full text-slate-800" viewBox="0 0 100 100" fill="currentColor">
                    <rect x="0" y="0" width="25" height="25" />
                    <rect x="5" y="5" width="15" height="15" fill="white" />
                    <rect x="9" y="9" width="7" height="7" />
                    
                    <rect x="75" y="0" width="25" height="25" />
                    <rect x="80" y="5" width="15" height="15" fill="white" />
                    <rect x="84" y="9" width="7" height="7" />
                    
                    <rect x="0" y="75" width="25" height="25" />
                    <rect x="5" y="80" width="15" height="15" fill="white" />
                    <rect x="9" y="84" width="7" height="7" />
                    
                    <rect x="35" y="5" width="5" height="15" />
                    <rect x="45" y="0" width="10" height="5" />
                    <rect x="60" y="10" width="5" height="15" />
                    <rect x="35" y="30" width="15" height="5" />
                    <rect x="30" y="45" width="5" height="20" />
                    <rect x="45" y="55" width="15" height="5" />
                    <rect x="65" y="35" width="5" height="15" />
                    <rect x="75" y="45" width="15" height="5" />
                    <rect x="55" y="75" width="10" height="5" />
                    <rect x="45" y="85" width="5" height="10" />
                    <rect x="85" y="65" width="5" height="10" />
                    <rect x="65" y="80" width="15" height="5" />
                  </svg>
                </div>
                <div className="mt-3 text-center">
                  <span className="text-[10px] font-black text-slate-800 tracking-wider font-mono">@SKILLS_IQ1</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5">{isAr ? "امسح للتواصل بالتلغرام" : "Scan to telegram"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/65 backdrop-blur-md relative z-10 text-start">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <SkillsLogo className="w-8 h-8 rounded-lg" />
            <div>
              <span className="font-extrabold text-sm text-foreground block">
                {isAr ? "مشروع مهارات &copy; 2026" : "Skills Project &copy; 2026"}
              </span>
              <span className="text-[8px] text-muted-foreground block font-bold">Skills Platform</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-6 font-medium">
            <Link href="/jobs" className="hover:text-foreground transition-colors">{isAr ? "Jobs | الوظائف" : "Jobs"}</Link>
            <Link href="/workshops" className="hover:text-foreground transition-colors">{isAr ? "Workshops | الورش" : "Workshops"}</Link>
            <Link href="/learn" className="hover:text-foreground transition-colors">{isAr ? "Learn | المسارات" : "Learning Paths"}</Link>
          </div>
        </div>
      </footer>

      {/* Floating Certificate Verifier */}
      <FloatingCertVerifier isAr={isAr} />
    </div>
  );
}
