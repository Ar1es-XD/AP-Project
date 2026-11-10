/**
 * Writes one row into the audit_log table.
 * Always call this inside a transaction (pass the same client).
 * it writes down a permanent record of who just changed what 
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
      String(entityId),   // entity_id is text in the table
      before,
      after,
      requestId,
    ]
  );
}
