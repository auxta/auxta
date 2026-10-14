import log from "../../auxta/services/log.service";
import {StatusOfStep} from "../../auxta/enums/status-of.step";
import {config} from "../../auxta/configs/config";
import {printNetLogFor} from "../../auxta/utilities/net-log.helper";

/**
 * Describes why a step failed: the underlying error, the current URL and the start of the visible page text.
 * The generic step messages alone don't show whether the page was an error page, still loading or navigating.
 */
export async function describePageFailure(page: any, error: any) {
    const reason = String(error?.message ?? error).split('\n')[0];
    let url = '';
    let text = '';
    try {
        url = page.url();
        text = await page.evaluate(() => (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 300));
    } catch (e: any) {
        text = `(page text unavailable: ${String(e?.message ?? e).split('\n')[0]})`;
    }
    const details = `reason: ${reason} | url: ${url} | page text: ${text} | ${pageProblemsSummary(page)}`;
    console.log(`${new Date().toISOString()} Failure details -- ${details}`);
    printNetLogFor(failedRequestUrls(page));
    return details;
}

const MAX_TRACKED_PROBLEMS = 50;

function pushLimited(list: string[], entry: string) {
    list.push(entry);
    if (list.length > MAX_TRACKED_PROBLEMS) list.shift();
}

/**
 * Keeps the last failed requests and console errors of a page.
 * A failed script request leaves an app blank without any failing step, so these are the only trace of the cause.
 * Failed requests come from CDP, which also says whether Chrome cancelled or blocked the request and why.
 */
export async function trackPageProblems(page: any) {
    if (page.__auxtaFailedRequests) return;
    page.__auxtaFailedRequests = [];
    page.__auxtaConsoleErrors = [];

    page.on('console', (message: any) => {
        const text = message.text();
        // The CSP inline style warnings are constant noise that would push the useful errors out
        if (message.type() === 'error' && !text.startsWith('Refused to apply inline style')) {
            pushLimited(page.__auxtaConsoleErrors, `${new Date().toISOString()} ${text.slice(0, 200)}`);
        }
    });
    page.on('pageerror', (error: any) => {
        pushLimited(page.__auxtaConsoleErrors, `${new Date().toISOString()} uncaught: ${String(error?.message ?? error).slice(0, 200)}`);
    });

    try {
        const cdp = await page.createCDPSession();
        const requests = new Map<string, string>();
        cdp.on('Network.requestWillBeSent', (event: any) => requests.set(event.requestId, event.request.url));
        cdp.on('Network.loadingFinished', (event: any) => requests.delete(event.requestId));
        cdp.on('Network.loadingFailed', (event: any) => {
            const why = [
                event.type,
                event.canceled ? 'canceled' : '',
                event.blockedReason ? `blocked: ${event.blockedReason}` : '',
                event.corsErrorStatus?.corsError ? `cors: ${event.corsErrorStatus.corsError}` : ''
            ].filter(Boolean).join(', ');
            pushLimited(page.__auxtaFailedRequests, `${new Date().toISOString()} ${event.errorText} (${why}) ${requests.get(event.requestId) ?? event.requestId}`);
            requests.delete(event.requestId);
        });
        await cdp.send('Network.enable');
    } catch (e) {
        page.on('requestfailed', (request: any) => {
            pushLimited(page.__auxtaFailedRequests, `${new Date().toISOString()} ${request.failure()?.errorText ?? 'unknown error'} ${request.url()}`);
        });
    }
}

export function pageProblemsSummary(page: any) {
    const failedRequests = (page.__auxtaFailedRequests ?? []).slice(-10).join(', ') || 'none';
    const consoleErrors = (page.__auxtaConsoleErrors ?? []).slice(-5).join(', ') || 'none';
    return `failed requests: ${failedRequests} | console errors: ${consoleErrors}`;
}

export function failedRequestUrls(page: any): string[] {
    // Entries end with the URL, see trackPageProblems
    return (page.__auxtaFailedRequests ?? []).map((entry: string) => entry.split(' ').pop()).filter(Boolean);
}

export function clearPageProblems(page: any) {
    if (page.__auxtaFailedRequests) page.__auxtaFailedRequests.length = 0;
    if (page.__auxtaConsoleErrors) page.__auxtaConsoleErrors.length = 0;
}

// How long a click waits for an overlay (dialog mask, toast, loader) to move away before clicking anyway
const MAX_COVERED_WAIT = 10000;

/**
 * Returns what covers the centre of the element, where the click lands, or '' when nothing does.
 * Runs in the browser, so it can't use anything from this file.
 */
