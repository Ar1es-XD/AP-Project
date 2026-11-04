import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
export const app = express();
app.use(helmet());
app(cors({origin: process.env.WEB_ORIGIN || 'http://localhost:5173',credentials: true,}));
app.use(express.json({ limit: '1mb'}));
app.get('/health',(req,res)=>{
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: 'hospital-managment-core-api'
    });
});
app.use((req,res)=>{
    res.status(404).json({
        error:{
            code:'Not_Found',
            message:`Cannot ${req.method} ${req.originalUrl}`
        },
    });
});
app.use((err,req,res,next)=>{
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
        error:{
            code:err.code || (statusCode>=500 ? 'Internal_Error' : 'Bad_Request'),
            message:err.message || 'Internal Server Error',
        },
    });
});

