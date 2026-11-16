/**
 * Writes one row into the audit_log table.
 * Always call this inside a transaction with the active client.
 */
export async function writeAudit(client, {
  actorId,
  hospitalId,
  action,
  entityType,
  entityId,
  before = null,
  after = null,
  requestId = null,
}) {
  await client.query(
    `INSERT INTO audit_log
       (actor_user_id, hospital_id, action, entity_type, entity_id, before, after, request_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      actorId,
      hospitalId,
      action,
      entityType,
      String(entityId),
      before === null ? null : JSON.stringify(before),
      after === null ? null : JSON.stringify(after),
      requestId,
    ]
  );
}
