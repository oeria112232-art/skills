import crypto from "crypto";
import { db, usersTable, pointsTransactionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { WALLET_SECRET } from "../lib/secrets";
import { redis } from "../lib/redis";

// Nonce store for idempotency (in-memory, maps nonce -> timestamp)
const usedNonces = new Map<string, number>();
const NONCE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Periodic cleanup of expired nonces
setInterval(() => {
  const now = Date.now();
  for (const [nonce, ts] of usedNonces.entries()) {
    if (now - ts > NONCE_TTL_MS) usedNonces.delete(nonce);
  }
}, 10 * 60 * 1000);

/**
 * Generates a unique nonce for idempotency checks.
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Checks and marks a nonce as used (prevents duplicate transactions).
 * Returns true if the nonce is valid and was not used before.
 */
export async function claimNonce(nonce: string): Promise<boolean> {
  if (!nonce || typeof nonce !== "string") return false;
  
  const key = `nonce:${nonce}`;
  try {
    const result = await redis.setnx(key, "1");
    if (result === 1) {
      await redis.expire(key, 86400); // 24 hours TTL
      return true;
    }
    return false;
  } catch (err) {
    console.error("Redis error in claimNonce, falling back to in-memory store:", err);
    if (usedNonces.has(nonce)) return false;
    usedNonces.set(nonce, Date.now());
    return true;
  }
}

/**
 * Generates a timestamped signature with nonce to prevent replay attacks.
 */
export function generateSecureSignature(userId: number, action: string, nonce: string): string {
  const timestamp = Date.now();
  const payload = `${userId}:${action}:${nonce}:${timestamp}:${WALLET_SECRET}`;
  return crypto.createHmac("sha256", WALLET_SECRET).update(payload).digest("hex");
}

/**
 * Checks for duplicate transactions within a time window (anti-fraud).
 * Prevents same user, same type, same amount within 60 seconds.
 */
export async function checkDuplicateTransaction(
  userId: number,
  type: string,
  amount: number,
  windowSeconds: number = 60
): Promise<boolean> {
  const windowMs = windowSeconds * 1000;

  const recentTxs = await db
    .select()
    .from(pointsTransactionsTable)
    .where(
      and(
        eq(pointsTransactionsTable.receiverId, userId),
        eq(pointsTransactionsTable.type, type),
        eq(pointsTransactionsTable.amount, amount)
      )
    )
    .orderBy(desc(pointsTransactionsTable.createdAt));

  // Check only the first 5 results (without .limit which Firebase mock doesn't support)
  const checkTxs = recentTxs.slice(0, 5);

  return checkTxs.some((tx) => {
    const txTime = tx.createdAt instanceof Date ? tx.createdAt.getTime() : new Date(tx.createdAt as any).getTime();
    return txTime > Date.now() - windowMs;
  });
}

/**
 * Generates an HMAC-SHA256 signature for a user's points balance.
 */
export function generatePointsSignature(userId: number, points: number): string {
  return crypto
    .createHmac("sha256", WALLET_SECRET)
    .update(`${userId}:${points}`)
    .digest("hex");
}

/**
 * Verifies if the user's points signature is valid.
 * If the user has no signature (newly registered or legacy user),
 * it dynamically signs their balance and saves it.
 */
export async function verifyAndHardenUserBalance(user: any): Promise<boolean> {
  if (!user) return false;

  const currentPoints = user.points || 0;

  // Auto-upgrade legacy/new users without a signature
  if (!user.pointsSignature) {
    const freshSignature = generatePointsSignature(user.id, currentPoints);
    await db
      .update(usersTable)
      .set({ pointsSignature: freshSignature })
      .where(eq(usersTable.id, user.id));
    user.pointsSignature = freshSignature;
    return true;
  }

  const expectedSignature = generatePointsSignature(user.id, currentPoints);
  
  if (!user.pointsSignature || typeof user.pointsSignature !== "string" || user.pointsSignature.length !== expectedSignature.length) {
    console.error(
      `🚨 SECURITY ALERT: Invalid or mismatched signature format/length for User ID ${user.id}! Found length: ${user.pointsSignature?.length}, Expected: ${expectedSignature.length}`
    );
    return false;
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(user.pointsSignature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );

  if (!isValid) {
    console.error(`🚨 CRITICAL SECURITY ALERT: Signature mismatch for User ID ${user.id}. Possible unauthorized points tampering!`);
    return false; // Do not auto-heal — report mismatch to block the request
  }

  return isValid;
}

/**
 * Dynamically updates the user's balance and re-signs it cryptographically.
 */
export async function updateAndSignUserBalance(userId: number, newPoints: number): Promise<void> {
  const pointsSignature = generatePointsSignature(userId, newPoints);
  await db
    .update(usersTable)
    .set({ points: newPoints, pointsSignature })
    .where(eq(usersTable.id, userId));
}

/**
 * Generates a transaction signature chain.
 */
export function generateTransactionSignature(
  txId: number,
  senderId: number | null,
  receiverId: number,
  amount: number,
  prevSignature: string
): string {
  const payload = `${txId}:${senderId ?? "system"}:${receiverId}:${amount}:${prevSignature}`;
  return crypto
    .createHmac("sha256", WALLET_SECRET)
    .update(payload)
    .digest("hex");
}

/**
 * Appends a new secure transaction to the ledger with hash chaining.
 */
export async function insertSecureTransaction(
  senderId: number | null,
  receiverId: number,
  amount: number,
  type: string,
  notes: string
): Promise<any> {
  // 1. Get previous transaction signature to form the hash chain
  const [latestTx] = await db
    .select()
    .from(pointsTransactionsTable)
    .orderBy(desc(pointsTransactionsTable.createdAt))
    .limit(1);

  const prevSignature = latestTx?.signature || "genesis_block_signature_mharat";

  // 2. Insert transaction entry
  const [newTx] = await db
    .insert(pointsTransactionsTable)
    .values({
      senderId,
      receiverId,
      amount,
      type,
      notes,
      signature: "", // Will update after getting database ID
      previousSignature: prevSignature,
    })
    .returning();

  // 3. Generate transaction signature using the generated ID
  const signature = generateTransactionSignature(
    newTx.id,
    senderId,
    receiverId,
    amount,
    prevSignature
  );

  // 4. Update the signature field
  const [signedTx] = await db
    .update(pointsTransactionsTable)
    .set({ signature })
    .where(eq(pointsTransactionsTable.id, newTx.id))
    .returning();

  return signedTx;
}

// In-memory locks map to prevent concurrent database updates per user (Race condition prevention)
const locks = new Map<number, Promise<void>>();

/**
 * Acquires a mutex lock for a specific user ID.
 * Returns a release function to be called in a finally block.
 */
export async function acquireUserLock(userId: number): Promise<() => void> {
  const lockKey = `lock:user:${userId}`;
  const lockVal = String(Date.now() + 10000); // 10 seconds expiry

  let acquired = false;
  try {
    const startTime = Date.now();
    while (!acquired && Date.now() - startTime < 10000) {
      const res = await redis.setnx(lockKey, lockVal);
      if (res === 1) {
        await redis.expire(lockKey, 10);
        acquired = true;
      } else {
        const currentVal = await redis.get(lockKey);
        if (currentVal && Date.now() > parseInt(currentVal, 10)) {
          await redis.del(lockKey);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }
  } catch (err) {
    console.error("Redis lock failed, falling back to local lock:", err);
  }

  if (!acquired) {
    while (locks.has(userId)) {
      await locks.get(userId);
    }

    let resolveLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    locks.set(userId, lockPromise);

    return () => {
      locks.delete(userId);
      resolveLock();
    };
  }

  return () => {
    redis.del(lockKey).catch((err) => console.error("Failed to release Redis lock:", err));
  };
}

/**
 * Acquires double locks for two users involved in a transfer.
 * Locks are always acquired in ascending order of ID to prevent deadlocks.
 */
export async function acquireDoubleUserLock(userA: number, userB: number): Promise<() => void> {
  const first = Math.min(userA, userB);
  const second = Math.max(userA, userB);

  const releaseFirst = await acquireUserLock(first);
  const releaseSecond = await acquireUserLock(second);

  return () => {
    releaseSecond();
    releaseFirst();
  };
}

/**
 * Verifies the entire transaction hash chain integrity.
 * Returns { valid, brokenAt } — if broken, brokenAt is the first tampered tx ID.
 */
export async function verifyTransactionChainIntegrity(): Promise<{ valid: boolean; brokenAtTxId?: number; totalChecked: number }> {
  const allTxs = await db
    .select()
    .from(pointsTransactionsTable)
    .orderBy(pointsTransactionsTable.id);

  if (allTxs.length === 0) return { valid: true, totalChecked: 0 };

  for (let i = 0; i < allTxs.length; i++) {
    const tx = allTxs[i];
    const expectedPrevSig = i === 0 ? "genesis_block_signature_mharat" : allTxs[i - 1].signature;

    if (tx.previousSignature !== expectedPrevSig) {
      return { valid: false, brokenAtTxId: tx.id, totalChecked: i + 1 };
    }

    const expectedSig = generateTransactionSignature(
      tx.id,
      tx.senderId,
      tx.receiverId,
      tx.amount,
      tx.previousSignature || ""
    );

    if (!tx.signature || !crypto.timingSafeEqual(Buffer.from(tx.signature, "hex"), Buffer.from(expectedSig, "hex"))) {
      return { valid: false, brokenAtTxId: tx.id, totalChecked: i + 1 };
    }
  }

  return { valid: true, totalChecked: allTxs.length };
}

/**
 * Detects anomalous transaction patterns.
 * Returns a list of alerts for suspicious activity.
 */
export async function detectAnomalies(): Promise<string[]> {
  const alerts: string[] = [];
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const recentTxs = await db
    .select()
    .from(pointsTransactionsTable)
    .orderBy(desc(pointsTransactionsTable.createdAt));

  // Check only recent 200 transactions for performance
  const checkTxs = recentTxs.slice(0, 200);

  // 1. Detect: More than 10 transactions from same user in 1 hour
  const userTxCounts = new Map<number, { count: number; totalAmount: number }>();
  for (const tx of checkTxs) {
    const txTime = tx.createdAt instanceof Date ? tx.createdAt.getTime() : new Date(tx.createdAt as any).getTime();
    if (txTime < oneHourAgo) continue;
    const userId = tx.receiverId;
    const existing = userTxCounts.get(userId) || { count: 0, totalAmount: 0 };
    existing.count++;
    existing.totalAmount += tx.amount;
    userTxCounts.set(userId, existing);
  }
  for (const [userId, data] of userTxCounts) {
    if (data.count > 10) {
      alerts.push(`HIGH_FREQUENCY: User ${userId} has ${data.count} transactions in the last hour (total: ${data.totalAmount} pts)`);
    }
    if (data.totalAmount > 5000) {
      alerts.push(`HIGH_VOLUME: User ${userId} has ${data.totalAmount} points transacted in the last hour`);
    }
  }

  // 2. Detect: Large single transaction (> 1000 points)
  for (const tx of checkTxs) {
    if (tx.amount > 1000) {
      const txTime = tx.createdAt instanceof Date ? tx.createdAt.getTime() : new Date(tx.createdAt as any).getTime();
      if (txTime > oneDayAgo) {
        alerts.push(`LARGE_TX: Transaction #${tx.id} - User ${tx.receiverId} - Amount: ${tx.amount} pts - Type: ${tx.type}`);
      }
    }
  }

  // 3. Detect: Chain integrity check
  const chainResult = await verifyTransactionChainIntegrity();
  if (!chainResult.valid) {
    alerts.push(`CHAIN_BROKEN: Transaction hash chain is broken at TX #${chainResult.brokenAtTxId}! Total checked: ${chainResult.totalChecked}`);
  }

  return alerts;
}

/**
 * Migrates legacy transactions by re-signing them with proper hash chaining.
 * Run once to fix broken chains from pre-hash-chain era.
 */
export async function migrateLegacyTransactions(): Promise<{ migrated: number; total: number }> {
  let totalMigrated = 0;
  let totalTxs = 0;

  // Run multiple passes until stable (each pass fixes chain dependencies)
  for (let pass = 0; pass < 10; pass++) {
    const allTxs = await db
      .select()
      .from(pointsTransactionsTable)
      .orderBy(pointsTransactionsTable.id);

    totalTxs = allTxs.length;
    let passMigrated = 0;

    for (let i = 0; i < allTxs.length; i++) {
      const tx = allTxs[i];
      const prevSig = i === 0 ? "genesis_block_signature_mharat" : allTxs[i - 1].signature || "genesis_block_signature_mharat";

      const expectedSig = generateTransactionSignature(
        tx.id,
        tx.senderId,
        tx.receiverId,
        tx.amount,
        prevSig
      );

      if (tx.signature !== expectedSig || tx.previousSignature !== prevSig) {
        await db
          .update(pointsTransactionsTable)
          .set({ signature: expectedSig, previousSignature: prevSig })
          .where(eq(pointsTransactionsTable.id, tx.id));
        passMigrated++;
      }
    }

    totalMigrated += passMigrated;
    if (passMigrated === 0) break; // All chains are now valid
  }

  return { migrated: totalMigrated, total: totalTxs };
}
