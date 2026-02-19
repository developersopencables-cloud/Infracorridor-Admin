"use client";

import { useState } from 'react';
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/database/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    Download,
    GitCompare,
    Upload,
    Database,
    Cloud,
    Activity,
    AlertCircle,
    History
} from "lucide-react";
import { SyncHistorySidebar } from "@/components/sync-history-sidebar";
import { SyncDetailReport } from "@/components/sync-detail-report";
import { SyncHistoryStorage } from "@/lib/sync-history-storage";
import { SyncHistoryEntry } from "@/types/cable-sync.types";
import { SyncProgress } from "@/lib/sync-progress-store";
import { syncEndpoints } from "@/utils/endpoints";

export default function SyncCablesPage() {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [hasData, setHasData] = useState<boolean | null>(null);
    const [syncStats, setSyncStats] = useState<{
        totalCables: number;
        fetched: number;
        failed: number;
        uploaded: number;
        duration: number;
    } | null>(null);
    const [syncErrors, setSyncErrors] = useState<string[]>([]);
    const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<SyncHistoryEntry | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

    useEffect(() => {
        if (!isPending && !session?.user) {
            router.push("/login");
        }
    }, [session, isPending, router]);

    useEffect(() => {
        checkStatus();
    }, []);

    useEffect(() => {
        if (!syncing) {
            setSyncProgress(null);
            return;
        }

        let eventSource: EventSource | null = null;
        let fallbackInterval: NodeJS.Timeout | null = null;
        let useFallback = false;

        const pollProgress = async () => {
            try {
                const response = await fetch(syncEndpoints.getProgress());
                const data = await response.json();
                if (data.success && data.progress) {
                    setSyncProgress(data.progress);

                    if (data.progress.step === 'completed' || data.progress.step === 'error') {
                        if (fallbackInterval) {
                            clearInterval(fallbackInterval);
                            fallbackInterval = null;
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch progress (fallback):', error);
            }
        };

        try {
            eventSource = new EventSource('/api/sync-cables?stream=true');

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.success && data.progress) {
                        setSyncProgress(data.progress);

                        if (data.progress.step === 'completed' || data.progress.step === 'error') {
                            eventSource?.close();
                            eventSource = null;
                        }
                    }
                } catch (error) {
                    console.error('Failed to parse progress data:', error);
                }
            };

            eventSource.onerror = () => {
                console.warn('EventSource error, falling back to polling');

                if (!useFallback) {
                    useFallback = true;
                    eventSource?.close();
                    eventSource = null;

                    pollProgress();
                    fallbackInterval = setInterval(pollProgress, 1000);
                }
            };

            const connectionCheck = setTimeout(() => {
                if (eventSource && eventSource.readyState === EventSource.CONNECTING) {
                    console.warn('SSE connection taking too long, falling back to polling');
                    useFallback = true;
                    eventSource.close();
                    eventSource = null;
                    pollProgress();
                    fallbackInterval = setInterval(pollProgress, 1000);
                }
            }, 5000);

            return () => {
                clearTimeout(connectionCheck);
                if (eventSource) {
                    eventSource.close();
                    eventSource = null;
                }
                if (fallbackInterval) {
                    clearInterval(fallbackInterval);
                    fallbackInterval = null;
                }
            };
        } catch (error) {
            console.error('Failed to create EventSource, using polling fallback:', error);

            pollProgress();
            fallbackInterval = setInterval(pollProgress, 1000);

            return () => {
                if (fallbackInterval) {
                    clearInterval(fallbackInterval);
                    fallbackInterval = null;
                }
            };
        }
    }, [syncing]);

    const checkStatus = async () => {
        try {
            const response = await fetch(syncEndpoints.getStatus());
            const data = await response.json();

            if (data.success) {
                setHasData(data.hasData);
                setMessage(data.hasData ? 'Data is available in S3' : 'No data found in S3');
                setStatus(data.hasData ? 'success' : 'idle');
            } else {
                setMessage(`Error: ${data.error}`);
                setStatus('error');
            }
        } catch (error) {
            setMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setStatus('error');
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setMessage('Initializing sync process...');
        setStatus('idle');
        setSyncStats(null);
        setSyncErrors([]);

        try {
            const response = await fetch(syncEndpoints.start(), {
                method: 'POST',
            });

            const data = await response.json();

            const historyData = data.historyData || {
                totalFilesProcessed: 0,
                newFilesAdded: 0,
                updatedFilesCount: 0,
                duplicatesSkipped: 0,
                affectedCableFiles: [],
                newFiles: [],
                updatedFiles: [],
                skippedFiles: [],
            };

          
            let historyEntry: SyncHistoryEntry | null = null;
            if (data.historyId) {
                historyEntry = await SyncHistoryStorage.getById(data.historyId);
            }
            
          
            if (!historyEntry) {
                historyEntry = await SyncHistoryStorage.getLatest();
            }

          
            if (!historyEntry) {
                historyEntry = {
                    id: data.historyId || `sync-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    status: data.success ? 'success' : 'failed',
                    totalFilesProcessed: historyData.totalFilesProcessed,
                    newFilesAdded: historyData.newFilesAdded,
                    updatedFiles: historyData.updatedFilesCount || historyData.updatedFiles?.length || 0,
                    duplicatesSkipped: historyData.duplicatesSkipped,
                    affectedCableFiles: historyData.affectedCableFiles || [],
                    errorDetails: data.errors || [],
                    newFiles: historyData.newFiles || [],
                    updatedFilesList: historyData.updatedFiles || [],
                    skippedFiles: historyData.skippedFiles || [],
                    stats: data.stats || {
                        totalCables: 0,
                        fetched: 0,
                        failed: 0,
                        uploaded: 0,
                        skipped: 0,
                        duration: 0,
                    },
                };
            }

            setSelectedHistoryEntry(historyEntry);

            if (data.success) {
                const formatDuration = (seconds: number): string => {
                    if (seconds < 60) {
                        return `${seconds.toFixed(1)}s`;
                    }
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = Math.floor(seconds % 60);
                    if (minutes < 60) {
                        if (remainingSeconds === 0) {
                            return `${minutes}m`;
                        }
                        return `${minutes}m ${remainingSeconds}s`;
                    }
                    const hours = Math.floor(minutes / 60);
                    const remainingMinutes = minutes % 60;
                    if (remainingMinutes === 0) {
                        return `${hours}h`;
                    }
                    if (remainingSeconds === 0) {
                        return `${hours}h ${remainingMinutes}m`;
                    }
                    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
                };
                setMessage(`Sync completed successfully in ${formatDuration(data.stats.duration)}`);
                setStatus('success');
                setSyncStats(data.stats);
                setHasData(true);

                if (data.errors && data.errors.length > 0) {
                    setSyncErrors(data.errors);
                }
            } else {
                setMessage(`Sync failed: ${data.error || 'Unknown error'}`);
                setStatus('error');
            }
        } catch (error) {
            setMessage(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setStatus('error');
        } finally {
            setSyncing(false);
        }
    };

    if (isPending) {
        return (
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <div className="flex items-center justify-center h-screen">
                        <div className="text-muted-foreground">Loading...</div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    if (!session?.user) {
        return null;
    }

    const progressPercentage = syncProgress
        ? (syncProgress.currentStep / syncProgress.totalSteps) * 100
        : 0;

    const formatDuration = (seconds: number): string => {
        if (seconds < 60) {
            return `${seconds.toFixed(1)}s`;
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        if (minutes < 60) {
            if (remainingSeconds === 0) {
                return `${minutes}m`;
            }
            return `${minutes}m ${remainingSeconds}s`;
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (remainingMinutes === 0) {
            return `${hours}h`;
        }
        if (remainingSeconds === 0) {
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">
                                        Dashboard
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Sync Cables Data</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="flex flex-1 gap-6 p-6">
                    {/* Main Content */}
                    <div className="flex-1 space-y-6 min-w-0">
                        {/* Header Section */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Sync Cables Data</h1>
                                <p className="text-muted-foreground mt-1.5">
                                    Sync submarine cable data from submarinecablemap.com to AWS S3 storage
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setShowHistory(!showHistory)}
                                className="gap-2"
                            >
                                <History className="h-4 w-4" />
                                {showHistory ? 'Hide' : 'Show'} History
                            </Button>
                        </div>

                        {/* Status Overview Cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">S3 Storage Status</CardTitle>
                                    <Database className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        {hasData === null ? (
                                            <>
                                                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                                                <span className="text-sm text-muted-foreground">Not checked</span>
                                            </>
                                        ) : hasData ? (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                <span className="text-sm font-medium">Data Available</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                                <span className="text-sm font-medium">No Data Found</span>
                                            </>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={checkStatus}
                                        disabled={syncing}
                                        className="mt-3 h-8 text-xs"
                                    >
                                        Check Status
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    {syncStats ? (
                                        <>
                                            <div className="text-2xl font-bold">{formatDuration(syncStats.duration)}</div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {syncStats.fetched} cables processed
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No sync performed yet</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    {syncing ? (
                                        <>
                                            <Badge variant="default" className="gap-1.5">
                                                <RefreshCw className="h-3 w-3 animate-spin" />
                                                In Progress
                                            </Badge>
                                        </>
                                    ) : status === 'success' ? (
                                        <Badge variant="default" className="gap-1.5 bg-green-600">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Completed
                                        </Badge>
                                    ) : status === 'error' ? (
                                        <Badge variant="destructive" className="gap-1.5">
                                            <XCircle className="h-3 w-3" />
                                            Failed
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">Ready</Badge>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sync Control Card */}
                        <Card className="border-2">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl">Sync Cables Data</CardTitle>
                                        <CardDescription className="mt-1.5">
                                            Fetch latest cable data and upload to S3 storage
                                        </CardDescription>
                                    </div>
                                    <Cloud className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Button
                                    onClick={handleSync}
                                    disabled={syncing}
                                    size="lg"
                                    className="w-1/2 h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 border-none "
                                >
                                    {syncing ? (
                                        <>
                                            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                                            Syncing Cables Data...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="mr-2 h-5 w-5" />
                                            Sync Cables Data
                                        </>
                                    )}
                                </Button>

                                {/* Progress Section */}
                                {syncing && syncProgress && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium">Overall Progress</span>
                                                <span className="text-muted-foreground">
                                                    {Math.round(progressPercentage)}%
                                                </span>
                                            </div>
                                            <Progress value={progressPercentage} className="h-2.5" />
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            {/* Step 1: Fetch */}
                                            <div className={`relative flex items-start gap-4 p-4 rounded-lg border transition-all ${syncProgress.step === 'fetching'
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : syncProgress.currentStep > 1
                                                    ? 'border-green-500/50 bg-green-50/50'
                                                    : 'border-border bg-muted/30'
                                                }`}>
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${syncProgress.step === 'fetching'
                                                    ? 'bg-primary text-primary-foreground shadow-md'
                                                    : syncProgress.currentStep > 1
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {syncProgress.currentStep > 1 ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : syncProgress.step === 'fetching' ? (
                                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <Download className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-semibold text-sm">Fetch from Submarine</h4>
                                                        {syncProgress.currentStep > 1 && (
                                                            <Badge variant="secondary" className="text-xs">Complete</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {syncProgress.step === 'fetching' && syncProgress.details?.fetched && syncProgress.details?.total
                                                            ? `Fetching ${syncProgress.details.fetched} of ${syncProgress.details.total} cables...`
                                                            : syncProgress.step === 'fetching'
                                                                ? 'Fetching data from submarine cable map...'
                                                                : syncProgress.currentStep > 1
                                                                    ? 'Data fetched successfully'
                                                                    : 'Waiting to start...'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Step 2: Compare */}
                                            <div className={`relative flex items-start gap-4 p-4 rounded-lg border transition-all ${syncProgress.step === 'comparing'
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : syncProgress.currentStep > 2
                                                    ? 'border-green-500/50 bg-green-50/50'
                                                    : 'border-border bg-muted/30'
                                                }`}>
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${syncProgress.step === 'comparing'
                                                    ? 'bg-primary text-primary-foreground shadow-md'
                                                    : syncProgress.currentStep > 2
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {syncProgress.currentStep > 2 ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : syncProgress.step === 'comparing' ? (
                                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <GitCompare className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-semibold text-sm">Compare Data</h4>
                                                        {syncProgress.currentStep > 2 && (
                                                            <Badge variant="secondary" className="text-xs">Complete</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {syncProgress.step === 'comparing'
                                                            ? syncProgress.details?.total
                                                                ? `Comparing ${syncProgress.details.total} files with existing data...`
                                                                : 'Comparing data with existing files...'
                                                            : syncProgress.currentStep > 2
                                                                ? 'Comparison completed'
                                                                : 'Waiting to start...'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Step 3: Upload */}
                                            <div className={`relative flex items-start gap-4 p-4 rounded-lg border transition-all ${syncProgress.step === 'uploading'
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : syncProgress.step === 'completed'
                                                    ? 'border-green-500/50 bg-green-50/50'
                                                    : 'border-border bg-muted/30'
                                                }`}>
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${syncProgress.step === 'uploading'
                                                    ? 'bg-primary text-primary-foreground shadow-md'
                                                    : syncProgress.step === 'completed'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {syncProgress.step === 'completed' ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : syncProgress.step === 'uploading' ? (
                                                        <RefreshCw className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <Upload className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-semibold text-sm">Upload to S3</h4>
                                                        {syncProgress.step === 'completed' && (
                                                            <Badge variant="secondary" className="text-xs">Complete</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {syncProgress.step === 'uploading' && syncProgress.details?.uploaded && syncProgress.details?.total
                                                            ? `Uploading ${syncProgress.details.uploaded} of ${syncProgress.details.total} files...`
                                                            : syncProgress.step === 'uploading'
                                                                ? 'Uploading files to S3...'
                                                                : syncProgress.step === 'completed'
                                                                    ? 'Upload completed successfully'
                                                                    : 'Waiting to start...'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Status Message */}
                                {message && (
                                    <div className={`p-4 rounded-lg border flex items-start gap-3 ${status === 'success'
                                        ? 'bg-green-50/50 border-green-200 text-green-900'
                                        : status === 'error'
                                            ? 'bg-red-50/50 border-red-200 text-red-900'
                                            : 'bg-blue-50/50 border-blue-200 text-blue-900'
                                        }`}>
                                        {status === 'success' ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                        ) : status === 'error' ? (
                                            <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <Activity className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                        )}
                                        <p className="text-sm font-medium flex-1">{message}</p>
                                    </div>
                                )}

                                {/* Statistics */}
                                {syncStats && (
                                    <div className="pt-4 border-t space-y-4">
                                        <div>
                                            <h3 className="text-sm font-semibold mb-3">Sync Statistics</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground">Total Cables</p>
                                                    <p className="text-2xl font-bold">{syncStats.totalCables.toLocaleString()}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground">Fetched</p>
                                                    <p className="text-2xl font-bold text-green-600">{syncStats.fetched.toLocaleString()}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground">Failed</p>
                                                    <p className="text-2xl font-bold text-red-600">{syncStats.failed.toLocaleString()}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground">Uploaded</p>
                                                    <p className="text-2xl font-bold text-blue-600">{syncStats.uploaded.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                <span>Duration: {formatDuration(syncStats.duration)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Error Details */}
                                {syncStats && syncStats.failed > 0 && (
                                    <div className="pt-4 border-t">
                                        <Card className="border-amber-200 bg-amber-50/50">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                                                    <AlertCircle className="h-4 w-4" />
                                                    Failed Cables
                                                </CardTitle>
                                                <CardDescription className="text-amber-700">
                                                    {syncStats.failed} cable(s) failed to fetch
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-amber-800 mb-3">
                                                    This might be due to network timeouts, API rate limiting, or unavailable data.
                                                </p>
                                                {syncErrors.length > 0 && (
                                                    <div className="mt-3 p-3 bg-amber-100 rounded-md border border-amber-200">
                                                        <p className="text-xs font-semibold text-amber-900 mb-2">Error Details:</p>
                                                        <div className="text-xs text-amber-800 space-y-1 max-h-32 overflow-y-auto font-mono">
                                                            {syncErrors.slice(0, 3).map((error, idx) => (
                                                                <div key={idx}>{error}</div>
                                                            ))}
                                                            {syncErrors.length > 3 && (
                                                                <div className="text-amber-600 italic">
                                                                    ... and {syncErrors.length - 3} more error(s)
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Detailed Report */}
                        {selectedHistoryEntry && (
                            <div className="mt-6">
                                <SyncDetailReport
                                    entry={selectedHistoryEntry}
                                    onClose={() => setSelectedHistoryEntry(null)}
                                />
                            </div>
                        )}
                    </div>

                    {/* History Sidebar */}
                    {showHistory && (
                        <div className="w-80 flex-shrink-0">
                            <div className="sticky top-6">
                                <SyncHistorySidebar
                                    onSelectEntry={setSelectedHistoryEntry}
                                    selectedEntryId={selectedHistoryEntry?.id || null}
                                    onClose={() => setShowHistory(false)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
