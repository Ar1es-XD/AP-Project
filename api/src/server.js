import 'dotenv/config';
import {app} from './app.js';
const PORT = process.env.port || 4000 ;
const server = app.listen(PORT, ()=>{
    console.log(`Server listening on http://localhost:${PORT}`);
});
// used to shutdown the server based on "https://dev.to/yusadolat/nodejs-graceful-shutdown-a-beginners-guide-40b6"
const gracefulShutdown = (signal) =>{
    console.log(`Recieved ${signal},shutting down gracefully.....`);;
    server.close(()=>{
        console.log('server closed');;
        process.exit(0);
    });
};

process.on('SIGTERM' , () => gracefulShutdown('SIGTERM'));
process.on('SIGTERM',() => gracefulShutdown('SIGINT'));