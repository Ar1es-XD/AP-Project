import { query } from './db.js';
export async function writeAudit(client , {
    actorId, 
    hospitalId, 
    action , 
    entityType,
    entityId,
     before = null ,
    after = null ,
    requestId= null,
}){
    await client.query(`
        INSERT INTO audit_log(actor_user_id,hospital_id,action,entity_type,entity_id,before,after,request_id)VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        `,[
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
}){
if(!action || !entityType || !entityId){
    throw new Error('logAudit requires action, entityType and entityId');
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
request_id
) VALUES ($1 , $2,$3,$4,$5,$6,$7,$8)
 RETURNING audit_id,at;
`;

const params = [
    actorUserId,
    hospitalId,
    action,
    entityType,
    String(entityId),
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) :null,
    requestId
];

const executor = client ? client.query.bind(client) : query;
const result = await executor(sql,params);
return result.rows[0];
};