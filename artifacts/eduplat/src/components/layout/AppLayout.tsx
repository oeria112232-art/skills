import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { useLanguage } from "./LanguageContext";
import { Menu } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { language } = useLanguage();
  const isAr = language === "ar";

  // Automatically collapse sidebar on page/location change
  useEffect(() => {
    setCollapsed(true);
  }, [location]);

  // Global Live Stream Notification Checker
  useEffect(() => {
    if (!localStorage.getItem("mharat-token")) return;
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const checkActiveNotifications = async () => {
      try {
        const response = await fetch("/api/workshops/active-notifications", {
          headers: { "Authorization": `Bearer ${localStorage.getItem("mharat-token")}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        
        data.forEach((workshop: { id: number; title: string; instructor: string; dailyRoomUrl: string }) => {
          const notificationKey = `shown-notif-${workshop.id}`;
          if (!localStorage.getItem(notificationKey)) {
            // Trigger native device notification
            const notif = new Notification(isAr ? "بدأ البث المباشر للورشة الآن! 🎥" : "Workshop Stream is Live! 🎥", {
              body: isAr 
                ? `بدأ المدرب ${workshop.instructor} بث ورشة "${workshop.title}". انقر هنا للانضمام فوراً.`
                : `Instructor ${workshop.instructor} started "${workshop.title}". Click to join.`,
              tag: `workshop-${workshop.id}`
            });

            notif.onclick = () => {
              window.focus();
              window.location.href = `/workshops/${workshop.id}`;
            };

            // Play notification sound
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = "sine";
              osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note for bright alert
              gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
              osc.onended = () => {
                audioCtx.close().catch(() => {});
              };
              osc.start();
              osc.stop(audioCtx.currentTime + 0.2);
            } catch (soundErr) {
              console.warn("Could not play sound:", soundErr);
            }

            localStorage.setItem(notificationKey, "true");
          }
        });
      } catch (err) {
        console.error("Failed to fetch stream notifications:", err);
      }
    };

    checkActiveNotifications();
    const interval = setInterval(checkActiveNotifications, 10000);
    return () => clearInterval(interval);
  }, [isAr]);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Premium ambient glows */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/4 rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-secondary/3 rounded-full blur-[100px] pointer-events-none z-0" />
      
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      {/* Floating Menu Trigger when Sidebar is collapsed — desktop only */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="hidden lg:flex fixed top-4 start-4 z-50 p-2.5 rounded-xl bg-card/85 backdrop-blur-md border border-sidebar-border/60 shadow-lg hover:bg-accent text-foreground hover:text-primary transition-all duration-300 animate-in fade-in zoom-in-90 active:scale-95 items-center justify-center"
          title={isAr ? "إظهار القائمة الجانبية" : "Show Sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <main className="flex-1 overflow-y-auto z-10 relative">
        {/* Top bar spacer on mobile (h-16 accounts for the mobile header) */}
        <div className="pt-16 lg:pt-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
