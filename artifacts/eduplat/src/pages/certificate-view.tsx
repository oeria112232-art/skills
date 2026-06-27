import { useRoute, Link } from "wouter";
import { useGetCertificate, getGetCertificateQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, Download, GraduationCap, Award, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";

export default function CertificateViewPage() {
  const [, params] = useRoute("/certificate/:id");
  const certId = parseInt(params?.id || "0", 10);
  const { data: cert, isLoading } = useGetCertificate(certId, { query: { enabled: !!certId, queryKey: getGetCertificateQueryKey(certId) } });

  const handlePrint = () => window.print();

  if (isLoading) return <AppLayout><Skeleton className="h-96 w-full rounded-xl" /></AppLayout>;
  if (!cert) return <AppLayout><p className="text-center text-muted-foreground mt-16">Certificate not found</p></AppLayout>;

  return (
    <AppLayout>
      <div className="no-print mb-6 flex items-center gap-4">
        <Link href="/certificates" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-certificates">
          <ArrowLeft className="w-4 h-4" /> Back to Certificates
        </Link>
        <Button onClick={handlePrint} className="gap-2 ml-auto" data-testid="button-print-certificate">
          <Download className="w-4 h-4" /> Download PDF
        </Button>
      </div>

      {/* Certificate */}
      <div
        className="max-w-3xl mx-auto print:max-w-full"
        data-testid="certificate-document"
      >
        <div className="relative border-8 border-double border-primary/30 rounded-2xl bg-gradient-to-br from-card via-background to-card p-12 text-center shadow-2xl">
          {/* Decorative corners */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary/50 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary/50 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary/50 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary/50 rounded-br-lg" />

          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <GraduationCap className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold text-primary">EduPlat</span>
          </div>

          <p className="text-sm font-medium tracking-[0.3em] uppercase text-muted-foreground mb-4">Certificate of Completion</p>

          <p className="text-base text-muted-foreground mb-2">This certifies that</p>
          <h1 className="text-4xl font-bold mb-4" data-testid="cert-recipient-name">{cert.userName}</h1>
          <p className="text-base text-muted-foreground mb-2">has successfully completed</p>
          <h2 className="text-2xl font-bold text-primary mb-2" data-testid="cert-workshop-title">{cert.workshopTitle}</h2>

          <div className="flex items-center justify-center gap-2 mb-8">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium">Score: {cert.score}%</span>
          </div>

          {/* Gold separator */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-primary/20" />
            <Award className="w-6 h-6 text-yellow-500" />
            <div className="flex-1 h-px bg-primary/20" />
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 text-center">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Date Issued</p>
              <p className="font-semibold">{new Date(cert.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Certificate No.</p>
              <p className="font-mono text-sm font-semibold" data-testid="cert-number">{cert.certificateNumber}</p>
            </div>
          </div>

          {/* Seal */}
          <div className="flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-primary/30 flex items-center justify-center bg-primary/5">
              <div className="text-center">
                <GraduationCap className="w-8 h-8 text-primary mx-auto" />
                <p className="text-xs font-bold text-primary mt-1">CERTIFIED</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
