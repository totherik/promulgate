import tape from 'tape';
import glob from 'glob';
import Path from 'path';

// Kick things off, but only after the module has completed loading,
// hence the setImmediate. If the load the modules synchronously,
// the exported object isn't yet available (since tests import this
// module) and we get into a weird state.
setImmediate(() => {
    // All this mess for npm < 2. With 2.x this can be removed
    // and npm script argument globbing can be used.
    process.argv.slice(2).forEach(arg => {
        glob.sync(arg).forEach(file => {
            require(Path.resolve(process.cwd(), file));
        });
    });

    // Get a handle on the root test harness so we
    // can forcefull kill the process (THANKS TIMERS!)
    //tape().on('end', function () { setImmediate(process.exit, 0) });
});
