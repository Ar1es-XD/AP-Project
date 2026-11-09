import { query } from './db.js';
export async function logAudit({
    actorUserId = null ,
    hospitalId = null,
    action , 
    entityType,
    entityId,
    before = null,
    after = null ,
    requestId  = null,
    client = null,
})
if(!action || !entityType || !entityId){
    throw new Error('logAudir requires action, entityType and entityId');
}
const sql = `
INSERT INTO audit_log (
actor_user_id,
hospital_id,
action,
entity_type,
entity_id,
before,
after,
request_id,
) VALUES ($1 , $2,$3,$4,$5,$6,$7,$8)
 RETURNING audit_id,at:
`;

const params 