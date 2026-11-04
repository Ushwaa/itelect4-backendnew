import 'dotenv/config';
import { reviewProjectWithErrorHandling } from './ai/gemini';

async function main(): Promise<void> {
  const samplePrompt = `This project is a course submission tracker for ITELECT4 students. Students create accounts, log in, browse courses, and submit their GitHub repository link for each course. Instructors can review submissions, assign scores, and track progress. The system uses a Node.js backend with Express, MongoDB storage, JWT authentication, and a React frontend with protected routes and a dashboard. The goal is to provide a clean workflow for managing course work and student submissions in a single system.`;

  try {
    const result = await reviewProjectWithErrorHandling(samplePrompt);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Gemini error.';
    console.error('Gemini review failed:', message);
    process.exitCode = 1;
  }
}

main();
