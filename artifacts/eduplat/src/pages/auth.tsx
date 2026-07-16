import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/layout/AuthContext";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Shield, User, Mail, Lock, LogIn, UserPlus, Globe, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SkillsLogo } from "@/components/shared/SkillsLogo";

export default function AuthPage() {
  const { user, login } = useAuth();
  const [, setLocation] = useLocation();
  const { language, setLanguage } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        variant: "destructive",
        title: isAr ? "خطأ في المدخلات" : "Validation Error",
        description: isAr ? "يرجى ملء جميع الحقول المطلوبة." : "Please fill out all fields.",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: isAr ? "بيانات الدخول غير صحيحة" : "Invalid credentials" }));
          throw new Error(err.error || "Login failed");
        }

        const data = await res.json();
        login(data.user, data.token);
        
        toast({
          title: isAr ? "تم تسجيل الدخول" : "Logged In Successfully",
          description: isAr ? "أهلاً بك مجدداً في المنصة." : "Welcome back to the platform.",
        });
        setLocation("/");
      } else {
        // Registering a new account
        if (!name.trim()) {
          toast({
            variant: "destructive",
            title: isAr ? "خطأ في المدخلات" : "Validation Error",
            description: isAr ? "يرجى إدخال الاسم الكامل." : "Please enter your full name.",
          });
          setIsLoading(false);
          return;
        }

        const minLength = 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
          toast({
            variant: "destructive",
            title: isAr ? "كلمة المرور ضعيفة" : "Weak Password",
            description: isAr 
              ? "يجب أن تكون كلمة المرور مكونة من 8 أحرف على الأقل، وتحتوي على حرف كبير وحرف صغير ورقم ورمز خاص." 
              : "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
          });
          setIsLoading(false);
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password, role: "student" }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Registration failed" }));
          throw new Error(err.error || "Registration failed");
        }

        const data = await res.json();
        login(data.user, data.token);

        toast({
          title: isAr ? "تم إنشاء الحساب بنجاح" : "Account Created",
          description: isAr ? "مرحباً بك في منصة مهارات الوطنية." : "Welcome to the National Skills Platform.",
        });
        setLocation("/");
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: isAr ? "فشل الإجراء" : "Authentication Failed",
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] text-foreground p-4 relative overflow-hidden font-sans select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Header */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-card/60 border border-border/40 hover:bg-card transition-all text-muted-foreground hover:text-foreground"
        >
          <Globe className="w-4 h-4 text-primary" />
          <span>{language === "ar" ? "English" : "العربية"}</span>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <SkillsLogo className="w-12 h-12 shadow-lg shadow-primary/15 mb-3 mx-auto" />
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            {isAr ? "منصة مهارات" : "Skills Platform"}
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            {isAr 
              ? "بوابة التطوير والتدريب والتوظيف الوطنية" 
              : "The National Portal for Professional Training & Employment"}
          </p>
        </div>

        {/* Auth Panel */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-2xl relative">
          {/* Form Selector Tabs */}
          <div className="grid grid-cols-2 bg-muted/50 p-1 rounded-2xl mb-6">
            <button
              onClick={() => setMode("login")}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === "login"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>{isAr ? "تسجيل الدخول" : "Sign In"}</span>
            </button>
            
            <button
              onClick={() => setMode("register")}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === "register"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAr ? "إنشاء حساب" : "Sign Up"}</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-start">
            <AnimatePresence mode="wait">
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3.5"
                >
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label className="text-[10.5px] font-bold text-muted-foreground flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary" />
                      {isAr ? "الاسم الكامل" : "Full Name"}
                    </Label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isAr ? "مثال: علي حسين..." : "e.g. Ali Hussein"}
                      className="rounded-xl h-11 text-xs font-semibold bg-background/50 border-border/60"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label className="text-[10.5px] font-bold text-muted-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-primary" />
                {isAr ? "البريد الإلكتروني" : "Email Address"}
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isAr ? "username@example.com" : "username@example.com"}
                className="rounded-xl h-11 text-xs font-semibold bg-background/50 border-border/60"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-[10.5px] font-bold text-muted-foreground flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-primary" />
                {isAr ? "كلمة المرور" : "Password"}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl h-11 text-xs font-semibold bg-background/50 border-border/60"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl font-bold h-11 text-xs shadow-md shadow-primary/10 mt-3 flex items-center justify-center gap-1.5"
            >
              <span>
                {isLoading 
                  ? (isAr ? "جاري التحميل..." : "Please wait...") 
                  : (mode === "login" ? (isAr ? "تسجيل الدخول" : "Sign In") : (isAr ? "إنشاء حساب جديد" : "Sign Up"))}
              </span>
            </Button>
          </form>

          {/* Quick info credentials guide */}
          {mode === "login" && import.meta.env.DEV && (
            <div className="mt-6 pt-4 border-t border-dashed border-border/50 text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground block mb-1">🔑 {isAr ? "بيانات الدخول التجريبية السريعة:" : "Demo Login Credentials:"}</span>
              <p>• {isAr ? "حساب المسؤول:" : "Admin Account:"} <code className="text-primary font-bold">admin@eduplatform.com</code> / <code className="font-mono font-bold text-foreground">admin123</code></p>
              <p>• {isAr ? "حساب الطالب:" : "Student Account:"} <code className="text-primary font-bold">student@eduplatform.com</code> / <code className="font-mono font-bold text-foreground">pass123</code></p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
