import { Router } from "express";
import { db, certificatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetCertificateParams } from "@workspace/api-zod";

const router = Router();

function serializeCert(c: typeof certificatesTable.$inferSelect) {
  return {
    ...c,
    issuedAt: c.issuedAt.toISOString(),
  };
}

router.get("/certificates", async (_req, res): Promise<void> => {
  const certs = await db.select().from(certificatesTable).orderBy(certificatesTable.issuedAt);
  res.json(certs.map(serializeCert));
});

router.get("/certificates/:id", async (req, res): Promise<void> => {
  const params = GetCertificateParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [cert] = await db.select().from(certificatesTable).where(eq(certificatesTable.id, params.data.id));
  if (!cert) { res.status(404).json({ error: "Certificate not found" }); return; }
  res.json(serializeCert(cert));
});

export default router;
