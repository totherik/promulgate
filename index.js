import Url from 'url';
import Wreck from 'wreck';
import { Readable } from 'stream';


const INTERVAL = 30 * 1000;
const HOST = 'https://skimdb.npmjs.com:443';
const URL = {
    pathname: '/registry/_design/app/_view/updated',
    query: {
        include_docs: true,
        startkey: undefined
    }
};


export default class Promulgate extends Readable {

    constructor(host = HOST, interval = INTERVAL) {
        Readable.call(this, { objectMode: true });

        this.url = Object.assign(Url.parse(host), URL);
        this.interval = interval;
        this.startkey = new Date();
        this.lastUpdate = Date.now() - this.interval;
        this.visited = {};
        this.queue = [];
        this.timer = null;
        this.ended = false;
    }

    static createReadStream() {
        return new Promulgate(...arguments);
    }

    close() {
        if (!this.ended) {
            clearTimeout(this.timer);
            this.visited = {};
            this.queue = [];
            this.timer = null;
            this.ended = true;
            this.push(null);
        }
    }

    _read() {
        this._run();
    }

    _run() {
        if (!this.queue.length) {
            this.queue.push(this._update());
        }

        // All promises on the queue resolve to a row or reject with error.
        this.queue.shift().then(
            row => {
                if (this.ended) {
                    // In case there are any in-flight requests occurring
                    // when the stream is closed.
                    return;
                }

                if (row) {
                    // Row may be undefined if an update returned no new data,
                    // so we're only going to push new, known rows, otherwise...
                    this.push(row);
                    return;
                }

                // we didn't get any new rows from the previous read, so continue
                // processing the queue until we can fulfill this one. This may
                // mean queueing up a fetch.
                this._run();
            },
            error => {
                this.emit('error', error);
            }
        );
    }

    _update() {
        return new Promise((resolve, reject) => {
            let remaining = this.interval - (Date.now() - this.lastUpdate);

            this.timer = setTimeout(() => {

                // After configured interval run the update. This should return all rows.
                this._fetch().then(
                    rows => {
                        // The first returned row will fulfill this promise and subsequent
                        // rows will be wrapped in promises and put on the queue.
                        // NOTE: This request may return zero rows and that's ok.
                        let [ first, ...rest ] = this._filter(rows);

                        resolve(first);
                        for (let row of rest) {
                            this.queue.push(new Promise(resolve => resolve(row)));
                        }

                        if (rows.length) {
                            // Regardless of whether we've seen this record before,
                            // update the startkey with the last returned record.
                            this.startkey = rows[rows.length - 1].key;
                        }
                    },
                    reject
                )

            }, Math.max(0, remaining));
        });
    }

    _fetch() {
        return new Promise((resolve, reject) => {
            this.url.query.startkey = JSON.stringify(this.startkey);

            Wreck.get(Url.format(this.url), { json: true }, (err, res, payload) => {
                // Reset timer so our updates honor the interval.
                this.lastUpdate = Date.now();

                if (err) {
                    reject(err);
                    return;
                }

                switch (res.statusCode) {
                    case 200:
                        let { rows } = (typeof payload === 'string') ? JSON.parse(payload) : payload;
                        resolve(rows);
                        break;

                    default:
                        err = new Error('Request error.' + payload);
                        err.code = res.statusCode;
                        reject(err);
                        break;
                }
            });
        });
    }

    _filter(rows) {
        if (rows.length) {
            // Remove any already visited records and create a new
            // store of current records for the next update.
            let current = {};
            rows = rows.filter(row => {
                let { id, key: rev } = row;
                let key = id + rev;

                current[key] = 1;
                return !(key in this.visited);
            });
            this.visited = current;
        }

        return rows;
    }
}