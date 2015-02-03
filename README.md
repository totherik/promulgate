promulgate
==========

A readable stream that returns npm modules as they're published. Heavily inspired by [npm-publish-stream](https://github.com/rvagg/npm-publish-stream).

#### Basic Example
```javascript
import Through from 'through2';
import Promulgate from 'promulgate';

let read = Promulgate.createReadStream(/*host, interval*/);

let write = Through.obj((data, _, done) => {
	console.log(data.id);
	done();
};

read.pipe(write);
```
