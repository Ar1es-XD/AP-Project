import 'dotenv/config';
import {app} from './app.js';
const PORT = process.env.PORT || 4000 ;
const server = app.listen(PORT, ()=>{
    console.log(`Server listening on http://localhost:${PORT}`);
});
// used to shutdown the server based on "https://dev.to/yusadolat/nodejs-graceful-shutdown-a-beginners-guide-40b6"
const gracefulShutdown = (signal) =>{
    console.log(`Recieved ${signal},shutting down gracefully.....`);;
    const forceCloserTimer = setTimeout(() => {
        server.closeAllConnections();
    },10000);
    forceCloserTimer.unref();
    server.close(()=>{
        clearTimeout(forceCloserTimer);
    })
};



process.on('SIGTERM' , () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',() => gracefulShutdown('SIGINT'));