"use client";

import { UserButton } from "@clerk/nextjs";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type DashboardSnapshot = {
  account: {
    id: string;
    clerkUserId: string;
    email: string | null;
    credits: number;
    subscription: {
      id: string;
      plan: string;
      status: string;
      renewsAt: string | null;
      createdAt: string;
      updatedAt: string;
    } | null;
  };
  recentJobs: Array<{
    id: string;
    sourceFileName: string | null;
    sourceColumn: string | null;
    totalEmails: number;
    creditsUsed: number;
    status: string;
    safeCount: number;
    riskyCount: number;
    invalidCount: number;
    unknownCount: number;
    createdAt: string;
  }>;
  recentLedger: Array<{
    id: string;
    entryType: string;
    amount: number;
    balanceAfter: number;
    reason: string;
    createdAt: string;
  }>;
};

type ParsedEmailRow = {
  rowNumber: number;
  rawValue: string;
  email: string;
};

type ParsedColumn = {
  id: string;
  label: string;
  hitRate: number;
  rowCount: number;
  rows: ParsedEmailRow[];
};

type BulkResult = {
  rowNumber: number | null;
  rawValue: string | null;
  email: string;
  status: "safe" | "risky" | "invalid" | "unknown";
  reasonCode?: string | null;
  reasonMessage?: string | null;
  confidenceScore?: number | null;
  latencyMs?: number | null;
  attemptCount?: number | null;
  error?: string;
};

type JobResponse = {
  job: {
    id: string;
    status: string;
    totalRows: number;
    totalEmails: number;
    creditsUsed: number;
    safeCount: number;
    riskyCount: number;
    invalidCount: number;
    unknownCount: number;
    retryCount?: number | null;
    timeoutCount?: number | null;
    providerErrorCount?: number | null;
    averageLatencyMs?: number | null;
    successRate?: number | null;
    unknownRate?: number | null;
    queuedAt?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    processingMs?: number | null;
    createdAt: string;
  };
  remainingCredits: number;
  results: BulkResult[];
};

type BulkSubmitResponse = {
  job: {
    id: string;
    status: string;
    totalRows: number;
    totalEmails: number;
    creditsUsed: number;
  };
  remainingCredits: number;
  reused: boolean;
  queued: boolean;
};

type ApiErrorPayload = {
  error: string;
  availableCredits?: number;
  requiredCredits?: number;
  upgradeUrl?: string | null;
};

type UserTab = "overview" | "verify" | "jobs" | "credits" | "settings";

const USER_TABS: Array<{ id: UserTab; label: string; subtitle: string }> = [
  { id: "overview", label: "Overview", subtitle: "Workspace snapshot" },
  { id: "verify", label: "Bulk Verify", subtitle: "Upload + run checks" },
  { id: "jobs", label: "Jobs", subtitle: "Recent execution history" },
  { id: "credits", label: "Credits", subtitle: "Usage and ledger" },
  { id: "settings", label: "Settings", subtitle: "Account profile" }
];

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const MAX_PREVIEW_ROWS = 12;
const DASHBOARD_ACTIVE_TAB_KEY = "verifyflow:user-dashboard:active-tab";
const DASHBOARD_LAST_JOB_KEY = "verifyflow:user-dashboard:last-job-id";
const PADDLE_CHECKOUT_GROWTH_URL = process.env.NEXT_PUBLIC_PADDLE_CHECKOUT_GROWTH_URL ?? "#pricing";
const PADDLE_CUSTOMER_PORTAL_URL =
  process.env.NEXT_PUBLIC_PADDLE_CUSTOMER_PORTAL_URL ?? PADDLE_CHECKOUT_GROWTH_URL;
