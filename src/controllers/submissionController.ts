import type { Response } from 'express';
import mongoose from 'mongoose';
import { Submission } from '../models/Submission';
import type { AuthRequest } from '../types';

function isValidMongoId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function getSubmissions(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const submissions = await Submission.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Unable to fetch submissions.' });
  }
}

export async function getSubmissionById(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!isValidMongoId(id)) {
      res.status(400).json({ message: 'Invalid submission ID.' });
      return;
    }

    const submission = await Submission.findOne({ _id: id, ownerId: req.user.id });
    if (!submission) {
      res.status(404).json({ message: 'Submission not found.' });
      return;
    }

    res.status(200).json(submission);
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ message: 'Unable to fetch submission.' });
  }
}

export async function createSubmission(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const { courseCode, repoUrl } = req.body;

    if (typeof courseCode !== 'string' || courseCode.trim().length < 2) {
      res.status(400).json({ message: 'courseCode is required and must be at least 2 characters.' });
      return;
    }

    if (typeof repoUrl !== 'string' || !repoUrl.includes('github.com')) {
      res.status(400).json({ message: 'repoUrl must be a valid GitHub URL.' });
      return;
    }

    const submission = await Submission.create({
      ownerId: req.user.id,
      courseCode: courseCode.trim().toUpperCase(),
      repoUrl,
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ message: 'Unable to create submission.' });
  }
}

export async function updateSubmission(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!isValidMongoId(id)) {
      res.status(400).json({ message: 'Invalid submission ID.' });
      return;
    }

    const { courseCode, repoUrl, score, submittedAt } = req.body;

    if (courseCode !== undefined && (typeof courseCode !== 'string' || courseCode.trim().length < 2)) {
      res.status(400).json({ message: 'courseCode must be a string with at least 2 characters.' });
      return;
    }

    if (repoUrl !== undefined && (typeof repoUrl !== 'string' || !repoUrl.includes('github.com'))) {
      res.status(400).json({ message: 'repoUrl must be a valid GitHub URL.' });
      return;
    }

    if (score !== undefined && (typeof score !== 'number' || score < 0 || score > 100)) {
      res.status(400).json({ message: 'score must be a number between 0 and 100.' });
      return;
    }

    if (submittedAt !== undefined && Number.isNaN(new Date(submittedAt).getTime())) {
      res.status(400).json({ message: 'submittedAt must be a valid date string.' });
      return;
    }

    const updatedSubmission = await Submission.findOneAndUpdate(
      { _id: id, ownerId: req.user.id },
      {
        ...(courseCode !== undefined ? { courseCode: courseCode.trim().toUpperCase() } : {}),
        ...(repoUrl !== undefined ? { repoUrl } : {}),
        ...(score !== undefined ? { score } : {}),
        ...(submittedAt !== undefined ? { submittedAt: new Date(submittedAt) } : {}),
      },
      { new: true, runValidators: true }
    );

    if (!updatedSubmission) {
      res.status(404).json({ message: 'Submission not found.' });
      return;
    }

    res.status(200).json(updatedSubmission);
  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({ message: 'Unable to update submission.' });
  }
}

export async function deleteSubmission(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!isValidMongoId(id)) {
      res.status(400).json({ message: 'Invalid submission ID.' });
      return;
    }

    const submission = await Submission.findOneAndDelete({ _id: id, ownerId: req.user.id });
    if (!submission) {
      res.status(404).json({ message: 'Submission not found.' });
      return;
    }

    res.status(200).json({ message: 'Submission deleted successfully.' });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ message: 'Unable to delete submission.' });
  }
}
