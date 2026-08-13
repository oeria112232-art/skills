import { useEffect, useRef, useState } from 'react';
import type { FormEvent, PointerEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import { ArrowLeft, Check, CheckCircle2, ChevronRight, CircleHelp, FileSignature, LockKeyhole, PenLine, RotateCcw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { getGetContractQueryKey, useGetContract, useSignContract, useUpdateContract } from '@workspace/api-client-react';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function SignaturePad({ onChange, resetKey }: { onChange: (value: string) => void; resetKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const bounds = canvas.getBoundingClientRect();
    canvas.width = bounds.width * ratio;
    canvas.height = bounds.height * ratio;
    const context = canvas.getContext('2d');
    if (context) {
      context.scale(ratio, ratio);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = 2.1;
      context.strokeStyle = '#17343b';
    }
    setHasInk(false);
    onChange('');
  }, [resetKey, onChange]);
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    canvas.setPointerCapture(event.pointerId);
    const context = canvas.getContext('2d');
    if (!context) return;
    const next = point(event);
    context.beginPath();
    context.moveTo(next.x, next.y);
    drawingRef.current = true;
    setHasInk(true);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext('2d');
    if (!context) return;
    const next = point(event);
    context.lineTo(next.x, next.y);
    context.stroke();
  };
  const stop = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(event.currentTarget.toDataURL('image/png'));
  };
  return <div className="relative overflow-hidden rounded-xl border border-dashed border-primary/35 bg-[#fcfaf4]"><canvas ref={canvasRef} data-testid="input-signature-pad" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className="h-36 w-full touch-none cursor-crosshair" /><div className="pointer-events-none absolute inset-x-5 bottom-8 border-b border-[#cfc7b7]" />{!hasInk && <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-serif text-xl italic text-muted-foreground/45">Draw your signature here</p>}</div>;
}