const DASHBOARD_CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#2fd6a1",
    colorTextOnPrimaryBackground: "#06130d",
    colorText: "#f2f2f2",
    colorTextSecondary: "#b8b3b0",
    colorBackground: "#0b0b0e",
    colorInputBackground: "#0b0b0e",
    colorInputText: "#f2f2f2",
    colorDanger: "#fb565b",
    colorNeutral: "#3d3a39",
    borderRadius: "0.65rem"
  },
  elements: {
    userButtonTrigger: "vf-clerk-user-trigger",
    userButtonAvatarBox: "vf-clerk-user-avatar-box",
    userButtonPopoverRootBox: "vf-clerk-popover-root",
    userButtonPopoverCard: "vf-clerk-popover-card",
    userButtonPopoverMain: "vf-clerk-popover-main",
    userButtonPopoverActions: "vf-clerk-popover-actions",
    userButtonPopoverActionButton: "vf-clerk-popover-action",
    userButtonPopoverActionButtonIconBox: "vf-clerk-popover-action-icon-box",
    userButtonPopoverActionButtonIcon: "vf-clerk-popover-action-icon",
    userButtonPopoverFooter: "vf-clerk-popover-footer",
    userPreviewMainIdentifier: "vf-clerk-popover-main-id",
    userPreviewSecondaryIdentifier: "vf-clerk-popover-secondary-id",
    modalBackdrop: "vf-clerk-modal-backdrop",
    modalContent: "vf-clerk-modal-content",
    cardBox: "vf-clerk-profile-card-box",
    card: "vf-clerk-profile-card",
    pageScrollBox: "vf-clerk-profile-scroll",
    page: "vf-clerk-profile-page",
    navbar: "vf-clerk-profile-navbar",
    navbarButtons: "vf-clerk-profile-navbar-buttons",
    navbarButton: "vf-clerk-profile-navbar-button",
    profileSection: "vf-clerk-profile-section",
    profileSectionTitleText: "vf-clerk-profile-section-title",
    profileSectionSubtitleText: "vf-clerk-profile-section-subtitle",
    profileSectionPrimaryButton: "vf-clerk-primary",
    formButtonPrimary: "vf-clerk-primary",
    formFieldInput: "vf-clerk-input",
    formFieldLabel: "vf-clerk-label",
    formFieldAction: "vf-clerk-link",
    footerActionLink: "vf-clerk-link",
    badge: "vf-clerk-badge",
    menuList: "vf-clerk-menu-list",
    menuItem: "vf-clerk-menu-item",
    selectOptionsContainer: "vf-clerk-select-options",
    selectOption: "vf-clerk-select-option"
  }
} as const;

function extractEmail(value: string): string | null {
  const match = value.match(EMAIL_PATTERN);
  return match ? match[0].trim().toLowerCase() : null;
}

function toCellString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function looksLikeHeader(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized.includes("email") || normalized.includes("e-mail") || normalized.includes("mail");
}

function getStatusClass(status: BulkResult["status"]) {
  if (status === "safe") return "vf-status vf-status-safe";
  if (status === "risky") return "vf-status vf-status-risky";
  if (status === "invalid") return "vf-status vf-status-invalid";
  return "vf-status vf-status-unknown";
}

function getJobStatusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "vf-status vf-status-safe";
  if (normalized === "failed") return "vf-status vf-status-invalid";
  if (normalized === "queued") return "vf-status vf-status-unknown";
  if (normalized === "processing") return "vf-status vf-status-risky";
  return "vf-status vf-status-unknown";
}

function parseSheet(fileName: string, workbook: XLSX.WorkBook): {
  fileName: string;
  columns: ParsedColumn[];
  selectedColumnId: string | null;
  dataRowCount: number;
} {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No worksheet found in file.");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: ""
  });

  if (matrix.length === 0) {
    throw new Error("Uploaded file is empty.");
  }

  const normalized = matrix.map((row) => row.map(toCellString));
  const firstRow = normalized[0] ?? [];
  const hasHeader = firstRow.some((cell) => looksLikeHeader(cell));
  const dataStart = hasHeader ? 1 : 0;
  const dataRows = normalized.slice(dataStart);

  if (dataRows.length === 0) {
    throw new Error("No data rows found after header.");
  }

  const maxCols = normalized.reduce((max, row) => Math.max(max, row.length), 0);
  const columns: ParsedColumn[] = [];

  for (let colIndex = 0; colIndex < maxCols; colIndex += 1) {
    const headerLabel = hasHeader ? firstRow[colIndex] : "";
    const label = headerLabel && headerLabel.length > 0 ? headerLabel : `Column ${colIndex + 1}`;

    const rows: ParsedEmailRow[] = [];

    dataRows.forEach((row, rowOffset) => {
      const rawValue = row[colIndex] ?? "";
      if (!rawValue) return;

      const email = extractEmail(rawValue);
      if (!email) return;

      rows.push({
        rowNumber: rowOffset + dataStart + 1,
        rawValue,
        email
      });
    });

    if (rows.length > 0) {
      columns.push({
        id: `col-${colIndex}`,
        label,
        hitRate: rows.length / dataRows.length,
        rowCount: rows.length,
        rows
      });
    }
  }

  const sortedColumns = columns.sort((a, b) => {
    if (b.rowCount !== a.rowCount) return b.rowCount - a.rowCount;
    return b.hitRate - a.hitRate;
  });

  return {
    fileName,
    columns: sortedColumns,
    selectedColumnId: sortedColumns[0]?.id ?? null,
    dataRowCount: dataRows.length
  };
}

