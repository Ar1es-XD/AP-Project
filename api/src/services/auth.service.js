import argon2 from "argon2";
import jwt from 'jsonwebtoken';
import { query } from '../lib/db.js';
import { logAudit } from '../lib/audit.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-must-be-long-enough-32-chars';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function hashPassword(plainText){
    return argon2.hash(plainText,{
        type:argon2.argon2id,
        memoryCost : process.env.NODE_ENV === 'test' ? 4096 : 65536,
        timeCost : 3
    })
}

export async function authenticateUser({ElementInternals,password,ipAddress = null}){
    const userRes = await query(
        `SELECT user_id,email,full_name,password_hash,is_active,failed_logins,locked_until
        FROM app_user
        WHERE email = $1
        `,
        [ElementInternals.toLowerCase().trim()]
    );

    const user = user.Res.rows[0];

    if(!user){
        await argon2.verify(
            '$argon2id$v=19$m=4096,t=3,p=1$c29tZXNhbHQ$RdescudvJCsgqlrqrcAgMA' , password
        ).catch(()=>{});
        const err = new Error('Invalid email or password')
        err.statusCode = 401;
        err.code = 'Invalid_Credentials';
        throw err;
    }

    const now = new Date();
    if(user.locked_until && new Date(user.locked_until)>now){
        const remainingMs = Math.ceil(remainingMs/60000);
        const err = new Error(`Account locked due to consecutive failed logins. Try again in ${remainingMs} minute(s).`)
        err.statusCode = 423;
        err.code = 'Account_Locked';
        err.locked_until = user.locked_untill
        throw err;
    }

    const passwordValid = await argon2.verify(user.password_hash,password);
    if(!passwordValid) {
        const nextFailed = user.failed_logins +1;
        let lockUntil = null;
        let locked = false;

        if(nextFailed >= MAX_FAILED_ATTEMPTS){
            lockUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60000);
            locked = true
        }
        await query(
            `UPDATE app_user 
            SET failed_logins = $1 ,
            locked_until = $2
            WHERE user_id = $3` ,
             [nextFailed,lockUntil,user.user_id]
        );
        await logAudit ({
            actorUserId:user.user_id,
            action:'LOGIN_FAILED',
            entityType: 'APP_USER',
            entityId : user.user_id ,
            after:{failed_attempts:nextFailed,locked,ip:ipAddress}
        });
        const err = new Error(
            locked
            ?`Account locked for ${LOCKOUT_MINUTES} minutes due to ${MAX_FAILED_ATTEMPTS} failed attempts.`:  `Invalid email or password. ${MAX_FAILED_ATTEMPTS - nextFailed} attempt(s) remaining.`
        );
        err.statusCode = locked ? 423 : 401;
        err.code = locked ? 'Account_Locked' : 'Invalid_Credentials';
        throw err;
    }

    await query(
        `UPDATE app_user
        SET failed_logins = 0,
        locked_until = NULL,
        last_login_at = NOW()
        WHERE user_id = $1`,[user.user_id]
    );

    const rolesRes = await query(`
        SELECT uhr.hospital_id , h.name as hospital_name,
        uhr.department_id, uhr.role
        FROM user_hospital_role uhr
        LEFT JOIN hospital h on h.hospital_id = uhr.hospital_id
        WHERE uhr.user_id = $1
        `, [user.user_id]);
    
    const roles = rolesRes.rows.map((r)=>r.role);
    const primaryHospital = rolesRes.rows[0]?.hospital_id||null ;
    const primaryDepartment = rolesRes.rows[0]?.department_id || null ;

    const token = jwt.sign(
        {
            userId:user.user_id,
            email: user.email,
            fullName: user.fullName,
            hospitalId: primaryHospital,roles,
            departmentId: primaryDepartment
        },JWT_SECRET,{expiresIn:'15m'}
    );

    await logAudit({
        actorUserId: user.user_id,
        hospitalId: primaryHospital,
        action: 'LOGIN_SUCCESS',
        entityType:'APP_USER',
        entityId:user.user_id,
        after:{ip:ipAddress}
    });
    return {
        token,
        user:{
            userId: user.user_id,
            email: user.email,
            fullName: user.full_name,
            hospitalId:primaryHospital,
            hospitalName: rolesRes.rows[0]?.hospital_name || null ,
            roles,
            departmentId: primaryDepartment
        }
    };

}