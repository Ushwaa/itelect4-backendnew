import { Schema, model, type Document } from 'mongoose';
import type { Types } from 'mongoose';

export interface ISubmission extends Document {
  ownerId: Types.ObjectId;
  courseCode: string;
  repoUrl: string;
  submittedAt: Date;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      select: false,
    },
    courseCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
    },
    repoUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => /^https?:\/\/.+/.test(value) && value.includes('github.com'),
        message: 'Repository URL must be a valid GitHub URL.',
      },
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Submission = model<ISubmission>('Submission', submissionSchema);

export { submissionSchema };