function formatWhen(value: string): string {
  return new Date(value).toLocaleString();
}

type ExportRow = {
  rowNumber: number | "";
  rawValue: string;
  email: string;
  status: BulkResult["status"];
  reason: string;
};

type JobsExportRow = {
  jobId: string;
  sourceFileName: string;
  sourceColumn: string;
  totalEmails: number;
  creditsUsed: number;
  status: string;
  safeCount: number;
  riskyCount: number;
  invalidCount: number;
  unknownCount: number;
  createdAt: string;
};

function buildExportRows(jobData: JobResponse): ExportRow[] {
  return jobData.results.map((item) => ({
    rowNumber: item.rowNumber ?? "",
    rawValue: item.rawValue ?? "",
    email: item.email,
    status: item.status,
    reason: getResultReason(item)
  }));
}

function getResultReason(item: BulkResult): string {
  if (item.reasonMessage && item.reasonMessage.trim().length > 0) {
    return item.reasonMessage;
  }

  if (item.error && item.error.trim().length > 0) {
    return item.error;
  }

  if (item.status === "safe") return "Mailbox is reachable.";
  if (item.status === "risky") return "Deliverability is uncertain. Review before send.";
  if (item.status === "invalid") return "Mailbox is not deliverable.";
  return "Unable to verify confidently at this time.";
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeCsv(value: string | number): string {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function triggerBrowserDownload(fileName: string, mimeType: string, content: BlobPart) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function UserDashboardClient() {
  const [activeTab, setActiveTab] = useState<UserTab>("overview");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [fileName, setFileName] = useState<string>("");
  const [dataRowCount, setDataRowCount] = useState(0);
  const [columns, setColumns] = useState<ParsedColumn[]>([]);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<JobResponse | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isPollingJob, setIsPollingJob] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallUpgradeUrl, setPaywallUpgradeUrl] = useState(PADDLE_CHECKOUT_GROWTH_URL);
  const [exportBusy, setExportBusy] = useState<"csv" | "xlsx" | null>(null);
  const [jobsExportBusy, setJobsExportBusy] = useState<"csv" | "xlsx" | null>(null);
  const availableCredits = snapshot?.account.credits ?? 0;
  const isOutOfCredits = !loadingSnapshot && availableCredits <= 0;

  function setActiveTabPersist(tab: UserTab) {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DASHBOARD_ACTIVE_TAB_KEY, tab);
    }
  }

  const persistLastJobId = useCallback((jobId: string | null) => {
    if (typeof window === "undefined") return;
    if (!jobId) {
      window.sessionStorage.removeItem(DASHBOARD_LAST_JOB_KEY);
      return;
    }
    window.sessionStorage.setItem(DASHBOARD_LAST_JOB_KEY, jobId);
  }, []);

  const loadSnapshot = useCallback(async () => {
    setLoadingSnapshot(true);
    setSnapshotError(null);

    try {
      const response = await fetch("/api/user/me", { cache: "no-store" });
      const payload = (await response.json()) as DashboardSnapshot | { error: string };

      if (!response.ok) {
        const message = "error" in payload ? payload.error : "Unable to load dashboard.";
        setSnapshotError(message);
        return;
      }

      setSnapshot(payload as DashboardSnapshot);
    } catch {
      setSnapshotError("Unable to load dashboard data.");
    } finally {
      setLoadingSnapshot(false);
    }
  }, []);

  const loadJob = useCallback(async (jobId: string): Promise<JobResponse | null> => {
    const response = await fetch(`/api/user/jobs/${jobId}`, { cache: "no-store" });
    const payload = (await response.json()) as JobResponse | { error: string };

    if (!response.ok) {
      const message = "error" in payload ? payload.error : "Unable to load job details.";
      throw new Error(message);
    }

    return payload as JobResponse;
  }, []);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(DASHBOARD_ACTIVE_TAB_KEY);
    if (stored && USER_TABS.some((tab) => tab.id === stored)) {
      setActiveTab(stored as UserTab);
    }

    const lastJobId = window.sessionStorage.getItem(DASHBOARD_LAST_JOB_KEY);
    if (lastJobId && lastJobId.trim().length > 0) {
      setActiveJobId(lastJobId.trim());
      setJobLoading(true);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!activeJobId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pollJob = async () => {
      setIsPollingJob(true);

      try {
        const nextJob = await loadJob(activeJobId);
        if (!nextJob || cancelled) return;

        setJobData(nextJob);
        setJobError(null);

        const status = nextJob.job.status.toLowerCase();
        const isDone = status === "completed" || status === "failed";

        if (isDone) {
          setJobLoading(false);
          setIsPollingJob(false);
          setActiveJobId(null);
          await loadSnapshot();
          return;
        }
      } catch (error) {
        if (cancelled) return;
        setJobLoading(false);
        setIsPollingJob(false);
        setActiveJobId(null);
        setJobError(error instanceof Error ? error.message : "Unable to load job details.");
        persistLastJobId(null);
        return;
      }

      if (!cancelled) {
        timer = setTimeout(() => {
          void pollJob();
        }, 1200);
      }
    };

    void pollJob();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeJobId, loadJob, loadSnapshot, persistLastJobId]);

  useEffect(() => {
    if (isOutOfCredits) {
      setShowPaywallModal(true);
    }
  }, [isOutOfCredits]);

  const selectedColumn = useMemo(
    () => columns.find((column) => column.id === selectedColumnId) ?? null,
    [columns, selectedColumnId]
  );
  const orderedResults = useMemo(() => {
    if (!jobData) return [];

    return [...jobData.results].sort((a, b) => {
      if (a.rowNumber === null && b.rowNumber === null) {
        return a.email.localeCompare(b.email);
      }
      if (a.rowNumber === null) return 1;
      if (b.rowNumber === null) return -1;
      if (a.rowNumber !== b.rowNumber) return a.rowNumber - b.rowNumber;
      return a.email.localeCompare(b.email);
    });
  }, [jobData]);

  const selectedTabMeta = useMemo(() => USER_TABS.find((tab) => tab.id === activeTab) ?? USER_TABS[0], [activeTab]);

  function openPaywall(url?: string | null) {
    setPaywallUpgradeUrl(url && url.trim().length > 0 ? url : PADDLE_CHECKOUT_GROWTH_URL);
    setShowPaywallModal(true);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setParseError(null);
    setJobError(null);
    setJobData(null);
    setJobLoading(false);
    setIsPollingJob(false);
    setActiveJobId(null);
    persistLastJobId(null);
    setColumns([]);
    setSelectedColumnId(null);
    setDataRowCount(0);

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const parsed = parseSheet(file.name, workbook);

      setFileName(parsed.fileName);
      setColumns(parsed.columns);
      setSelectedColumnId(parsed.selectedColumnId);
      setDataRowCount(parsed.dataRowCount);
      setActiveTabPersist("verify");

      if (!parsed.selectedColumnId) {
        setParseError("No email column detected. Make sure at least one column contains valid emails.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse file.";
      setParseError(message);
    }
  }

  async function handleVerify() {
    if (isOutOfCredits) {
      setJobError("You are out of credits. Upgrade your plan to continue verification.");
      openPaywall();
      return;
    }

    if (!selectedColumn) {
      setJobError("Select a detected email column before running verification.");
      return;
    }

    if (selectedColumn.rows.length === 0) {
      setJobError("No valid emails were found in the selected column.");
      return;
    }

    setJobLoading(true);
    setIsPollingJob(false);
    setJobError(null);
    setJobData(null);
    setActiveJobId(null);

    try {
      const idempotencyKey = createIdempotencyKey();
      const response = await fetch("/api/user/bulk-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyKey
        },
        body: JSON.stringify({
          sourceFileName: fileName,
          sourceColumn: selectedColumn.label,
          idempotencyKey,
          rows: selectedColumn.rows
        })
      });

      const payload = (await response.json()) as BulkSubmitResponse | ApiErrorPayload;

      if (!response.ok) {
        const message = "error" in payload ? payload.error : "Bulk verification failed.";
        setJobError(message);
        if (response.status === 402) {
          openPaywall("upgradeUrl" in payload ? payload.upgradeUrl : undefined);
          await loadSnapshot();
        }
        setJobLoading(false);
        return;
      }

      const submit = payload as BulkSubmitResponse;
      const now = new Date().toISOString();
      const nextJobId = submit.job.id;

      setJobData({
        job: {
          id: submit.job.id,
          status: submit.job.status,
          totalRows: submit.job.totalRows,
          totalEmails: submit.job.totalEmails,
          creditsUsed: submit.job.creditsUsed,
          safeCount: 0,
          riskyCount: 0,
          invalidCount: 0,
          unknownCount: 0,
          createdAt: now
        },
        remainingCredits: submit.remainingCredits,
        results: []
      });
      persistLastJobId(nextJobId);
      setActiveJobId(nextJobId);
      setIsPollingJob(true);
      setActiveTabPersist("verify");
      await loadSnapshot();
    } catch {
      setJobError("Unable to verify emails right now.");
      setJobLoading(false);
    }
  }

  function exportJobResults(format: "csv" | "xlsx") {
    if (!jobData) return;

    setExportBusy(format);

    try {
      const rows = buildExportRows(jobData);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const base = `verifyflow-job-${jobData.job.id}-${stamp}`;

      if (format === "csv") {
        const header = ["rowNumber", "rawValue", "email", "status", "reason"];
        const body = rows.map((row) =>
          [row.rowNumber, row.rawValue, row.email, row.status, row.reason].map(escapeCsv).join(",")
        );
        const csv = [header.join(","), ...body].join("\n");

        triggerBrowserDownload(`${base}.csv`, "text/csv;charset=utf-8", `\uFEFF${csv}`);
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "results");
      XLSX.writeFile(workbook, `${base}.xlsx`);
    } finally {
      setExportBusy(null);
    }
  }

  function exportRecentJobs(format: "csv" | "xlsx") {
    if (!snapshot?.recentJobs.length) return;

    setJobsExportBusy(format);

    try {
      const rows: JobsExportRow[] = snapshot.recentJobs.map((job) => ({
        jobId: job.id,
        sourceFileName: job.sourceFileName ?? "Manual run",
        sourceColumn: job.sourceColumn ?? "",
        totalEmails: job.totalEmails,
        creditsUsed: job.creditsUsed,
        status: job.status,
        safeCount: job.safeCount,
        riskyCount: job.riskyCount,
        invalidCount: job.invalidCount,
        unknownCount: job.unknownCount,
        createdAt: job.createdAt
      }));

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const base = `verifyflow-jobs-last-5-${stamp}`;

      if (format === "csv") {
        const header = [
          "jobId",
          "sourceFileName",
          "sourceColumn",
          "totalEmails",
          "creditsUsed",
          "status",
          "safeCount",
          "riskyCount",
          "invalidCount",
          "unknownCount",
          "createdAt"
        ];
        const body = rows.map((row) =>
          [
            row.jobId,
            row.sourceFileName,
            row.sourceColumn,
            row.totalEmails,
            row.creditsUsed,
            row.status,
            row.safeCount,
            row.riskyCount,
            row.invalidCount,
            row.unknownCount,
            row.createdAt
          ]
            .map(escapeCsv)
            .join(",")
        );
        const csv = [header.join(","), ...body].join("\n");
        triggerBrowserDownload(`${base}.csv`, "text/csv;charset=utf-8", `\uFEFF${csv}`);
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "jobs");
      XLSX.writeFile(workbook, `${base}.xlsx`);
    } finally {
      setJobsExportBusy(null);
    }
  }

  return (
    <main className="vf-app-shell">
      <div className="vf-app-grid">
        <aside className="vf-app-sidebar">
          <a className="vf-logo vf-app-logo" href="/">
            <span className="vf-logo-bolt">v</span>
            <span>verifyflow</span>
          </a>

          <div className="vf-app-sidebar-head">
            <p>Workspace</p>
            <span>User Console</span>
          </div>

          <nav className="vf-app-nav">
            {USER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`vf-app-nav-item ${activeTab === tab.id ? "vf-app-nav-item-active" : ""}`}
                onClick={() => setActiveTabPersist(tab.id)}
              >
                <strong>{tab.label}</strong>
                <span>{tab.subtitle}</span>
              </button>
            ))}
          </nav>

          <div className="vf-app-side-metric">
            <p>Available Credits</p>
            <strong>{snapshot?.account.credits ?? "--"}</strong>
            <span>100 trial credits included</span>
            <a className="vf-btn vf-btn-primary vf-dashboard-upgrade" href={PADDLE_CHECKOUT_GROWTH_URL} target="_blank" rel="noreferrer">
              Upgrade via Paddle
            </a>
          </div>
        </aside>

        <section className="vf-app-main">
          <header className="vf-app-main-head">
            <div>
              <p>{selectedTabMeta.label}</p>
              <h1>{selectedTabMeta.subtitle}</h1>
            </div>
            <div className="vf-app-head-actions">
              <a href="/" className="vf-btn vf-btn-ghost">
                Landing
              </a>
              <UserButton
                afterSignOutUrl="/"
                appearance={DASHBOARD_CLERK_APPEARANCE}
                userProfileMode="modal"
                userProfileProps={{ appearance: DASHBOARD_CLERK_APPEARANCE }}
              />
            </div>
          </header>

          <div className="vf-app-tabstrip" role="tablist" aria-label="User dashboard tabs">
            {USER_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={activeTab === tab.id}
                className={`vf-app-tab ${activeTab === tab.id ? "vf-app-tab-active" : ""}`}
                onClick={() => setActiveTabPersist(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loadingSnapshot ? <p className="vf-dashboard-message">Loading workspace...</p> : null}
          {snapshotError ? <p className="vf-error">{snapshotError}</p> : null}

          {activeTab === "overview" && (
            <section className="vf-app-panel-stack">
              <div className="vf-app-kpi-grid">
                <article>
                  <p>Credits</p>
                  <h3>{snapshot?.account.credits ?? 0}</h3>
                  <span>Ready for verification jobs</span>
                </article>
                <article>
                  <p>Plan</p>
                  <h3>{snapshot?.account.subscription?.plan ?? "trial"}</h3>
                  <span>Status {snapshot?.account.subscription?.status ?? "TRIAL"}</span>
                </article>
                <article>
                  <p>Recent jobs</p>
                  <h3>{snapshot?.recentJobs.length ?? 0}</h3>
                  <span>Latest run history</span>
                </article>
                <article>
                  <p>Account email</p>
                  <h3>{snapshot?.account.email ?? "-"}</h3>
                  <span>Workspace identity</span>
                </article>
              </div>

              <article className="vf-app-card">
                <div className="vf-card-topline">
                  <span>Quick Start</span>
                  <em>Bulk pipeline</em>
                </div>
                <div className="vf-app-card-body">
                  <div className="vf-app-checklist">
                    <div>
                      <strong>1. Upload file</strong>
                      <span>Import XLS/XLSX/CSV and auto-detect email columns.</span>
                    </div>
                    <div>
                      <strong>2. Verify in bulk</strong>
                      <span>Run verification against selected email column.</span>
                    </div>
                    <div>
                      <strong>3. Review outcomes</strong>
                      <span>Track safe, risky, invalid, and unknown results by job.</span>
                    </div>
                  </div>
                  <button className="vf-btn vf-btn-primary" type="button" onClick={() => setActiveTabPersist("verify")}>
                    Go to Bulk Verify
                  </button>
                </div>
              </article>
            </section>
          )}

          {activeTab === "verify" && (
            <section className="vf-app-two-col">
              {isOutOfCredits ? (
                <article className="vf-app-card vf-paywall-inline">
                  <div className="vf-card-topline">
                    <span>Credits exhausted</span>
                    <em>Hard paywall active</em>
                  </div>
                  <div className="vf-app-card-body">
                    <p>
                      You are out of credits. Verification is locked until you upgrade your subscription.
                    </p>
                    <div className="vf-dashboard-export-actions">
                      <a className="vf-btn vf-btn-primary" href={PADDLE_CHECKOUT_GROWTH_URL} target="_blank" rel="noreferrer">
                        Upgrade with Paddle
                      </a>
                      <a className="vf-btn vf-btn-ghost" href={PADDLE_CUSTOMER_PORTAL_URL} target="_blank" rel="noreferrer">
                        Manage billing
                      </a>
                    </div>
                  </div>
                </article>
              ) : null}
              <article className="vf-app-card">
                <div className="vf-card-topline">
                  <span>Upload</span>
                  <em>Auto-detect email column</em>
                </div>
                <div className="vf-app-card-body">
                  <label className="vf-upload-box" htmlFor="bulk-upload">
                    <strong>Import spreadsheet</strong>
                    <span>Supported formats: .xls .xlsx .csv</span>
                    <input
                      id="bulk-upload"
                      type="file"
                      accept=".xls,.xlsx,.csv"
                      onChange={handleFileChange}
                      disabled={jobLoading || isOutOfCredits}
                    />
                  </label>

                  {fileName ? (
                    <div className="vf-upload-meta">
                      <p>{fileName}</p>
                      <span>{dataRowCount} data rows detected</span>
                    </div>
                  ) : null}

                  {parseError ? <p className="vf-error">{parseError}</p> : null}

                  {columns.length > 0 ? (
                    <div className="vf-column-picker">
                      <label htmlFor="email-column">Detected email columns</label>
                      <select
                        id="email-column"
                        value={selectedColumnId ?? ""}
                        onChange={(event) => setSelectedColumnId(event.target.value)}
                        disabled={jobLoading || isOutOfCredits}
                      >
                        {columns.map((column) => (
                          <option key={column.id} value={column.id}>
                            {column.label} ({column.rowCount})
                          </option>
                        ))}
                      </select>
                      <span>Top column selected by hit-rate. Switch if needed.</span>
                    </div>
                  ) : null}

                  {selectedColumn ? (
                    <>
                      <div className="vf-preview-list">
                        {selectedColumn.rows.slice(0, MAX_PREVIEW_ROWS).map((row) => (
                          <div key={`${row.rowNumber}-${row.email}`}>
                            <p>Row {row.rowNumber}</p>
                            <span>{row.email}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        className="vf-btn vf-btn-primary"
                        type="button"
                        disabled={jobLoading || isOutOfCredits}
                        onClick={handleVerify}
                      >
                        {isOutOfCredits
                          ? "Out of credits"
                          : jobLoading
                            ? "Running verification..."
                            : `Verify ${selectedColumn.rows.length} Emails`}
                      </button>
                    </>
                  ) : null}

                  {jobError ? <p className="vf-error">{jobError}</p> : null}
                </div>
              </article>

              <article className="vf-app-card">
                <div className="vf-card-topline">
                  <span>Live Output</span>
                  <em>Result stream</em>
                </div>
                <div className="vf-app-card-body">
                  {!jobData ? <p className="vf-dashboard-message">Run a job to view verification output.</p> : null}
                  {jobData ? (
                    <>
                      <div className="vf-dashboard-job-summary">
                        <div>
                          <p>Job</p>
                          <span>{jobData.job.id}</span>
                        </div>
                        <div>
                          <p>Status</p>
                          <span className={getJobStatusClass(jobData.job.status)}>{jobData.job.status.toLowerCase()}</span>
                        </div>
                        <div>
                          <p>Credits used</p>
                          <span>{jobData.job.creditsUsed}</span>
                        </div>
                        <div>
                          <p>Credits left</p>
                          <span>{jobData.remainingCredits}</span>
                        </div>
                        <div>
                          <p>Distribution</p>
                          <span>
                            {jobData.job.safeCount}/{jobData.job.riskyCount}/{jobData.job.invalidCount}/{jobData.job.unknownCount}
                          </span>
                        </div>
                      </div>

                      {jobData.job.status.toLowerCase() === "queued" || jobData.job.status.toLowerCase() === "processing" ? (
                        <p className="vf-dashboard-message">
                          {isPollingJob
                            ? "Verification is running. This panel auto-refreshes until completion."
                            : "Verification is queued. Refreshing status..."}
                        </p>
                      ) : null}

                      {orderedResults.length > 0 ? (
                        <>
                          <div className="vf-dashboard-result-table-wrap">
                            <table className="vf-dashboard-result-table">
                              <thead>
                                <tr>
                                  <th scope="col">Row</th>
                                  <th scope="col">Email</th>
                                  <th scope="col">Status</th>
                                  <th scope="col">Reason</th>
                                </tr>
                              </thead>
                              <tbody>
                                {orderedResults.slice(0, 200).map((result) => (
                                  <tr key={`${result.rowNumber ?? "na"}-${result.email}-${result.rawValue ?? ""}`}>
                                    <td>{result.rowNumber ?? "-"}</td>
                                    <td>{result.email}</td>
                                    <td>
                                      <span className={getStatusClass(result.status)}>{result.status}</span>
                                    </td>
                                    <td>{getResultReason(result)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {orderedResults.length > 200 ? (
                            <p className="vf-dashboard-message">
                              Showing first 200 rows. Export CSV/XLSX for full results.
                            </p>
                          ) : null}

                          <div className="vf-dashboard-export-actions">
                            <button
                              className="vf-btn vf-btn-ghost"
                              type="button"
                              onClick={() => exportJobResults("csv")}
                              disabled={exportBusy !== null}
                            >
                              {exportBusy === "csv" ? "Preparing CSV..." : "Download CSV"}
                            </button>
                            <button
                              className="vf-btn vf-btn-primary"
                              type="button"
                              onClick={() => exportJobResults("xlsx")}
                              disabled={exportBusy !== null}
                            >
                              {exportBusy === "xlsx" ? "Preparing XLSX..." : "Download XLSX"}
                            </button>
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </article>
            </section>
          )}

          {activeTab === "jobs" && (
            <section className="vf-app-panel-stack">
              <article className="vf-app-card">
                <div className="vf-card-topline">
                  <span>Jobs</span>
                  <em>Latest 5</em>
                </div>
                <div className="vf-app-card-body">
                  {snapshot?.recentJobs.length ? (
                    <div className="vf-dashboard-export-actions">
                      <button
                        className="vf-btn vf-btn-ghost"
                        type="button"
                        onClick={() => exportRecentJobs("csv")}
                        disabled={jobsExportBusy !== null}
                      >
                        {jobsExportBusy === "csv" ? "Preparing CSV..." : "Export Last 5 (CSV)"}
                      </button>
                      <button
                        className="vf-btn vf-btn-primary"
                        type="button"
                        onClick={() => exportRecentJobs("xlsx")}
                        disabled={jobsExportBusy !== null}
                      >
                        {jobsExportBusy === "xlsx" ? "Preparing XLSX..." : "Export Last 5 (XLSX)"}
                      </button>
                    </div>
                  ) : null}
                  {snapshot?.recentJobs.length ? (
                    <div className="vf-dashboard-jobs-table-wrap">
                      <table className="vf-dashboard-jobs-table">
                        <thead>
                          <tr>
                            <th scope="col">File</th>
                            <th scope="col">Emails</th>
                            <th scope="col">Credits</th>
                            <th scope="col">Status</th>
                            <th scope="col">Distribution</th>
                            <th scope="col">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshot.recentJobs.map((job) => (
                            <tr key={job.id}>
                              <td>{job.sourceFileName ?? "Manual run"}</td>
                              <td>{job.totalEmails}</td>
                              <td>{job.creditsUsed}</td>
                              <td>
                                <span className={getJobStatusClass(job.status)}>{job.status.toLowerCase()}</span>
                              </td>
                              <td>
                                {job.safeCount}/{job.riskyCount}/{job.invalidCount}/{job.unknownCount}
                              </td>
                              <td>{formatWhen(job.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="vf-dashboard-message">No verification jobs yet.</p>
                  )}
                </div>
              </article>
            </section>
          )}

          {activeTab === "credits" && (
            <section className="vf-app-panel-stack">
              <article className="vf-app-card">
                <div className="vf-card-topline">
                  <span>Credit Ledger</span>
                  <em>Latest 10 entries</em>
                </div>
                <div className="vf-app-card-body">
                  <div className="vf-dashboard-export-actions">
                    <a className="vf-btn vf-btn-primary" href={PADDLE_CHECKOUT_GROWTH_URL} target="_blank" rel="noreferrer">
                      Upgrade with Paddle
                    </a>
                    <a className="vf-btn vf-btn-ghost" href={PADDLE_CUSTOMER_PORTAL_URL} target="_blank" rel="noreferrer">
                      Manage billing
                    </a>
                  </div>
                  {snapshot?.recentLedger.length ? (
                    <div className="vf-dashboard-log-list">
                      {snapshot.recentLedger.map((entry) => (
                        <div key={entry.id}>
                          <p>
                            {entry.reason} ({entry.entryType})
                          </p>
                          <span>
                            {entry.amount > 0 ? `+${entry.amount}` : entry.amount} | balance {entry.balanceAfter} | {formatWhen(entry.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="vf-dashboard-message">No credit ledger entries yet.</p>
                  )}
                </div>
              </article>
            </section>
          )}

          {activeTab === "settings" && (
            <section className="vf-app-panel-stack">
              <article className="vf-app-card">
                <div className="vf-card-topline">
                  <span>Profile</span>
                  <em>Account</em>
                </div>
                <div className="vf-app-card-body">
                  <div className="vf-dashboard-job-summary">
                    <div>
                      <p>Email</p>
                      <span>{snapshot?.account.email ?? "Not available"}</span>
                    </div>
                    <div>
                      <p>Plan</p>
                      <span>{snapshot?.account.subscription?.plan ?? "trial"}</span>
                    </div>
                    <div>
                      <p>Status</p>
                      <span>{snapshot?.account.subscription?.status ?? "TRIAL"}</span>
                    </div>
                    <div>
                      <p>Credits</p>
                      <span>{snapshot?.account.credits ?? 0}</span>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          )}
        </section>
      </div>
      {showPaywallModal ? (
        <div className="vf-paywall-modal" role="dialog" aria-modal="true" aria-labelledby="vf-paywall-title">
          <div className="vf-paywall-modal-card">
            <h2 id="vf-paywall-title">You are out of credits</h2>
            <p>
              Verification is disabled until you upgrade your subscription. Choose a plan to continue running single
              and bulk checks.
            </p>
            <div className="vf-dashboard-export-actions">
              <a className="vf-btn vf-btn-primary" href={paywallUpgradeUrl} target="_blank" rel="noreferrer">
                Upgrade with Paddle
              </a>
              <button className="vf-btn vf-btn-ghost" type="button" onClick={() => setShowPaywallModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
