import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {config} from "../configs/config";

/**
 * Chrome's own network log, enabled with "netLog": true in auxta.json or AUXTA_NET_LOG=true.
 * It records the internal reason behind failed requests (e.g. a bare net::ERR_FAILED), which neither
 * puppeteer nor the server logs show. Off by default, the file grows with every request of the run.
 */
let netLogPath: string | undefined;

export function isNetLogEnabled() {
    return config.netLog || process.env.AUXTA_NET_LOG === 'true';
}

/**
 * Returns the Chrome arguments that start the network log, or none when it is disabled.
 * The Default capture mode leaves out cookies and credentials, so typed passwords never end up in the file.
 */
export function netLogArgs(): string[] {
    removeNetLog();
    if (!isNetLogEnabled()) return [];
    netLogPath = path.join(os.tmpdir(), `auxta-netlog-${process.pid}-${Date.now()}.json`);
    console.log(`${new Date().toISOString()} Chrome network log enabled: ${netLogPath}`);
    return [`--log-net-log=${netLogPath}`, '--net-log-capture-mode=Default'];
}

export function removeNetLog() {
    if (netLogPath) fs.rmSync(netLogPath, {force: true});
    netLogPath = undefined;
}

/**
 * Prints what Chrome's network log recorded for the given failed URLs: the events of each request and the
 * network errors of the connections and jobs it depended on.
 *
 * @param urls - the failed request URLs, the most recent request for each URL is described
 * @param maxUrls - how many URLs to describe, failed chunks usually all fail the same way
 */
export function printNetLogFor(urls: string[], maxUrls = 3) {
    if (!netLogPath || urls.length === 0) return;
    try {
        const log = readNetLog(netLogPath);
        for (const url of [...new Set(urls)].slice(0, maxUrls)) {
            console.log(`${new Date().toISOString()} Chrome network log for ${url}: ${describeRequest(log, url)}`);
        }
    } catch (e: any) {
        console.log(`${new Date().toISOString()} Chrome network log unavailable: ${String(e?.message ?? e).split('\n')[0]}`);
    }
}

type NetLogEvent = { type: number, phase: number, time: string, source: { id: number, type: number }, params?: any };

interface NetLog {
    eventNames: Map<number, string>;
    errorNames: Map<number, string>;
    events: NetLogEvent[];
}

// Chrome writes the file while it runs as '{"constants": {...},\n"events": [\n{...},\n{...},' and only closes
// the JSON on exit, so it is read line by line instead of with JSON.parse on the whole file
function readNetLog(file: string): NetLog {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const constantsLine = lines.find(line => line.startsWith('{"constants":'));
    if (!constantsLine) throw new Error('no constants in the network log yet');
    const constants = JSON.parse(constantsLine.replace(/^\{"constants":/, '').replace(/,\s*$/, ''));
    const invert = (map: Record<string, number>) => new Map(Object.entries(map ?? {}).map(([name, id]) => [id, name]));
    const events: NetLogEvent[] = [];
    for (const line of lines) {
        if (!line.startsWith('{"params"') && !line.startsWith('{"phase"') && !line.startsWith('{"source"') && !line.startsWith('{"time"')) continue;
        try {
            events.push(JSON.parse(line.replace(/,\s*$/, '').replace(/]\s*}\s*$/, '')));
        } catch {
            // the last line can be half written
        }
    }
    return {eventNames: invert(constants.logEventTypes), errorNames: invert(constants.netError), events};
}

function describeRequest(log: NetLog, url: string) {
    const bySource = new Map<number, NetLogEvent[]>();
    for (const event of log.events) {
        const list = bySource.get(event.source.id);
        if (list) list.push(event); else bySource.set(event.source.id, [event]);
    }
    const eventsOf = (sourceId: number) => bySource.get(sourceId) ?? [];
    const hasError = (event: NetLogEvent) => event.params?.net_error !== undefined && event.params.net_error !== 0;

    // The URL is on several events of a request (REQUEST_ALIVE, CORS_REQUEST, ...), depending on the Chrome version.
    // A reload requests the same URL again, so prefer the most recent attempt that ended in an error
    const sourceIds = [...new Set(log.events.filter(event => event.params?.url === url).map(event => event.source.id))];
    if (sourceIds.length === 0) return 'no request for this URL in the log';
    const failedId = [...sourceIds].reverse().find(id => eventsOf(id).some(hasError));
    const request = {source: {id: failedId ?? sourceIds[sourceIds.length - 1]}};

    const format = (event: NetLogEvent) => {
        const phase = event.phase === 1 ? '+' : event.phase === 2 ? '-' : '';
        const error = event.params?.net_error !== undefined ? ` ${log.errorNames.get(event.params.net_error) ?? event.params.net_error}` : '';
        return `${phase}${log.eventNames.get(event.type) ?? event.type}${error}`;
    };

    const requestEvents = eventsOf(request.source.id);
    const described = requestEvents.slice(-25).map(format).join(' > ');

    // Connections and jobs the request depended on, where the underlying network error usually is
    const dependencyIds = new Set(requestEvents.map(event => event.params?.source_dependency?.id).filter((id: any) => id !== undefined));
    const dependencyErrors = [...dependencyIds].flatMap(id => eventsOf(id).filter(hasError).map(format));

    return `${described}${dependencyErrors.length ? ` | dependencies: ${dependencyErrors.slice(-10).join(', ')}` : ''}`;
}
