import { chatClient, streamClient } from "../lib/stream.js";
import Session from "../models/Session.js";

export async function createSession(req, res) {
  try {
    const { problem = "", difficulty = "", customProblem } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    // generate a unique call id for stream video
    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const sessionData = { 
      problem: problem || "", 
      difficulty: difficulty || "", 
      host: userId, 
      callId,
      isCodeTestMode: !!problem || !!customProblem
    };

    if (customProblem) {
      sessionData.customProblem = customProblem;
      sessionData.problem = customProblem.title;
      sessionData.difficulty = customProblem.difficulty.toLowerCase();
    }

    // create session in db
    const session = await Session.create(sessionData);

    const actualProblem = sessionData.problem;
    const actualDifficulty = sessionData.difficulty;

    // create stream video call
    await streamClient.video.call("default", callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: { problem: actualProblem || "Interview", difficulty: actualDifficulty || "N/A", sessionId: session._id.toString() },
      },
    });

    // chat messaging
    const channel = chatClient.channel("messaging", callId, {
      name: problem ? `${problem} Session` : "Interview Session",
      created_by_id: clerkId,
      members: [clerkId],
    });

    await channel.create();

    res.status(201).json({ session });
  } catch (error) {
    console.log("Error in createSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getActiveSessions(_, res) {
  try {
    const sessions = await Session.find({ status: "active" })
      .populate("host", "name profileImage email clerkId")
      .populate("participant", "name profileImage email clerkId")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getActiveSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const userId = req.user._id;

    // get sessions where user is either host or participant
    const sessions = await Session.find({
      status: "completed",
      $or: [{ host: userId }, { participant: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getMyRecentSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate("host", "name email profileImage clerkId")
      .populate("participant", "name email profileImage clerkId");

    if (!session) return res.status(404).json({ message: "Session not found" });

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in getSessionById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status !== "active") {
      return res.status(400).json({ message: "Cannot join a completed session" });
    }

    if (session.host.toString() === userId.toString()) {
      return res.status(400).json({ message: "Host cannot join their own session as participant" });
    }

    // check if session is already full - has a participant
    if (session.participant) return res.status(409).json({ message: "Session is full" });

    session.participant = userId;
    await session.save();

    const channel = chatClient.channel("messaging", session.callId);
    await channel.addMembers([clerkId]);

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in joinSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    // check if user is the host
    if (session.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the host can end the session" });
    }

    // check if session is already completed
    if (session.status === "completed") {
      return res.status(400).json({ message: "Session is already completed" });
    }

    // delete stream video call
    const call = streamClient.video.call("default", session.callId);
    await call.delete({ hard: true });

    // delete stream chat channel
    const channel = chatClient.channel("messaging", session.callId);
    await channel.delete();

    session.status = "completed";
    await session.save();

    res.status(200).json({ session, message: "Session ended successfully" });
  } catch (error) {
    console.log("Error in endSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function startCodeTest(req, res) {
  try {
    const { id } = req.params;
    const { problem, difficulty, customProblem } = req.body;
    const userId = req.user._id;

    if (!problem && !customProblem) {
      return res.status(400).json({ message: "Problem is required" });
    }

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    // check if user is the host
    if (session.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the host can start code test" });
    }

    let actualProblem = problem || "";
    let actualDifficulty = difficulty || "";

    if (customProblem) {
      session.customProblem = customProblem;
      actualProblem = customProblem.title;
      actualDifficulty = customProblem.difficulty.toLowerCase();
    }

    // update stream video call
    const call = streamClient.video.call("default", session.callId);
    await call.update({
      custom: { problem: actualProblem, difficulty: actualDifficulty, sessionId: session._id.toString() },
    });

    // update stream chat channel
    const channel = chatClient.channel("messaging", session.callId);
    await channel.update({ name: `${actualProblem} Session` });

    session.problem = actualProblem;
    session.difficulty = actualDifficulty;
    session.isCodeTestMode = true;
    await session.save();

    res.status(200).json({ session, message: "Code test mode started" });
  } catch (error) {
    console.log("Error in startCodeTest controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}