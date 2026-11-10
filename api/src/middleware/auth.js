import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if(!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

export const authGuard = (req,res,next) =>{
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({
            error: {code: 'Unauthorized',message: "Missing or malformed auth header"}
        });
    }

const token = authHeader.split(' ')[1];
try{
    const payload = jwt.verify(token,JWT_SECRET);
    req.user = {
        userId: payload.userId,
        email: payload.email,
        fullName : payload.fullName,
        hospitalId : payload.hospitalId,
        roles: payload.roles || [],
        departmentId: payload.departmentId || null
    };
    next();
}catch(err){
    return res.status(401).json({
        error:{code: ' Invalid_Token',message:'Token is invalid or expired'}
    });
}
};

export const requireRole = (...allowedRoles) =>{
    return (req,res,next) => {
        if(!req.user || !req.user.roles || !Array.isArray(req.user.roles)){
            return res.status(403).json({
                error:{code:'Forbidden',messgae:`Requires one of roles:${allowedRoles.join(',')}`}
            });
        }
        const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
        if(!hasRole){
            return res.status(403).json({
                error:{code:'Forbidden' , message: `Requires one of roles: ${allowedRoles.join(',')}`}
            });
        }
        next();
    };
};

export const requireHospital = (req,res,next) => {
    const targetHospitalId = req.params.hospitalId || req.query.hospitalId || req.body?.hospital_id;
    if(targetHospitalId && req.user?.hospitalId && req.user.hospitalId !== targetHospitalId){
        if(!req.user.roles.invludes('CITY_VIEWER')){
            return res.status(403).json({
                error:{code:"Cross_Hospital_Forbidden",message:"Access denied: Tenant isolation policy"}
            });
        }
    }
    next();
};