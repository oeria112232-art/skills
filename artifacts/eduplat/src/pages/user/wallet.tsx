import { useState, useRef, useEffect } from "react";
import { 
  useGetWallet, 
  useCreateDepositRequest, 
  useVerifyTransfer, 
  useConfirmTransfer, 
  getGetWalletQueryKey 
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useAuth } from "@/components/layout/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  History, 
  Coins, 
  ArrowRightLeft
} from "lucide-react";

const POINT_PRICE_IQD = 25; // 1 Point = 25 IQD

async function getPaymentMethods() {
  const token = localStorage.getItem("mharat-token");
  const r = await fetch("/api/points/payment-methods", {
    headers: token ? { "Authorization": `Bearer ${token}` } : {}
  });
  return r.ok ? r.json() : [];
}

export default function UserWalletPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";

  const { data: wallet, isLoading: isWalletLoading, refetch: refetchWallet } = useGetWallet();
  const createDepositMutation = useCreateDepositRequest();
  const verifyTransferMutation = useVerifyTransfer();
  const confirmTransferMutation = useConfirmTransfer();

  // State
  const [rechargePoints, setRechargePoints] = useState("100");
  const [screenshotData, setScreenshotData] = useState("");
  const [rechargeNotes, setRechargeNotes] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transfer State
  const [transferEmail, setTransferEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferStep, setTransferStep] = useState(1);
  const [verifiedTarget, setVerifiedTarget] = useState<any>(null);

  useEffect(() => {
    getPaymentMethods().then(m => setPaymentMethods(m));
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { 
      toast({ 
        title: isAr ? "حجم الصورة كبير جداً (الأقصى 5 ميجابايت)" : "File size too large (Max 5MB)", 
        variant: "destructive" 
      }); 
      return; 
    }
    const reader = new FileReader();
    reader.onload = ev => setScreenshotData(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleRechargeSubmit() {
    if (!rechargePoints || parseInt(rechargePoints) < 50) { 
      toast({ title: isAr ? "الحد الأدنى للشحن 50 نقطة" : "Minimum top up is 50 points", variant: "destructive" }); 
      return; 
    }
    if (!screenshotData) { 
      toast({ title: isAr ? "يرجى إرفاق صورة الإيصال" : "Please attach the receipt screenshot", variant: "destructive" }); 
      return; 
    }
    
    try {
      await createDepositMutation.mutateAsync({
        data: { 
          pointsAmount: parseInt(rechargePoints), 
          cashAmount: (parseInt(rechargePoints) * POINT_PRICE_IQD).toString(),
          transferScreenshot: screenshotData,
          notes: `${rechargeNotes}${selectedPaymentMethod ? ` | طريقة الدفع: ${selectedPaymentMethod.name}` : ""}`,
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      refetchWallet();
      setRechargePoints("100"); 
      setScreenshotData(""); 
      setRechargeNotes(""); 
      setSelectedPaymentMethod(null);
      toast({ title: isAr ? "تم إرسال طلب الشحن بنجاح وهو قيد المراجعة" : "Recharge request sent successfully and is under review" });
    } catch (e: any) { 
      toast({ title: e.message || "Failed to submit request", variant: "destructive" }); 
    }
  }

  async function handleVerifyTransfer() {
    try {
      const result = await verifyTransferMutation.mutateAsync({ 
        data: { email: transferEmail, amount: parseInt(transferAmount) } 
      });
      setVerifiedTarget(result); 
      setTransferStep(2);
    } catch (e: any) { 
      toast({ title: e.message || "Verification failed", variant: "destructive" }); 
    }
  }

  async function handleConfirmTransfer() {
    try {
      await confirmTransferMutation.mutateAsync({ 
        data: { email: transferEmail, amount: parseInt(transferAmount) } 
      });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      refetchWallet();
      setTransferEmail(""); 
      setTransferAmount(""); 
      setTransferStep(1); 
      setVerifiedTarget(null);
      toast({ title: isAr ? "تم تحويل النقاط بنجاح" : "Points transferred successfully" });
    } catch (e: any) { 
      toast({ title: e.message || "Transfer failed", variant: "destructive" }); 
    }
  }

  const points = wallet?.points ?? 0;

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {isAr ? "محفظتي" : "My Wallet"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAr ? "إدارة رصيدك من النقاط، تحويل الأرصدة للأعضاء، وتقديم طلبات الشحن" : "Manage your points balance, transfer points, and request top-ups"}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetchWallet()} 
            disabled={isWalletLoading}
            className="rounded-xl gap-2 font-bold shadow-none"
          >
            <RefreshCw className={`w-4 h-4 ${isWalletLoading ? "animate-spin" : ""}`} />
            {isAr ? "تحديث المحفظة" : "Sync Wallet"}
          </Button>
        </div>

        {/* Top Section: Balance Card & Send/Receive Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none relative overflow-hidden shadow-xl rounded-2xl min-h-[160px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-10">
              <Wallet className="w-48 h-48" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-primary-foreground/70 font-semibold text-xs uppercase tracking-wider">
                {isAr ? "الرصيد المتاح" : "Available Balance"}
              </CardDescription>
              <CardTitle className="text-4xl font-black tracking-tight flex items-baseline gap-1.5">
                {isWalletLoading ? <Skeleton className="h-10 w-24 bg-white/20" /> : points.toLocaleString()}
                <span className="text-sm font-bold opacity-80">{isAr ? "نقطة" : "Points"}</span>
              </CardTitle>
            </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-primary-foreground/80 font-medium">
                  {isAr ? `تعادل تقريباً ${(points * POINT_PRICE_IQD).toLocaleString()} دينار عراقي` : `Equivalent to ~${(points * POINT_PRICE_IQD).toLocaleString()} IQD`}
                </div>
              </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/45 backdrop-blur-sm flex flex-col justify-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                {isAr ? "العمليات الواردة" : "Incoming Operations"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                {isWalletLoading ? <Skeleton className="h-8 w-16" /> : (wallet?.transactions?.filter((t: any) => t.type === "deposit" || t.type === "transfer_in")?.length ?? 0)}
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                {isAr ? "عمليات الشحن والتحويلات المستقبلة" : "Deposits and incoming transfers received"}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/45 backdrop-blur-sm flex flex-col justify-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-primary" />
                {isAr ? "العمليات الصادرة" : "Outgoing Operations"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                {isWalletLoading ? <Skeleton className="h-8 w-16" /> : (wallet?.transactions?.filter((t: any) => t.type === "consultation" || t.type === "transfer_out")?.length ?? 0)}
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                {isAr ? "عمليات استقطاع الاستشارات والتحويلات المرسلة" : "Consultation costs and outgoing transfers"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mid Section: Recharge Form & Transfer Form */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Up / Recharge Card */}
          <Card className="rounded-2xl border-border/60 bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                {isAr ? "شحن رصيد المحفظة" : "Top Up Wallet"}
              </CardTitle>
              <CardDescription>
                {isAr ? "اختر طريقة الدفع، قم بتحويل القيمة، ثم أرفق إيصال العملية للمراجعة" : "Choose pay method, transfer & upload invoice for approval"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Methods selector */}
              {paymentMethods.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground">{isAr ? "اختر طريقة الدفع المتاحة" : "Available Payment Methods"}</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {paymentMethods.map((m: any) => (
                      <button 
                        key={m.id} 
                        onClick={() => setSelectedPaymentMethod(selectedPaymentMethod?.id === m.id ? null : m)}
                        className={`p-3 rounded-xl border text-start flex items-start gap-2.5 transition-all duration-200 ${
                          selectedPaymentMethod?.id === m.id 
                            ? "bg-primary/10 border-primary" 
                            : "bg-background border-border hover:bg-accent/40"
                        }`}
                      >
                        <div className="flex-1 space-y-0.5">
                          <div className="text-xs font-bold text-foreground">{m.name}</div>
                          <div className="text-[10px] text-muted-foreground">{m.accountName}</div>
                          <div className="text-[11px] font-bold text-primary font-mono">{m.accountNumber}</div>
                        </div>
                        {selectedPaymentMethod?.id === m.id && <span className="text-primary font-black text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentMethods.length === 0 && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                    {isAr ? "لا توجد طرق دفع معرفة بالمنصة حالياً" : "No payment methods configured yet."}
                  </p>
                </div>
              )}

              {/* Amount input */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">{isAr ? "النقاط المطلوبة" : "Points Required"}</Label>
                <Input 
                  type="number" 
                  min="50" 
                  value={rechargePoints} 
                  onChange={e => setRechargePoints(e.target.value)} 
                  className="rounded-xl"
                />
                {rechargePoints && (
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {isAr ? `المبلغ المطلوب: ${(parseInt(rechargePoints) * POINT_PRICE_IQD).toLocaleString()} دينار عراقي` : `Total cost: ${(parseInt(rechargePoints) * POINT_PRICE_IQD).toLocaleString()} IQD`}
                  </span>
                )}
              </div>

              {/* Receipt screenshot upload */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">{isAr ? "صورة إثبات التحويل / الإيصال" : "Invoice screenshot"}</Label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full p-4 rounded-xl border-2 border-dashed text-center transition-all ${
                    screenshotData 
                      ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" 
                      : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-xs font-bold">
                    {screenshotData ? (isAr ? "تم تحميل إيصال التحويل (اضغط للتغيير)" : "Receipt Uploaded (Click to change)") : (isAr ? "اضغط هنا لاختيار الإيصال من جهازك" : "Click to select screenshot from device")}
                  </span>
                </button>
                {screenshotData && (
                  <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={screenshotData} alt="receipt" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Extra Notes */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">{isAr ? "ملاحظة إضافية" : "Notes (Optional)"}</Label>
                <Input 
                  value={rechargeNotes} 
                  onChange={e => setRechargeNotes(e.target.value)} 
                  placeholder={isAr ? "أدخل تفاصيل إضافية..." : "Additional details..."} 
                  className="rounded-xl"
                />
              </div>

              <Button 
                onClick={handleRechargeSubmit} 
                disabled={createDepositMutation.isPending}
                className="w-full rounded-xl font-bold h-11"
              >
                {createDepositMutation.isPending ? "⏳..." : (isAr ? "إرسال طلب الشحن للمراجعة" : "Send Recharge Request")}
              </Button>
            </CardContent>
          </Card>

          {/* Transfer points to another member */}
          <Card className="rounded-2xl border-border/60 bg-card flex flex-col justify-between">
            <div>
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary" />
                  {isAr ? "تحويل نقاط لمستخدم" : "Transfer Points"}
                </CardTitle>
                <CardDescription>
                  {isAr ? "يمكنك تحويل رصيد نقاط من محفظتك إلى أي طالب مسجل بالمنصة مجاناً" : "Transfer points from your wallet to any registered student on the platform for free"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {transferStep === 1 ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">{isAr ? "البريد الإلكتروني للمستلم" : "Recipient Email"}</Label>
                      <Input 
                        type="email" 
                        value={transferEmail} 
                        onChange={e => setTransferEmail(e.target.value)} 
                        placeholder="user@domain.com"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">{isAr ? "عدد النقاط المراد إرسالها" : "Points to transfer"}</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max={points} 
                        value={transferAmount} 
                        onChange={e => setTransferAmount(e.target.value)} 
                        placeholder="100"
                        className="rounded-xl"
                      />
                      <span className="text-[10px] text-muted-foreground font-semibold block mt-1">
                        {isAr ? `الرصيد المتوفر: ${points} نقطة` : `Available balance: ${points} pts`}
                      </span>
                    </div>
                    <Button 
                      onClick={handleVerifyTransfer} 
                      disabled={verifyTransferMutation.isPending || !transferEmail || !transferAmount}
                      className="w-full rounded-xl font-bold h-11"
                    >
                      {verifyTransferMutation.isPending ? "⏳..." : (isAr ? "التحقق من حساب المستلم" : "Verify Recipient Account")}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{isAr ? "اسم المستلم:" : "Recipient Name:"}</span>
                        <span className="text-foreground font-bold">{verifiedTarget?.recipientName}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{isAr ? "البريد الإلكتروني:" : "Email:"}</span>
                        <span className="text-muted-foreground font-semibold truncate max-w-[170px]">{verifiedTarget?.recipientEmail}</span>
                      </div>
                      <div className="h-px bg-border/60" />
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-muted-foreground">{isAr ? "مجموع التحويل:" : "Points to send:"}</span>
                        <span className="text-primary">{verifiedTarget?.amount} {isAr ? "نقطة" : "pts"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleConfirmTransfer} 
                        disabled={confirmTransferMutation.isPending}
                        className="flex-1 rounded-xl font-bold h-11"
                      >
                        {confirmTransferMutation.isPending ? "⏳..." : (isAr ? "تأكيد التحويل الآن" : "Confirm Transfer")}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => { setTransferStep(1); setVerifiedTarget(null); }} 
                        className="rounded-xl font-bold h-11"
                      >
                        {isAr ? "تراجع" : "Cancel"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
            <div className="p-6 pt-0">
              <div className="rounded-xl bg-muted/40 p-3.5 border border-border/40 text-[10px] text-muted-foreground leading-relaxed">
                {isAr ? "تنبيّه: عمليات التحويل نهائية ولا يمكن التراجع عنها بعد تأكيد العملية. يرجى التحقق بدقة من البريد الإلكتروني للمستلم قبل التأكيد." : "Notice: Point transfers are final and irreversible. Please check the recipient email closely before confirming."}
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom Section: Transactions History */}
        <Card className="rounded-2xl border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              {isAr ? "سجل معاملات المحفظة" : "Wallet Transaction History"}
            </CardTitle>
            <CardDescription>
              {isAr ? "كافة عمليات الإيداع، التحويل، والخصومات المسجلة على حسابك" : "All deposit, transfer, and deduction logs related to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isWalletLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !wallet?.transactions || wallet.transactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground font-semibold">
                {isAr ? "لا توجد معاملات مسجلة حتى الآن في محفظتك" : "No transactions logged in your wallet yet"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground font-bold">
                      <th className="py-3 text-start">{isAr ? "النوع" : "Type"}</th>
                      <th className="py-3 text-start">{isAr ? "القيمة" : "Points"}</th>
                      <th className="py-3 text-start">{isAr ? "البيان / الملاحظات" : "Description"}</th>
                      <th className="py-3 text-start">{isAr ? "التاريخ" : "Date"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-semibold text-foreground">
                    {wallet.transactions.map((tx: any, idx: number) => {
                      const isMinus = tx.type === "consultation" || tx.type === "transfer_out" || tx.type === "deduct";
                      return (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors">
                          <td className="py-3 text-start">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              isMinus ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className={`py-3 text-start font-bold ${isMinus ? "text-red-500" : "text-emerald-500"}`}>
                            {isMinus ? "-" : "+"}{tx.amount}
                          </td>
                          <td className="py-3 text-start text-muted-foreground">
                            {tx.description || tx.notes || "-"}
                          </td>
                          <td className="py-3 text-start text-muted-foreground/80 font-mono text-[10px]">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                              year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                            }) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
