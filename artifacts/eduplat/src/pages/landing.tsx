import { Link } from "wouter";
import { useGetPlatformStats } from "@workspace/api-client-react";
import { GraduationCap, Award, Briefcase, ArrowRight, ChevronRight, BookOpen, Trophy, MessageSquare, Shield, Cpu, Globe, Code } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/layout/ThemeContext";
import { Sun, Moon } from "lucide-react";

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

const roadmapItems = [
  { year: "2022", title: "Platform Founded", desc: "Launched with core learning paths and job board", done: true },
  { year: "2023", title: "AI Integration", desc: "Integrated AI-powered mock interviews and resume parsing", done: true },
  { year: "2024", title: "Certification Engine", desc: "Automated PDF certificate generation for workshop graduates", done: true },
  { year: "2025", title: "Live Classrooms", desc: "Expanding into live virtual classroom experiences", done: false },
  { year: "2026", title: "Global Expansion", desc: "Multi-language support and international partnerships", done: false },
];

const features = [
  { icon: Briefcase, title: "Smart Job Board", desc: "Apply to curated positions with built-in screening tests that unlock applications on passing." },
  { icon: BookOpen, title: "Workshops & Certs", desc: "Attend live workshops and earn verified PDF certificates automatically upon passing." },
  { icon: GraduationCap, title: "Learning Paths", desc: "Structured roadmaps for TOT, Cyber Security, Networking, and Full-Stack development." },
  { icon: MessageSquare, title: "AI Mock Interviews", desc: "Practice interviews with an AI coach that gives real-time feedback on your answers." },
  { icon: Trophy, title: "Gamification", desc: "Earn points, maintain streaks, and climb the leaderboard as you learn and apply." },
  { icon: Shield, title: "Role-Based Access", desc: "Student, Instructor, and Admin roles with granular access controls throughout." },
];

const tracks = [
  { slug: "tot", icon: MessageSquare, title: "Training of Trainers", color: "bg-violet-500/10 text-violet-500" },
  { slug: "networking", icon: Globe, title: "CCNA Networking", color: "bg-blue-500/10 text-blue-500" },
  { slug: "cybersecurity", icon: Shield, title: "Cyber Security", color: "bg-red-500/10 text-red-500" },
  { slug: "fullstack", icon: Code, title: "Full-Stack Dev", color: "bg-green-500/10 text-green-500" },
  { slug: "computer-basics", icon: Cpu, title: "Computer Basics", color: "bg-orange-500/10 text-orange-500" },
  { slug: "mobile", icon: GraduationCap, title: "Mobile Development", color: "bg-pink-500/10 text-pink-500" },
];

export default function LandingPage() {
  const { data: stats } = useGetPlatformStats();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">EduPlat</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
            <Link href="/workshops" className="hover:text-foreground transition-colors">Workshops</Link>
            <Link href="/learn" className="hover:text-foreground transition-colors">Learn</Link>
            <Link href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              data-testid="button-theme-toggle"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/jobs">
              <Button size="sm" data-testid="button-get-started">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <Badge variant="secondary" className="mb-4">Career Development Platform</Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Train. Certify.<br />
            <span className="text-primary">Get Hired.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            The complete platform for professionals who want to sharpen their skills, earn verified certificates, and land meaningful careers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/learn">
              <Button size="lg" className="gap-2" data-testid="button-hero-learn">
                Start Learning <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button size="lg" variant="outline" data-testid="button-hero-jobs">
                Browse Jobs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Students Trained", value: stats?.studentsTrained ?? 12840, icon: GraduationCap, color: "text-primary" },
              { label: "Certificates Issued", value: stats?.certificatesIssued ?? 5230, icon: Award, color: "text-green-500" },
              { label: "Jobs Filled", value: stats?.jobsFilled ?? 1890, icon: Briefcase, color: "text-blue-500" },
              { label: "Active Jobs", value: stats?.activeJobs ?? 340, icon: Briefcase, color: "text-orange-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <Icon className={`w-8 h-8 ${color}`} />
                <div className="text-4xl font-bold" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <AnimatedCounter target={value} />
                </div>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to advance</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">A comprehensive ecosystem that takes you from learning to employment with structured paths and real verification.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl border border-border bg-card hover:shadow-md transition-shadow" data-testid={`feature-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Learning Tracks */}
      <section className="bg-card/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Structured Learning Tracks</h2>
            <p className="text-muted-foreground">Comprehensive roadmaps designed by industry experts</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {tracks.map(({ slug, icon: Icon, title, color }) => (
              <Link key={slug} href={`/learn/${slug}`} className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors flex items-center gap-3" data-testid={`track-card-${slug}`}>
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{title}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/learn">
              <Button variant="outline" data-testid="button-view-all-tracks">View All Tracks</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Roadmap Timeline */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Roadmap</h2>
          <p className="text-muted-foreground">Building the future of career development</p>
        </div>
        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border hidden md:block" />
          <div className="space-y-8">
            {roadmapItems.map((item, i) => (
              <div key={item.year} className={`flex flex-col md:flex-row items-start md:items-center gap-4 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                <div className="md:flex-1 md:text-right p-4 rounded-xl bg-card border border-border">
                  {i % 2 !== 0 && <div className="md:hidden" />}
                  {i % 2 === 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-1">{item.year}</p>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </>
                  ) : (
                    <div className="md:hidden">
                      <p className="text-xs text-muted-foreground mb-1">{item.year}</p>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  )}
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${item.done ? "bg-primary text-primary-foreground" : "bg-muted border-2 border-border"}`}>
                  {item.done ? "✓" : ""}
                </div>
                {i % 2 !== 0 && (
                  <div className="hidden md:block md:flex-1 p-4 rounded-xl bg-card border border-border">
                    <p className="text-xs text-muted-foreground mb-1">{item.year}</p>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                )}
                {i % 2 === 0 && <div className="hidden md:block md:flex-1" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to start your journey?</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">Join thousands of professionals building their careers on EduPlat.</p>
          <Link href="/learn">
            <Button size="lg" variant="secondary" className="gap-2" data-testid="button-cta-start">
              Start for Free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span>EduPlat &copy; 2026</span>
          </div>
          <div className="flex gap-6">
            <Link href="/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
            <Link href="/workshops" className="hover:text-foreground transition-colors">Workshops</Link>
            <Link href="/learn" className="hover:text-foreground transition-colors">Learn</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
