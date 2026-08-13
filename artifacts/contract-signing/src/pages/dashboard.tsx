import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowUpRight, Bell, Check, ChevronDown, Clipboard, Clock3, FilePlus2, FileSignature, Inbox, Loader2, Mail, Menu, MoreHorizontal, Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import { getGetDashboardSummaryQueryKey, getListContractsQueryKey, useCreateContract, useGetDashboardSummary, useListContracts, useResendContract, useUpdateContract } from '@workspace/api-client-react';

const statuses = ['all', 'draft', 'sent', 'viewed', 'signed', 'expired'] as const;
type StatusFilter = (typeof statuses)[number];

const statusMeta: Record<string, { label: string; className: string; dot: string }> = {
  draft: { label: 'Draft', className: 'bg-secondary text-secondary-foreground', dot: 'bg-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-[#e7f1ed] text-[#16604b]', dot: 'bg-[#21866b]' },
  viewed: { label: 'Viewed', className: 'bg-[#f8ead7] text-[#8a5b20]', dot: 'bg-[#c88b39]' },
  signed: { label: 'Signed', className: 'bg-[#dce9ed] text-[#24576c]', dot: 'bg-[#3c7e94]' },
  expired: { label: 'Expired', className: 'bg-[#f5e4e1] text-[#98433b]', dot: 'bg-[#b9574d]' },
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatMoney(value?: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value ?? 0);
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] ?? statusMeta.draft;
  return <span data-testid={`status-contract-${status}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${meta.className}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>;
}

function SummaryCard({ label, value, detail, icon: Icon, accent }: { label: string; value: string; detail: string; icon: typeof Clipboard; accent: string }) {
  return <div className="animate-rise-in rounded-2xl border border-card-border bg-card p-5 ink-shadow">
    <div className="flex items-start justify-between">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${accent}`}><Icon size={18} strokeWidth={1.8} /></div>
      <span className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Live</span>
    </div>
    <p className="mt-5 text-sm text-muted-foreground">{label}</p>
    <p data-testid={`summary-${label.toLowerCase().replace(/\s/g, '-')}`} className="mt-1 font-serif text-4xl tracking-tight text-foreground">{value}</p>
    <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
  </div>;
}

