import { Link } from "wouter";
import { useListCertificates } from "@workspace/api-client-react";
import { Award, Calendar, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";

export default function CertificatesPage() {
  const { data: certs, isLoading } = useListCertificates();

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" data-testid="heading-certificates">My Certificates</h1>
        <p className="text-muted-foreground">Your earned certifications from workshops and courses</p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !certs || certs.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Award className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-semibold mb-2">No certificates yet</h3>
          <p className="text-sm mb-6">Complete a workshop exam to earn your first certificate</p>
          <Link href="/workshops">
            <Button data-testid="button-browse-workshops">Browse Workshops</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certs.map(cert => (
            <div key={cert.id} className="p-5 rounded-xl border border-border bg-card hover:shadow-md transition-shadow" data-testid={`certificate-card-${cert.id}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-2" data-testid={`cert-title-${cert.id}`}>{cert.workshopTitle}</h3>
                  <p className="text-xs text-muted-foreground">{cert.userName}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-4 mb-4">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(cert.issuedAt).toLocaleDateString()}</span>
                <span className="font-medium text-primary">{cert.score}%</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4 font-mono">{cert.certificateNumber}</p>
              <div className="flex gap-2">
                <Link href={`/certificate/${cert.id}`}>
                  <Button size="sm" variant="outline" className="gap-1 flex-1" data-testid={`button-view-cert-${cert.id}`}>
                    <Eye className="w-3 h-3" /> View
                  </Button>
                </Link>
                <Link href={`/certificate/${cert.id}`}>
                  <Button size="sm" className="gap-1 flex-1" data-testid={`button-download-cert-${cert.id}`}>
                    <Download className="w-3 h-3" /> Download
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
