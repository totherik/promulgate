import test from 'tape';
import Promulgate from '../dist/index';
import Through from 'through2';

test('promulgate', function (t) {

    t.test('createReadStream', function (t) {
        let read = Promulgate.createReadStream();
        read.on('error', t.error);
        read.on('end', t.end);

        let write = Through.obj((data, _, done) => {
            t.ok(data);
            read.close();
            done();
        });

        read.pipe(write);
    });


    t.test('constructor', function (t) {
        let read = new Promulgate();
        read.on('error', t.error);
        read.on('end', t.end);

        let write = Through.obj((data, _, done) => {
            t.ok(data);
            read.close();
            done();
        });

        read.pipe(write);
    });


    t.test('multiple data', function (t) {
        let read = new Promulgate();
        read.on('error', t.error);
        read.on('end', t.end);

        let count = 0;
        let write = Through.obj((data, _, done) => {
            t.ok(data);
            done();

            count += 1;
            if (count === 3) {
                read.close();
            }
        });

        read.pipe(write);
    });

});