function ContractSkeleton() {
  return <div className="space-y-3" data-testid="loading-contracts">{[1, 2, 3, 4].map((item) => <div key={item} className="h-[78px] animate-pulse rounded-2xl bg-secondary/70" />)}</div>;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const contractsQuery = useListContracts();
  const summaryQuery = useGetDashboardSummary();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const resendContract = useResendContract();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ title: '', clientName: '', clientEmail: '', scope: '', paymentTerms: '', expirationDate: '' });

  const contracts = contractsQuery.data ?? [];
  const summary = summaryQuery.data;
  const visibleContracts = useMemo(() => contracts.filter((contract) => {
    const matchesFilter = filter === 'all' || contract.status === filter;
    const haystack = `${contract.title} ${contract.clientName} ${contract.reference}`.toLowerCase();
    return matchesFilter && haystack.includes(search.toLowerCase());
  }), [contracts, filter, search]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createContract.mutate({ data: form }, {
      onSuccess: () => {
        refresh();
        setForm({ title: '', clientName: '', clientEmail: '', scope: '', paymentTerms: '', expirationDate: '' });
        setShowCreate(false);
        notify('Contract saved as a draft.');
      },
      onError: () => notify('We could not save that contract. Please try again.'),
    });
  };

  const changeStatus = (id: string, status: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired') => {
    updateContract.mutate({ id, data: { status } }, {
      onSuccess: () => { refresh(); notify(status === 'sent' ? 'Secure signing link sent.' : 'Contract status updated.'); },
      onError: () => notify('Status could not be updated.'),
    });
  };

  const resend = (id: string) => {
    resendContract.mutate({ id }, {
      onSuccess: () => { refresh(); notify('A fresh signing link is on its way.'); },
      onError: () => notify('The link could not be resent.'),
    });
  };

  const isBusy = createContract.isPending || updateContract.isPending || resendContract.isPending;
  return <div className="noise-overlay min-h-[100dvh] bg-background">
    <aside className={`fixed inset-y-0 left-0 z-40 w-[254px] border-r border-sidebar-border bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between">
        <Link href="/" data-testid="link-brand" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><FileSignature size={19} /></span>
          <span><span className="block text-[15px] font-bold tracking-[-.02em]">signet</span><span className="font-mono text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/55">workspace</span></span>
        </Link>
        <button data-testid="button-close-nav" onClick={() => setMobileNav(false)} className="rounded-lg p-1 text-sidebar-foreground/70 lg:hidden"><X size={18} /></button>
      </div>
      <div className="mt-12 font-mono text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/40">Workspace</div>
      <nav className="mt-3 space-y-1">
        <Link href="/" data-testid="link-dashboard" className="flex items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-2.5 text-sm font-semibold text-sidebar-accent-foreground"><Inbox size={17} />Overview<span className="ml-auto rounded-md bg-sidebar-primary/20 px-1.5 py-0.5 font-mono text-[10px] text-sidebar-primary">{summary?.total ?? '—'}</span></Link>
        <button data-testid="button-open-create-sidebar" onClick={() => { setShowCreate(true); setMobileNav(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><Plus size={17} />New contract</button>
      </nav>
      <div className="mt-10 font-mono text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/40">Account</div>
      <div className="mt-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-3">
        <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#d8b486] text-sm font-bold text-[#503b23]">AM</div><div className="min-w-0"><p className="truncate text-sm font-semibold">Aster & Moss</p><p className="truncate text-xs text-sidebar-foreground/55">Operations team</p></div><ChevronDown className="ml-auto text-sidebar-foreground/45" size={15} /></div>
      </div>
      <div className="absolute bottom-6 left-5 right-5 flex items-center gap-2 rounded-xl border border-sidebar-border px-3 py-2 text-xs text-sidebar-foreground/55"><ShieldCheck size={15} className="text-sidebar-primary" />Encrypted workspace</div>
    </aside>

    <main className="min-h-[100dvh] lg:pl-[254px]">
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md md:px-10">
        <button data-testid="button-open-nav" onClick={() => setMobileNav(true)} className="rounded-xl border border-border p-2 lg:hidden"><Menu size={18} /></button>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><span>Workspace</span><span className="text-border">/</span><span className="font-semibold text-foreground">Overview</span></div>
        <div className="ml-auto flex items-center gap-2 md:gap-4"><span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="h-2 w-2 rounded-full bg-[#21866b]" />All systems operational</span><button data-testid="button-notifications" onClick={() => notify('You are all caught up.')} className="rounded-xl border border-border p-2.5 text-muted-foreground transition hover:bg-secondary"><Bell size={17} /></button><button data-testid="button-avatar" onClick={() => notify('Account settings are managed by your workspace admin.')} className="grid h-9 w-9 place-items-center rounded-full bg-[#d8b486] text-xs font-bold text-[#503b23]">AM</button></div>
      </header>

      <div className="mx-auto max-w-[1420px] px-5 py-8 md:px-10 md:py-11">
        <section className="animate-rise-in flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">Thursday, October 17</p><h1 className="mt-3 font-serif text-5xl leading-[.95] tracking-tight md:text-6xl">Good morning, <em>Alex.</em></h1><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">A clear view of every agreement moving through your workspace.</p></div>
          <button data-testid="button-new-contract" onClick={() => setShowCreate(true)} className="group inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/15"><FilePlus2 size={17} />New contract<span className="ml-2 border-l border-primary-foreground/25 pl-3 text-primary-foreground/65">⌘ N</span></button>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total contracts" value={summary ? String(summary.total) : '—'} detail="Across your workspace" icon={Clipboard} accent="bg-[#e3eee9] text-primary" />
          <SummaryCard label="Awaiting signature" value={summary ? String(summary.pending) : '—'} detail={summary?.expiringSoon ? `${summary.expiringSoon} expiring this week` : 'Nothing urgent'} icon={Clock3} accent="bg-[#f5e9d9] text-[#9b6a29]" />
          <SummaryCard label="Signed this month" value={summary ? String(summary.signed) : '—'} detail="Verified agreements" icon={Check} accent="bg-[#dfecef] text-[#356c7e]" />
          <SummaryCard label="Contract value" value={summary ? formatMoney(summary.totalValue) : '—'} detail="Total agreement value" icon={Sparkles} accent="bg-[#e9e3ed] text-[#6d4c76]" />
        </section>

        <section className="mt-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Your agreements</p><h2 className="mt-2 font-serif text-3xl">Recent contracts</h2></div><div className="flex items-center gap-2"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input data-testid="input-search-contracts" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contracts" className="h-10 w-[210px] rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/10" /></div><button data-testid="button-refresh-contracts" onClick={refresh} className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition hover:bg-secondary"><RefreshCw size={16} /></button></div></div>
          <div className="mt-6 flex gap-1 overflow-x-auto border-b border-border/70 pb-px">{statuses.map((item) => <button key={item} data-testid={`filter-${item}`} onClick={() => setFilter(item)} className={`whitespace-nowrap border-b-2 px-3 pb-3 text-xs font-semibold capitalize transition ${filter === item ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{item === 'all' ? 'All contracts' : statusMeta[item].label}</button>)}</div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-card-border bg-card ink-shadow">
            <div className="hidden grid-cols-[1.6fr_1.1fr_.8fr_.9fr_34px] gap-4 border-b border-border/70 bg-secondary/35 px-5 py-3 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground md:grid"><span>Agreement</span><span>Client</span><span>Status</span><span>Updated</span><span /></div>
            {contractsQuery.isLoading ? <div className="p-4"><ContractSkeleton /></div> : contractsQuery.isError ? <div className="flex flex-col items-center justify-center px-6 py-16 text-center" data-testid="error-contracts"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f5e4e1] text-[#98433b]"><RefreshCw size={20} /></div><h3 className="mt-4 font-semibold">Contracts are taking a moment</h3><p className="mt-1 text-sm text-muted-foreground">We could not load your workspace.</p><button data-testid="button-retry-contracts" onClick={refresh} className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Try again</button></div> : visibleContracts.length === 0 ? <div className="flex flex-col items-center justify-center px-6 py-16 text-center" data-testid="empty-contracts"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"><FileSignature size={20} /></div><h3 className="mt-4 font-semibold">{contracts.length ? 'No matching contracts' : 'Your workspace is ready'}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{contracts.length ? 'Try a different search or status filter.' : 'Create your first agreement and send it with confidence.'}</p>{!contracts.length && <button data-testid="button-empty-create" onClick={() => setShowCreate(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={16} />Create a contract</button>}</div> : <div>{visibleContracts.map((contract, index) => <div key={contract.id} data-testid={`row-contract-${contract.id}`} className="animate-rise-in grid gap-3 border-b border-border/60 px-5 py-4 last:border-b-0 md:grid-cols-[1.6fr_1.1fr_.8fr_.9fr_34px] md:items-center" style={{ animationDelay: `${index * 55}ms` }}><Link href={`/contract/${contract.id}`} data-testid={`link-contract-${contract.id}`} className="group min-w-0"><p className="truncate text-sm font-semibold group-hover:text-primary">{contract.title}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">{contract.reference}</p></Link><div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e9ded0] text-[10px] font-bold text-[#765d44]">{contract.clientName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span className="truncate">{contract.clientName}</span></div><div><StatusBadge status={contract.status} /></div><p className="text-xs text-muted-foreground">{formatDate(contract.updatedAt)}</p><div className="flex items-center justify-between md:justify-end"><div className="flex gap-2 md:hidden">{contract.status === 'draft' && <button data-testid={`button-send-${contract.id}`} onClick={() => changeStatus(contract.id, 'sent')} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"><Send size={13} />Send</button>}{(contract.status === 'sent' || contract.status === 'viewed') && <button data-testid={`button-resend-${contract.id}`} onClick={() => resend(contract.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold"><Mail size={13} />Resend</button>}</div><div className="group relative"><button data-testid={`button-actions-${contract.id}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"><MoreHorizontal size={17} /></button><div className="pointer-events-none absolute right-0 top-8 z-10 w-40 rounded-xl border border-border bg-card p-1 opacity-0 shadow-xl transition group-focus-within:pointer-events-auto group-focus-within:opacity-100">{contract.status === 'draft' && <button data-testid={`action-send-${contract.id}`} onClick={() => changeStatus(contract.id, 'sent')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-secondary"><Send size={14} />Send for signature</button>}{(contract.status === 'sent' || contract.status === 'viewed' || contract.status === 'expired') && <button data-testid={`action-resend-${contract.id}`} onClick={() => resend(contract.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-secondary"><Mail size={14} />Resend link</button>}<Link href={`/contract/${contract.id}`} data-testid={`action-open-${contract.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-secondary"><ArrowUpRight size={14} />Open document</Link></div></div></div></div>)}</div>}
          </div>
        </section>
      </div>
    </main>

    {showCreate && <div className="fixed inset-0 z-50 flex justify-end bg-foreground/20 backdrop-blur-[2px]" data-testid="create-contract-overlay"><button aria-label="Close create contract" data-testid="button-close-create" onClick={() => setShowCreate(false)} className="absolute inset-0 cursor-default" /><aside className="relative h-full w-full max-w-[510px] overflow-y-auto border-l border-border bg-card px-6 py-7 shadow-2xl md:px-9"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">New agreement</p><h2 className="mt-2 font-serif text-4xl">Start with clarity.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">A few details is all we need. You can send the signing link when everything looks right.</p></div><button data-testid="button-dismiss-create" onClick={() => setShowCreate(false)} className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-secondary"><X size={18} /></button></div><form onSubmit={submitCreate} className="mt-9 space-y-5"><label className="block"><span className="text-xs font-semibold">Agreement title</span><input required data-testid="input-contract-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Q4 Brand Partnership" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label><div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="text-xs font-semibold">Client name</span><input required data-testid="input-client-name" value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} placeholder="Full name or company" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label><label className="block"><span className="text-xs font-semibold">Client email</span><input required type="email" data-testid="input-client-email" value={form.clientEmail} onChange={(event) => setForm({ ...form, clientEmail: event.target.value })} placeholder="name@company.com" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label></div><label className="block"><span className="text-xs font-semibold">Scope of work</span><textarea required data-testid="input-contract-scope" value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} placeholder="Describe what both parties are agreeing to..." rows={4} className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label><label className="block"><span className="text-xs font-semibold">Payment terms</span><input required data-testid="input-payment-terms" value={form.paymentTerms} onChange={(event) => setForm({ ...form, paymentTerms: event.target.value })} placeholder="e.g. $12,500 due within 30 days" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label><label className="block"><span className="text-xs font-semibold">Expiration date</span><input required type="date" data-testid="input-expiration-date" value={form.expirationDate} onChange={(event) => setForm({ ...form, expirationDate: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></label><div className="rounded-xl border border-border bg-secondary/50 p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck size={15} className="mb-1 text-primary" />Your draft is private. Nothing is sent until you choose to send it from the contract workspace.</div><button disabled={createContract.isPending} data-testid="button-save-contract" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:shadow-lg hover:shadow-primary/15 disabled:opacity-60">{createContract.isPending ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}Save draft</button></form></aside></div>}
    {notice && <div data-testid="status-notice" className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-sidebar px-4 py-3 text-sm font-medium text-sidebar-foreground shadow-2xl"><Check size={16} className="text-sidebar-primary" />{notice}</div>}
    {isBusy && <span className="sr-only" data-testid="status-action-pending">Saving changes</span>}
  </div>;
}