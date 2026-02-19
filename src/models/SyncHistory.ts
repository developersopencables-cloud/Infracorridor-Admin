import mongoose, { Schema, Document, Types } from 'mongoose';
import { SyncHistoryEntry } from '@/types/cable-sync.types';

export interface SyncHistoryDocument extends SyncHistoryEntry, Document<Types.ObjectId> {
  _id: Types.ObjectId;
  userId: string;
}

const SyncHistorySchema = new Schema<SyncHistoryDocument>({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    timestamp: {
        type: String,
        required: true,
        index: true,
    },
    status: {
        type: String,
        required: true,
        index: true,
        enum: ['success', 'failed'],
    },
    totalFilesProcessed: {
        type: Number,
        required: true,
    },
    newFilesAdded: {
        type: Number,
        required: true,
    },
    updatedFiles: {
        type: Number,
        required: true,
    },
    duplicatesSkipped: {
        type: Number,
        required: true,
    },
    affectedCableFiles: {
        type: [String],
        required: true,
        default: [],
    },
    errorDetails: {
        type: [String],
        required: false,
        default: [],
    },
    newFiles: {
        type: [String],
        required: false,
        default: [],
    },
    updatedFilesList: {
        type: [String],
        required: false,
        default: [],
    },
    skippedFiles: {
        type: [String],
        required: false,
        default: [],
    },
    stats: {
        type: {
            totalCables: { type: Number, required: true },
            fetched: { type: Number, required: true },
            failed: { type: Number, required: true },
            uploaded: { type: Number, required: true },
            skipped: { type: Number, required: true },
            duration: { type: Number, required: true },
        },
        required: true,
    },
}, {
    timestamps: true,
    _id: true,
});


SyncHistorySchema.index({ userId: 1, timestamp: -1 }); 
SyncHistorySchema.index({ userId: 1, status: 1 }); 
SyncHistorySchema.index({ timestamp: -1 }); 

export const SyncHistoryModel = mongoose.models.SyncHistory || mongoose.model<SyncHistoryDocument>('SyncHistory', SyncHistorySchema);

