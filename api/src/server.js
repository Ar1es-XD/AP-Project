import 'dotenv/config';
import {app} from './app.js';
const PORT = process.env.PORT || 4000 ;
const server = app.listen(PORT, ()=>{
    console.log(`Server listening on http://localhost:${PORT}`);
});
// used to shutdown the server based on "https://dev.to/yusadolat/nodejs-graceful-shutdown-a-beginners-guide-40b6"
const gracefulShutdown = (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    const forceCloserTimer = setTimeout(() => {
        console.error('Graceful shutdown timed out after 10s, forcing shutdown.');
        server.closeAllConnections();
        process.exit(1);
    }, 10000);
    forceCloserTimer.unref();
    server.close((err) => {
        clearTimeout(forceCloserTimer);
        if (err) {
            console.error('Error closing server', err);
            process.exit(1);
        }
        console.log('Server closed cleanly');
        process.exit(0);
    });
};



process.on('SIGTERM' , () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',() => gracefulShutdown('SIGINT'));