export default function ContractView() {
  const { id = '' } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const contractQuery = useGetContract(id, { query: { enabled: Boolean(id), queryKey: getGetContractQueryKey(id) } });
  const signContract = useSignContract();
  const updateContract = useUpdateContract();
  const [step, setStep] = useState<'review' | 'sign'>('review');
  const [form, setForm] = useState({ signerName: '', signerTitle: '', agreedToTerms: false });
  const [signatureData, setSignatureData] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [notice, setNotice] = useState('');

  const contract = contractQuery.data;
  const markViewed = () => {
    if (contract?.status === 'sent') updateContract.mutate({ id, data: { status: 'viewed' } });
    setStep('sign');
    window.setTimeout(() => document.getElementById('signature-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  };
  const submitSignature = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signatureData || !form.agreedToTerms) return;
    signContract.mutate({ id, data: { signerName: form.signerName, signerTitle: form.signerTitle, signatureData, agreedToTerms: true } }, {
      onSuccess: (signedContract) => {
        queryClient.setQueryData(getGetContractQueryKey(id), signedContract);
        setNotice('Your signature has been verified.');
      },
      onError: () => setNotice('We could not complete the signature. Please try again.'),
    });
  };

  if (contractQuery.isLoading) return <div className="min-h-[100dvh] bg-[#f4f0e7] p-5 md:p-10"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-8 w-36 rounded bg-secondary" /><div className="mt-12 h-16 w-3/4 rounded bg-secondary" /><div className="mt-6 h-[520px] rounded-2xl bg-card" /></div></div>;
  if (contractQuery.isError || !contract) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4f0e7] px-5"><div className="max-w-md text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f5e4e1] text-[#98433b]"><X size={24} /></div><h1 className="mt-5 font-serif text-4xl">This document is unavailable</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">The link may have expired or the agreement may have been removed. Contact the sender for a new invitation.</p><Link href="/" data-testid="link-return-home" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"><ArrowLeft size={16} />Return to workspace</Link></div></div>;

  const isSigned = contract.status === 'signed';
  const isExpired = contract.status === 'expired';
  return <div className="noise-overlay min-h-[100dvh] bg-[#f4f0e7] text-foreground">
    <header className="border-b border-[#dcd5c8] bg-[#f4f0e7]/90 px-5 py-5 backdrop-blur-md md:px-10"><div className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/" data-testid="link-public-brand" className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><FileSignature size={16} /></span><span className="font-semibold tracking-[-.02em]">signet</span></Link><div className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole size={14} className="text-primary" />Private signing room</div></div></header>
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-10 md:pt-16">
      <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-primary"><span>Agreement</span><ChevronRight size={12} /><span>{contract.reference}</span></div><h1 data-testid="text-contract-title" className="mt-4 max-w-3xl font-serif text-5xl leading-[.95] tracking-tight md:text-7xl">{contract.title}</h1><p className="mt-5 text-sm text-muted-foreground">Prepared for <strong className="font-semibold text-foreground">{contract.clientName}</strong> · Expires {formatDate(contract.expirationDate)}</p></div>{isSigned ? <div data-testid="status-contract-signed" className="flex items-center gap-3 rounded-2xl border border-[#b9d8cd] bg-[#e6f1ed] px-4 py-3 text-[#16604b]"><CheckCircle2 size={21} /><span><strong className="block text-sm">Verified & signed</strong><span className="text-xs opacity-80">{formatDate(contract.signedAt)}</span></span></div> : isExpired ? <div data-testid="status-contract-expired" className="flex items-center gap-3 rounded-2xl border border-[#e2c0ba] bg-[#f5e4e1] px-4 py-3 text-[#98433b]"><CircleHelp size={20} /><strong className="text-sm">Signing window expired</strong></div> : <div className="flex items-center gap-3 rounded-2xl border border-[#dbd3c1] bg-[#fbf8f0] px-4 py-3 text-muted-foreground"><ShieldCheck size={19} className="text-primary" /><span className="text-xs">Identity protected</span></div>}</div>
      <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_350px]">
        <article className="contract-page-shadow overflow-hidden rounded-2xl border border-[#ddd6c9] bg-[#fffdf8]">
          <div className="flex items-center justify-between border-b border-[#e6dfd3] px-7 py-5 md:px-12"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e4eee9] text-primary"><FileSignature size={17} /></span><div><p className="text-sm font-bold">Aster & Moss</p><p className="font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">Agreement document</p></div></div><span className="font-mono text-[10px] text-muted-foreground">{contract.reference}</span></div>
          <div className="px-7 py-9 md:px-12 md:py-12"><div className="border-b border-[#e6dfd3] pb-9"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Scope of work</p><p data-testid="text-contract-scope" className="mt-4 whitespace-pre-line text-[15px] leading-8 text-[#3c4650]">{contract.scope}</p></div><div className="grid gap-8 border-b border-[#e6dfd3] py-9 sm:grid-cols-2"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Payment terms</p><p data-testid="text-payment-terms" className="mt-3 text-sm leading-6 text-[#3c4650]">{contract.paymentTerms}</p></div><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Expiration</p><p data-testid="text-expiration-date" className="mt-3 text-sm leading-6 text-[#3c4650]">{formatDate(contract.expirationDate)}</p></div></div><div className="pt-9"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Mutual understanding</p><p className="mt-4 text-[14px] leading-8 text-[#3c4650]">Both parties acknowledge that the scope, terms, and conditions outlined in this agreement represent the complete understanding between them. Any amendments must be agreed to in writing by both parties.</p></div></div>
          {isSigned && <div className="border-t border-[#b9d8cd] bg-[#eff7f3] px-7 py-6 md:px-12"><div className="flex items-start gap-3 text-[#16604b]"><CheckCircle2 size={20} className="mt-0.5 shrink-0" /><div><p className="text-sm font-bold">This agreement is complete</p><p className="mt-1 text-xs leading-5 opacity-80">Signed by {contract.signerName} on {formatDate(contract.signedAt)}. The record below is cryptographically verified.</p><div className="mt-4 grid gap-3 font-mono text-[10px] sm:grid-cols-2"><span><b className="font-medium opacity-60">SIGNER</b><br />{contract.signerName} · {contract.signerTitle}</span><span><b className="font-medium opacity-60">VERIFICATION HASH</b><br />{contract.verificationHash ?? 'Verified by signet'}</span></div></div></div></div>}
        </article>

        {!isSigned && !isExpired && <aside id="signature-form" className="lg:sticky lg:top-7"><div className="rounded-2xl border border-[#d9d0c0] bg-[#fbf8f0] p-5 md:p-6 ink-shadow">{step === 'review' ? <><div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Step 01 / 02</span><span className="text-xs text-muted-foreground">Review</span></div><div className="mt-8 grid h-12 w-12 place-items-center rounded-xl bg-[#e4eee9] text-primary"><PenLine size={21} /></div><h2 className="mt-5 font-serif text-3xl">Ready when you are.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Please read the agreement carefully. When you're ready, we'll collect your details and a simple signature.</p><div className="mt-7 space-y-3 text-xs text-[#4d5b5e]"><div className="flex gap-2"><Check size={14} className="mt-0.5 text-primary" />Your signature is legally binding</div><div className="flex gap-2"><Check size={14} className="mt-0.5 text-primary" />Your signing record is encrypted</div><div className="flex gap-2"><Check size={14} className="mt-0.5 text-primary" />You will receive a completed copy</div></div><button data-testid="button-continue-signing" onClick={markViewed} className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/15">Continue to signature<ChevronRight size={17} /></button></> : <form onSubmit={submitSignature}><div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Step 02 / 02</span><button type="button" data-testid="button-back-review" onClick={() => setStep('review')} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Back to review</button></div><h2 className="mt-7 font-serif text-3xl">Make it official.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Enter your details exactly as you would like them recorded.</p><div className="mt-6 space-y-4"><label className="block"><span className="text-xs font-semibold">Full name</span><input required data-testid="input-signer-name" value={form.signerName} onChange={(event) => setForm({ ...form, signerName: event.target.value })} placeholder="Your full name" className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label><label className="block"><span className="text-xs font-semibold">Title or role</span><input required data-testid="input-signer-title" value={form.signerTitle} onChange={(event) => setForm({ ...form, signerTitle: event.target.value })} placeholder="e.g. Founder, Director" className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label><div><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold">Your signature</span><button type="button" data-testid="button-clear-signature" onClick={() => setResetKey((value) => value + 1)} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"><RotateCcw size={12} />Clear</button></div><SignaturePad resetKey={resetKey} onChange={setSignatureData} /></div><label className="flex cursor-pointer gap-3 rounded-xl border border-[#e0d8ca] bg-card/60 p-3"><input required type="checkbox" data-testid="input-agree-terms" checked={form.agreedToTerms} onChange={(event) => setForm({ ...form, agreedToTerms: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#16604b]" /><span className="text-xs leading-5 text-muted-foreground">I agree that this electronic signature is the legal equivalent of my handwritten signature.</span></label></div><button disabled={signContract.isPending || !signatureData || !form.agreedToTerms} data-testid="button-submit-signature" className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45">{signContract.isPending ? 'Verifying signature…' : <><LockKeyhole size={16} />Sign agreement</>}</button><p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground"><ShieldCheck size={13} className="text-primary" />Protected with an encrypted signing record</p></form>}</div><div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><CircleHelp size={13} />Questions? Contact the sender.</div></aside>}
        {isExpired && <aside className="lg:sticky lg:top-7"><div className="rounded-2xl border border-[#e1c8c2] bg-[#fff8f5] p-6"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f5e4e1] text-[#98433b]"><CircleHelp size={21} /></div><h2 className="mt-5 font-serif text-3xl">This link has expired.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">The signing window closed on {formatDate(contract.expirationDate)}. Please ask the sender to issue a fresh agreement.</p></div></aside>}
      </div>
      <footer className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-[#dcd5c8] pt-5 text-[11px] text-muted-foreground sm:flex-row sm:items-center"><span className="flex items-center gap-2"><Sparkles size={13} className="text-accent" />A considered way to sign important things.</span><span className="font-mono uppercase tracking-[.14em]">Signet secure signing room</span></footer>
    </main>
    {notice && <div data-testid="status-signature-notice" className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-foreground shadow-2xl ${notice.includes('could not') ? 'bg-[#98433b]' : 'bg-sidebar'}`}>{notice.includes('could not') ? <X size={16} /> : <Check size={16} className="text-sidebar-primary" />}{notice}</div>}
  </div>;
}