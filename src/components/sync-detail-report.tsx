"use client";

import { useState } from 'react';
import { SyncHistoryEntry } from '@/types/cable-sync.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    XCircle,
    Clock,
    FileText,
    FilePlus,
    FileCheck,
    FileX,
    AlertCircle,
    Database,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SyncDetailReportProps {
    entry: SyncHistoryEntry | null;
    onClose?: () => void;
}

export function SyncDetailReport({ entry, onClose }: SyncDetailReportProps) {
    const [expandedCableFiles, setExpandedCableFiles] = useState(false);
    if (!entry) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sync Report</CardTitle>
                    <CardDescription>Select a sync run from history to view details</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const formatDateDetailed = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            const dateStr = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const timeStr = date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            return { dateStr, timeStr, fullDate: date };
        } catch {
            return { dateStr: timestamp, timeStr: '', fullDate: new Date() };
        }
    };

    const dateInfo = formatDateDetailed(entry.timestamp);

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
        <div className="space-y-4">
            {/* Header with highlighted date/time */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">

                            <div className="flex-1">
                                <div className="flex items-center gap-3 ">
                                    <CardTitle className="text-xl">Sync Run Report</CardTitle>
                                    <Badge
                                        variant={entry.status === 'success' ? 'default' : 'destructive'}
                                        className={`text-sm ${entry.status === 'success'
                                            ? 'bg-green-600 text-white hover:bg-green-700 border-transparent'
                                            : ''
                                            }`}
                                    >
                                        {entry.status === 'success' ? 'Success' : 'Failed'}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">

                                        <span>{dateInfo.dateStr}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground  px-3 py-2 rounded-md ">

                                        <span className="font-medium">{dateInfo.timeStr}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {onClose && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={onClose}
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardHeader>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm text-muted-foreground">Total Processed</div>
                        </div>
                        <div className="text-2xl font-bold">{entry.totalFilesProcessed}</div>
                        <div className="text-xs text-muted-foreground mt-1">files</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <FilePlus className="h-4 w-4 text-green-500" />
                            <div className="text-sm text-muted-foreground">New Files</div>
                        </div>
                        <div className="text-2xl font-bold text-green-600">{entry.newFilesAdded}</div>
                        <div className="text-xs text-muted-foreground mt-1">added</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <FileCheck className="h-4 w-4 text-blue-500" />
                            <div className="text-sm text-muted-foreground">Updated</div>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{entry.updatedFiles}</div>
                        <div className="text-xs text-muted-foreground mt-1">modified</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <FileX className="h-4 w-4 text-gray-500" />
                            <div className="text-sm text-muted-foreground">Skipped</div>
                        </div>
                        <div className="text-2xl font-bold text-gray-600">{entry.duplicatesSkipped}</div>
                        <div className="text-xs text-muted-foreground mt-1">unchanged</div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Sync Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <div className="text-sm text-muted-foreground">Total Cables</div>
                            <div className="text-xl font-semibold mt-1">{entry.stats.totalCables}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Fetched</div>
                            <div className="text-xl font-semibold text-green-600 mt-1">{entry.stats.fetched}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Failed</div>
                            <div className="text-xl font-semibold text-red-600 mt-1">{entry.stats.failed}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Duration</div>
                            <div className="text-xl font-semibold mt-1 flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatDuration(entry.stats.duration)}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Affected Cable Files */}
            {entry.affectedCableFiles.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Affected Cable Files
                        </CardTitle>
                        <CardDescription>
                            {entry.affectedCableFiles.length} cable file(s) were updated or created
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className={expandedCableFiles ? "max-h-[600px] overflow-y-auto" : "max-h-60 overflow-y-auto"}>
                            <div className="flex flex-wrap gap-2">
                                {(expandedCableFiles
                                    ? entry.affectedCableFiles
                                    : entry.affectedCableFiles.slice(0, 50)
                                ).map((cableId, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                        {cableId}
                                    </Badge>
                                ))}
                                {entry.affectedCableFiles.length > 50 && (
                                    <div
                                        className="flex items-center gap-2 cursor-pointer"
                                        onClick={() => setExpandedCableFiles(!expandedCableFiles)}
                                    >
                                        <Badge
                                            variant="outline"
                                            className="text-xs cursor-pointer hover:bg-accent transition-colors"
                                        >
                                            {expandedCableFiles
                                                ? `Show less`
                                                : `+${entry.affectedCableFiles.length - 50} more`
                                            }
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedCableFiles(!expandedCableFiles);
                                            }}
                                        >
                                            {expandedCableFiles ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error Details */}
            {entry.errorDetails && entry.errorDetails.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-lg text-red-800 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Error Details
                        </CardTitle>
                        <CardDescription className="text-red-700">
                            {entry.errorDetails.length} error(s) occurred during sync
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {entry.errorDetails.map((error, idx) => (
                                <div key={idx} className="p-3 bg-red-100 rounded border border-red-200">
                                    <div className="text-sm text-red-800 font-mono">{error}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* File Lists */}
            <div className="grid md:grid-cols-1 gap-4">
                {entry.newFiles && entry.newFiles.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <FilePlus className="h-4 w-4 text-green-500" />
                                New Files ({entry.newFiles.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {entry.newFiles.map((file, idx) => (
                                    <div key={idx} className="text-xs font-mono text-green-700 truncate">
                                        {file}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {entry.updatedFilesList && entry.updatedFilesList.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <FileCheck className="h-4 w-4 text-blue-500" />
                                Updated Files ({entry.updatedFilesList.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {entry.updatedFilesList.map((file, idx) => (
                                    <div key={idx} className="text-xs font-mono text-blue-700 truncate">
                                        {file}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {entry.skippedFiles && entry.skippedFiles.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <FileX className="h-4 w-4 text-gray-500" />
                                Skipped Files ({entry.skippedFiles.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {entry.skippedFiles.map((file, idx) => (
                                    <div key={idx} className="text-xs font-mono text-gray-600 truncate">
                                        {file}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

