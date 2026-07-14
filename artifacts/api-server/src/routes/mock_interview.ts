import { Router } from "express";
import { db, mockInterviewSessionsTable, mockInterviewMessagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

// Simple AI responses based on track for demo
const aiResponses: Record<string, string[]> = {
  tot: [
    "Great answer! When training others, it's important to assess learner needs first. Can you tell me about a time you adapted your teaching style?",
    "Excellent point. Body language accounts for over 55% of communication. How do you handle participants who seem disengaged?",
    "That's a strong approach. What's your strategy for managing a difficult participant in a training session?",
  ],
  cybersecurity: [
    "Good understanding of the threat landscape. How would you respond to a detected SQL injection attempt in production?",
    "Solid answer. What are the key differences between IDS and IPS in a SOC environment?",
    "That's correct. Can you walk me through your incident response process for a ransomware attack?",
  ],
  fullstack: [
    "Good explanation. Can you describe the difference between REST and GraphQL and when you'd use each?",
    "Excellent! How do you handle state management in a large React application?",
    "That's a great approach. How would you optimize a slow database query in a production web app?",
  ],
  default: [
    "That's a thoughtful answer. Can you elaborate on your approach with a concrete example?",
    "Good point. How would you handle a situation where your approach didn't work as expected?",
    "Excellent response. What key lessons have you learned from your most challenging project?",
  ],
};

function getAIResponse(track: string, messageIndex: number) {
  const responses = aiResponses[track.toLowerCase()] || aiResponses.default;
  return responses[messageIndex % responses.length];
}

function getFeedback(message: string) {
  const wordCount = message.split(" ").length;
  if (wordCount < 10) return "Try to provide more detail in your answers. Interviewers appreciate thorough, structured responses.";
  if (wordCount > 100) return "Good depth! Consider using the STAR method (Situation, Task, Action, Result) to structure your answer more clearly.";
  return "Well-structured answer. You demonstrated clear communication skills. Continue to provide specific examples to strengthen your responses.";
}

router.get("/mock-interview/sessions", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const user = req.user!;
  let sessions;
  if (user.role === "admin" || user.role === "instructor") {
    sessions = await db.select().from(mockInterviewSessionsTable).orderBy(mockInterviewSessionsTable.createdAt);
  } else {
    sessions = await db.select().from(mockInterviewSessionsTable).where(eq(mockInterviewSessionsTable.userId, user.id)).orderBy(mockInterviewSessionsTable.createdAt);
  }
  res.json(sessions.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/mock-interview/sessions", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { track, title } = req.body;
  if (!track) {
    res.status(400).json({ error: "track required" });
    return;
  }
  const user = req.user!;
  const [session] = await db.insert(mockInterviewSessionsTable).values({
    userId: user.id,
    track,
    title: title || `${track} Mock Interview`,
  }).returning();
  res.status(201).json({ ...session, createdAt: session.createdAt.toISOString() });
});

router.post("/mock-interview/message", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { sessionId, message, role } = req.body;
  if (!sessionId || !message || !role) {
    res.status(400).json({ error: "sessionId, message and role required" });
    return;
  }

  const user = req.user!;
  // Get session to check authorization
  const [session] = await db.select().from(mockInterviewSessionsTable)
    .where(eq(mockInterviewSessionsTable.id, parseInt(sessionId, 10)));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (user.role !== "admin" && user.role !== "instructor" && session.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Save the user message
  await db.insert(mockInterviewMessagesTable).values({
    sessionId: parseInt(sessionId, 10),
    role,
    message,
  });

  // Count messages for response index
  const messages = await db.select().from(mockInterviewMessagesTable)
    .where(eq(mockInterviewMessagesTable.sessionId, parseInt(sessionId, 10)));

  const track = session?.track || "default";
  const reply = getAIResponse(track, Math.floor(messages.length / 2));
  const feedback = getFeedback(message);

  res.json({ reply, feedback, score: null });
});

export default router;
