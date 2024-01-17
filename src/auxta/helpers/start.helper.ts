import {join} from 'path';

(async () => {
    const r = /^--params\.suite=(.*)$/g;
    let suite = process.argv.find(el => !!el.match(r));
    if (!suite) throw `Locale is undefined`;
    let suites = suite.replace('--params.suite=', '');
    let suitesArr = suites.split(',');
    if (!suitesArr) suitesArr = [suites];
    for (const suite of suitesArr) {
        let f = require(join(process.cwd(), 'build', 'functions', 'controllers', suite));
        await f.handler();
    }
})();