import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/layout/AuthContext";
import { Link } from "wouter";
import { Lock, ShieldAlert, ArrowRight, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MaintenanceGuardProps {
  pageId: string; // e.g. "workshops", "jobs", "consultations", "certificates", "downloads"
  pageNameAr: string;
  children: React.ReactNode;
}

export function MaintenanceGuard({ pageId, pageNameAr, children }: MaintenanceGuardProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/system/maintenance")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (Array.isArray(data.lockedPages) && data.lockedPages.includes(pageId)) {
            setIsLocked(true);
          } else {
            setIsLocked(false);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pageId]);

  if (loading) {
    return <>{children}</>;
  }

  if (isLocked) {
    // Super Admin receives full access with prominent maintenance banner
    if (isSuperAdmin) {
      return (
        <div className="space-y-4">
          <div className="bg-amber-500/15 border-2 border-amber-500/40 text-amber-950 dark:text-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
              <div className="text-xs font-bold">
                <span>تنبيه الأدمن الرئيسي: قسم <strong className="underline">{pageNameAr}</strong> مغلق حالياً للصيانة أمام الجمهور.</span>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px] font-extrabold shrink-0">
              وضع الصيانة نشط
            </Badge>
          </div>
          {children}
        </div>
      );
    }

    // Normal users and guests see full screen maintenance overlay
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-card/80 backdrop-blur-xl border border-border/80 p-8 rounded-3xl shadow-xl space-y-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
            <Wrench className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold px-3 py-1 rounded-full">
              <Lock className="w-3.5 h-3.5 mr-1 inline" /> مغلق للصيانة والمراجعة
            </Badge>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight pt-2">
              قسم {pageNameAr} مغلق حالياً
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              نعمل حالياً على إجراء تحديثات وأعمال صيانة دورية لقسم <strong className="text-foreground">{pageNameAr}</strong> لضمان أقصى درجات الأمان والجودة. سنعود قريباً جداً!
            </p>
          </div>

          <div className="pt-2 w-full">
            <Link href="/">
              <Button className="w-full rounded-xl font-bold h-11 text-xs gap-2">
                <span>العودة للصفحة الرئيسية</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
