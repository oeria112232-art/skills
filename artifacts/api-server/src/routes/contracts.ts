import { Router, type IRouter } from "express";
import { createHash, randomUUID } from "node:crypto";
import {
  CreateContractBody,
  GetContractParams,
  SignContractBody,
  SignContractParams,
  UpdateContractBody,
  UpdateContractParams,
} from "@workspace/api-zod";
import { contractsTable, db } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

const router: IRouter = Router();
const statuses = ["draft", "sent", "viewed", "signed", "expired"] as const;

function toContractResponse(contract: typeof contractsTable.$inferSelect) {
  return {
    ...contract,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
    signedAt: contract.signedAt?.toISOString() ?? null,
  };
}

function getPublicUrl(id: string) {
  return `/contract/${id}`;
}

router.get("/contracts", async (req, res) => {
  const contracts = await db
    .select()
    .from(contractsTable)
    .orderBy(desc(contractsTable.createdAt));
  req.log.info({ count: contracts.length }, "Listed contracts");
  res.json(contracts.map(toContractResponse));
});

router.post("/contracts", async (req, res) => {
  const input = CreateContractBody.parse(req.body);
  const id = randomUUID();
  const now = new Date();
  const contract = {
    id,
    reference: `NW-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    title: input.title,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    scope: input.scope,
    paymentTerms: input.paymentTerms,
    expirationDate: input.expirationDate.toISOString().slice(0, 10),
    status: "draft",
    createdAt: now,
    updatedAt: now,
    publicUrl: getPublicUrl(id),
  };
  const [created] = await db
    .insert(contractsTable)
    .values(contract)
    .returning();
  req.log.info({ contractId: id }, "Created contract");
  res.status(201).json(toContractResponse(created));
});

router.get("/contracts/:id", async (req, res) => {
  const { id } = GetContractParams.parse(req.params);
  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.id, id));
  if (!contract) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }

  if (contract.status === "sent" || contract.status === "draft") {
    const [updated] = await db
      .update(contractsTable)
      .set({ status: "viewed", updatedAt: new Date() })
      .where(eq(contractsTable.id, id))
      .returning();
    res.json(toContractResponse(updated));
    return;
  }
  res.json(toContractResponse(contract));
});

router.patch("/contracts/:id", async (req, res) => {
  const { id } = UpdateContractParams.parse(req.params);
  const input = UpdateContractBody.parse(req.body);
  if (input.status && !statuses.includes(input.status)) {
    res.status(400).json({ error: "Unsupported contract status" });
    return;
  }
  const [updated] = await db
    .update(contractsTable)
    .set({ ...(input.status ? { status: input.status } : {}), updatedAt: new Date() })
    .where(eq(contractsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }
  req.log.info({ contractId: id, status: input.status }, "Updated contract");
  res.json(toContractResponse(updated));
});

router.post("/contracts/:id/sign", async (req, res) => {
  const { id } = SignContractParams.parse(req.params);
  const input = SignContractBody.parse(req.body);
  const [existing] = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }
  if (existing.status === "signed") {
    res.status(400).json({ error: "Contract is already signed" });
    return;
  }
  const signedAt = new Date();
  const verificationHash = createHash("sha256")
    .update(`${id}:${input.signerName}:${signedAt.toISOString()}`)
    .digest("hex");
  const [signed] = await db
    .update(contractsTable)
    .set({
      status: "signed",
      signerName: input.signerName,
      signerTitle: input.signerTitle,
      signedAt,
      signerIp: req.ip ?? "127.0.0.1",
      userAgent: req.get("user-agent") ?? "Unknown browser",
      verificationHash,
      updatedAt: signedAt,
    })
    .where(eq(contractsTable.id, id))
    .returning();
  req.log.info({ contractId: id }, "Signed contract");
  res.json(toContractResponse(signed));
});

router.post("/contracts/:id/resend", async (req, res) => {
  const { id } = GetContractParams.parse(req.params);
  const [updated] = await db
    .update(contractsTable)
    .set({ status: "sent", updatedAt: new Date() })
    .where(eq(contractsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Contract not found" });
    return;
  }
  req.log.info({ contractId: id }, "Resent contract");
  res.json(toContractResponse(updated));
});

router.get("/dashboard/summary", async (_req, res) => {
  const [summary] = await db
    .select({
      total: sql<number>`count(*)`,
      pending: sql<number>`count(*) filter (where ${contractsTable.status} in ('draft', 'sent', 'viewed'))`,
      signed: sql<number>`count(*) filter (where ${contractsTable.status} = 'signed')`,
      expiringSoon: sql<number>`count(*) filter (where ${contractsTable.expirationDate} <= current_date + 30 and ${contractsTable.status} <> 'signed')`,
    })
    .from(contractsTable);
  res.json({
    total: Number(summary?.total ?? 0),
    pending: Number(summary?.pending ?? 0),
    signed: Number(summary?.signed ?? 0),
    expiringSoon: Number(summary?.expiringSoon ?? 0),
    totalValue: 0,
  });
});

export default router;