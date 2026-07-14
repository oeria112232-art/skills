import { logger } from "../lib/logger";

const DAILY_API_KEY = process.env.DAILY_API_KEY || "";
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || "skalls.daily.co";

/**
 * Validates that a Daily.co URL belongs to the expected domain.
 */
export function isValidDailyUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(".daily.co");
  } catch {
    return false;
  }
}

/**
 * Service to interact with Daily.co REST APIs securely.
 * Handles room creation and meeting token generation.
 */
export class DailyService {
  /**
   * Creates a private Daily.co room for a specific workshop.
   * @param workshopId - The unique identifier of the workshop.
   * @returns A promise that resolves to the room URL and name.
   * @throws Error if API key is missing or Daily.co API returns an error.
   */
  static async createDailyRoom(workshopId: number): Promise<{ url: string; name: string }> {
    if (!DAILY_API_KEY) {
      logger.error("DAILY_API_KEY is not configured in environment variables.");
      throw new Error("Daily.co API key is not configured on the server.");
    }

    const roomName = `mharat-wsh-${workshopId}-${Math.random().toString(36).substring(2, 7)}-${Date.now().toString().slice(-6)}`;
    
    logger.info({ workshopId, roomName }, "Requesting Daily.co room creation");

    try {
      const response = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DAILY_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: roomName,
          privacy: "private", // strict access control using meeting tokens
          properties: {
            enable_chat: false,          // disable Daily built-in chat (we use our own)
            enable_screenshare: true,
            start_video_off: true,       // all participants start with camera OFF by default
            start_audio_off: false,      // microphone starts ON
            enable_knocking: false,      // no knocking — token-only access
            enable_prejoin_ui: false,    // bypass setup/pre-join screen for instant entry
            // Expire room in 24 hours to prevent orphan room accumulation
            exp: Math.floor(Date.now() / 1000) + 86400
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, "Daily.co room creation failed");
        throw new Error("Daily.co room creation failed");
      }

      const data = await response.json() as { url: string; name: string };
      logger.info({ roomName, url: data.url }, "Daily.co room created successfully");
      return {
        url: data.url,
        name: data.name
      };
    } catch (err: any) {
      logger.error({ err }, "Error calling Daily.co create room API");
      throw err;
    }
  }

  /**
   * Generates a secure, temporary meeting token for a user to join a private room.
   * @param roomName - The name of the Daily.co room.
   * @param user - User object containing id, name, and role.
   * @returns A promise that resolves to the meeting token string.
   * @throws Error if API key is missing or Daily.co API returns an error.
   */
  static async generateMeetingToken(
    roomName: string, 
    user: { id: number; name: string; role: string }
  ): Promise<string> {
    if (!DAILY_API_KEY) {
      logger.error("DAILY_API_KEY is not configured.");
      throw new Error("Daily.co API key is not configured on the server.");
    }

    // Admins and instructors get owner privilege
    const isOwner = user.role === "admin" || user.role === "instructor";
    
    logger.info({ roomName, userId: user.id, isOwner }, "Generating Daily.co meeting token");

    try {
      const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DAILY_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          properties: {
            room_name: roomName,
            is_owner: isOwner,
            user_name: user.name,
            user_id: String(user.id),
            // Expire token in 4 hours
            exp: Math.floor(Date.now() / 1000) + 14400,
            // Owners get full control; trainees can only send audio by default
            // (camera can be granted per-participant by the host via updateParticipant)
            ...(isOwner
              ? {
                  permissions: {
                    canSend: true,       // owners can send everything
                    canAdmin: ["participants", "streaming"] // owner-level controls
                  }
                }
              : {
                  permissions: {
                    canSend: ["audio"],  // trainees: audio only until host grants camera
                    canAdmin: []          // no room admin privileges
                  }
                }
            )
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, "Daily.co meeting token generation failed");
        throw new Error("Daily.co meeting token generation failed");
      }

      const data = await response.json() as { token: string };
      logger.info({ userId: user.id, roomName }, "Daily.co meeting token generated successfully");
      return data.token;
    } catch (err: any) {
      logger.error({ err }, "Error calling Daily.co create meeting token API");
      throw err;
    }
  }
}