function coveringElement(element: Element): string {
    const rect = element.getBoundingClientRect();
    const left = Math.max(rect.left, 0), right = Math.min(rect.right, window.innerWidth);
    const top = Math.max(rect.top, 0), bottom = Math.min(rect.bottom, window.innerHeight);
    if (right <= left || bottom <= top) {
        // Centring keeps the element clear of sticky headers and footers
        element.scrollIntoView({block: 'center', inline: 'center'});
        return 'outside the viewport';
    }
    const root = element.getRootNode() as Document | ShadowRoot;
    const hit = root.elementFromPoint((left + right) / 2, (top + bottom) / 2);
    if (!hit || hit === element || element.contains(hit) || hit.contains(element)) return '';
    const id = hit.id ? `#${hit.id}` : '';
    const classes = typeof hit.className === 'string' && hit.className.trim() ? '.' + hit.className.trim().split(/\s+/).join('.') : '';
    return `${hit.tagName.toLowerCase()}${id}${classes}`;
}

/**
 * Waits until the element is visible and nothing covers it.
 * A covered element still gets "clicked", but the click lands on the overlay and the step passes without doing anything.
 * If it stays covered the click goes ahead as before and the report says what was in the way.
 */
async function waitUntilNotCovered(page: any, selector: string, time: number) {
    const handle = await page.locator(selector).setTimeout(time).setVisibility('visible').waitHandle();
    await handle.dispose();
    const deadline = Date.now() + Math.min(time, MAX_COVERED_WAIT);
    let cover = '';
    do {
        cover = await page.$eval(selector, coveringElement).catch(() => '');
        if (!cover) return;
        await new Promise(r => setTimeout(r, 100));
    } while (Date.now() < deadline);
    log.push('Then', log.tag, `The '${selector}' was covered by '${cover}', clicking it anyway`, StatusOfStep.LOG);
}

async function typeWhenReady(page: any, field: string, value: any, options: any, time: number) {
    const handle = await page.locator(field).setTimeout(time).setVisibility('visible').waitHandle();
    try {
        await handle.type(value, options);
    } finally {
        await handle.dispose();
    }
}

export class ExtendDefaultPage {
    public defaultTimeout: number = config.timeout;

    public async extend_page_functions(page: any, time = this.defaultTimeout) {
        this.defaultTimeout = config.timeout
        await trackPageProblems(page);
        const {
            goto: original_goto,
            click: original_click,
            type: original_type,
            waitForNetworkIdle: original_waitForNetworkIdle
        } = page;
        page.goto = function goto(url: any, options?: any) {
            log.push('Then', log.tag, `I go to the '${url}' page`, StatusOfStep.PASSED);
            return original_goto.apply(page, arguments);
        };
        page.click = async function click(selector: any, options?: any) {
            if (typeof selector !== 'string') return original_click.apply(page, arguments);
            try {
                await waitUntilNotCovered(page, selector, time);
                let elementName = await page.$eval(selector, (e: { textContent: any; }) => e.textContent?.trim()).catch(() => '');
                if (!elementName) elementName = selector;
                // The locator re-queries the element and waits until it is visible, in the viewport, not moving and enabled
                await page.locator(selector).setTimeout(time).setVisibility('visible').click(options);
                log.push('Then', log.tag, `I click on the '${elementName}'`, StatusOfStep.PASSED);
            } catch (e) {
                const msg = `I click on the '${selector}'`;
                log.push('Then', log.tag, msg, StatusOfStep.FAILED);
                throw new Error(`${msg} (${await describePageFailure(page, e)})`)
            }
        };
        page.waitForNetworkIdle = async function waitForNetworkIdle(selector: any, option?: any) {
            let message = 'I wait for the page to load'
            let result
            try {
                result = await original_waitForNetworkIdle.apply(page, arguments);
                log.push('Then', log.tag, message, StatusOfStep.PASSED);
            } catch (e) {
                log.push('Then', log.tag, message, StatusOfStep.FAILED);
                throw new Error(`${message} (${await describePageFailure(page, e)})`)
            }
            return result
        }
        page.type = async function type(field: any, value?: any, options?: any) {
            if (typeof field !== 'string') return original_type.apply(page, arguments);
            try {
                await typeWhenReady(page, field, value, options, time);
                let elementName = await page.$eval(field, (e: { textContent: any; }) => e.textContent?.trim()).catch(() => '');
                if (!elementName) elementName = field;
                log.push('Then', log.tag, `I type '${value}' into the '${elementName}' field`, StatusOfStep.PASSED);
            } catch (e) {
                const msg = `I type '${value}' into the '${field}' field`
                log.push('Then', log.tag, msg, StatusOfStep.FAILED);
                throw new Error(`${msg} (${await describePageFailure(page, e)})`)
            }
        }
        return page;
    }


}

export default new ExtendDefaultPage();