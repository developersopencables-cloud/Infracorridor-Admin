"use client";

import { useState, useEffect } from 'react';
import { SyncHistoryEntry } from '@/types/cable-sync.types';
import { SyncHistoryStorage } from '@/lib/sync-history-storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    FilePlus,
    FileCheck,
    FileX,
    ChevronRight,
    ChevronDown,
    History as HistoryIcon
} from "lucide-react";

interface SyncHistorySidebarProps {
    onSelectEntry?: (entry: SyncHistoryEntry) => void;
    selectedEntryId?: string | null;
    onClose?: () => void;
}

export function SyncHistorySidebar({ onSelectEntry, selectedEntryId, onClose }: SyncHistorySidebarProps) {
    const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

    const loadHistory = async () => {
        const history = await SyncHistoryStorage.getAll();
        setHistory(history);
    };

    useEffect(() => {
        loadHistory();
        const interval = setInterval(loadHistory, 5000);
        return () => clearInterval(interval);
    }, []);



    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedEntries);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedEntries(newExpanded);
    };

    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            return date.toLocaleDateString();
        } catch {
            return new Date(timestamp).toLocaleString();
        }
    };

    if (history.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HistoryIcon className="h-5 w-5" />
                        Sync History
                    </CardTitle>
                    <CardDescription>No sync history yet</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HistoryIcon className="h-5 w-5" />
                        <CardTitle className="text-lg">Sync History</CardTitle>
                    </div>
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onClose}
                        >
                            <XCircle className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <CardDescription className="mt-2">{history.length} sync run(s)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="h-full overflow-y-auto px-4 pb-4">
                    <div className="space-y-3">
                        {history.map((entry) => {
                            const isExpanded = expandedEntries.has(entry.id);
                            const isSelected = selectedEntryId === entry.id;

                            return (
                                <div
                                    key={entry.id}
                                    className={`border rounded-lg p-3 transition-all cursor-pointer hover:bg-accent ${isSelected ? 'border-primary bg-accent' : ''
                                        }`}
                                    onClick={() => {
                                        toggleExpand(entry.id);
                                        onSelectEntry?.(entry);
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {entry.status === 'success' ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                                )}
                                                <Badge variant={entry.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                                                    {entry.status === 'success' ? 'Success' : 'Failed'}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatTimestamp(entry.timestamp)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {entry.totalFilesProcessed} files • {entry.stats.duration.toFixed(1)}s
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpand(entry.id);
                                            }}
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t space-y-2">
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <FilePlus className="h-3 w-3 text-green-500" />
                                                    <span className="text-muted-foreground">New:</span>
                                                    <span className="font-medium">{entry.newFilesAdded}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <FileCheck className="h-3 w-3 text-blue-500" />
                                                    <span className="text-muted-foreground">Updated:</span>
                                                    <span className="font-medium">{entry.updatedFiles}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <FileX className="h-3 w-3 text-gray-500" />
                                                    <span className="text-muted-foreground">Skipped:</span>
                                                    <span className="font-medium">{entry.duplicatesSkipped}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <FileText className="h-3 w-3 text-purple-500" />
                                                    <span className="text-muted-foreground">Cables:</span>
                                                    <span className="font-medium">{entry.affectedCableFiles.length}</span>
                                                </div>
                                            </div>
                                            {entry.errorDetails && entry.errorDetails.length > 0 && (
                                                <div className="text-xs text-red-600 mt-2">
                                                    {entry.errorDetails.length} error(s)
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

