import mongoose, { Document, Schema } from "mongoose";

export interface RfpDocument extends Document {
  fullName: string;
  company: string;
  email: string;
  phoneNumber: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const RfpSchema = new Schema<RfpDocument>(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [150, "Full name cannot exceed 150 characters"],
    },
    company: {
      type: String,
      required: [true, "Company is required"],
      trim: true,
      maxlength: [150, "Company cannot exceed 150 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: [255, "Email cannot exceed 255 characters"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      maxlength: [50, "Phone number cannot exceed 50 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search functionality
RfpSchema.index({ fullName: "text", company: "text", email: "text", message: "text" });

// Index for sorting by creation date
RfpSchema.index({ createdAt: -1 });

// Clean up existing model in development to avoid model recompilation errors
if (process.env.NODE_ENV === "development") {
  delete mongoose.models.Rfp;
}

const RfpModel = mongoose.models.Rfp || mongoose.model<RfpDocument>("Rfp", RfpSchema);

export default RfpModel;
