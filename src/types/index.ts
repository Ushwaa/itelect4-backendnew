import type { Request } from 'express';
import type { Document, InferSchemaType } from 'mongoose';
import type { IUser } from '../models/User';
import type { ISubmission } from '../models/Submission';
import type { ICourse } from '../models/Course';

export type AuthRequest = Request & {
  userId?: string;
  user?: {
    id: string;
    email: string;
    username: string;
  };
};

export type UserSafe = {
  id: string;
  username: string;
  email: string;
};

export type UserDocument = Document & InferSchemaType<typeof import('../models/User').userSchema>;

export type SubmissionDocument = Document & InferSchemaType<typeof import('../models/Submission').submissionSchema>;

export type UserPayload = {
  id: string;
  email: string;
  username: string;
};

export type CourseDoc = Pick<ICourse, 'code' | 'title' | 'units' | 'semester'>;

export type SubmissionPayload = ISubmission;
