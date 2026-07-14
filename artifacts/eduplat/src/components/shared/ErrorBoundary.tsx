import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isAr = typeof window !== "undefined" && (
        localStorage.getItem("eduplat-language") === "ar" ||
        navigator.language.startsWith("ar")
      );

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8 relative overflow-hidden">
          {/* Ambient background glows */}
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-destructive/5 rounded-full blur-[100px] pointer-events-none" />

          <div 
            className="w-full max-w-xl rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 sm:p-10 shadow-2xl relative z-10 text-center space-y-6"
            style={{
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)"
            }}
          >
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {isAr ? "عذراً، حدث خطأ غير متوقع" : "Oops! Something went wrong"}
              </h1>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-md mx-auto">
                {isAr 
                  ? "لقد تعطلت الصفحة بسبب مشكلة غير متوقعة. يمكنك محاولة تحديث الصفحة أو العودة للرئيسية." 
                  : "The page crashed due to an unexpected runtime error. You can try reloading the page or returning home."}
              </p>
            </div>

            {/* Error Details */}
            {this.state.error && (
              <div className="rounded-xl border border-border/80 bg-background/50 p-4 text-start font-mono text-xs text-destructive overflow-auto max-h-48 space-y-2">
                <p className="font-bold">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap leading-normal">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button 
                onClick={this.handleReload} 
                className="rounded-xl font-bold text-xs gap-1.5 h-11 px-6 flex-1 shadow-sm"
              >
                <RotateCw className="w-4 h-4 animate-spin-hover" />
                <span>{isAr ? "إعادة تحميل الصفحة" : "Reload Page"}</span>
              </Button>
              <Button 
                onClick={this.handleReset}
                variant="outline"
                className="rounded-xl font-bold text-xs gap-1.5 h-11 px-6 flex-1 border-border/80"
              >
                <Home className="w-4 h-4" />
                <span>{isAr ? "العودة للرئيسية" : "Back to Home"}</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
