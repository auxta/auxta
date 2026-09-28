import log from "../../auxta/services/log.service";
import {StatusOfStep} from "../../auxta/enums/status-of.step";
import {config} from "../../auxta/configs/config";

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
    const failedRequests = (page.__auxtaFailedRequests ?? []).slice(-10).join(', ') || 'none';
    const details = `reason: ${reason} | url: ${url} | page text: ${text} | failed requests: ${failedRequests}`;
    console.log(`${new Date().toISOString()} Failure details -- ${details}`);
    return details;
}

export class ExtendDefaultPage {
    public defaultTimeout: number = config.timeout;

    public async extend_page_functions(page: any, time = this.defaultTimeout) {
        this.defaultTimeout = config.timeout
        // Keep the last failed requests of this page, a failed script request leaves the app blank without any error step
        if (!page.__auxtaFailedRequests) {
            page.__auxtaFailedRequests = [];
            page.on('requestfailed', (request: any) => {
                const entry = `${new Date().toISOString()} ${request.failure()?.errorText ?? 'unknown error'} ${request.url()}`;
                page.__auxtaFailedRequests.push(entry);
                if (page.__auxtaFailedRequests.length > 50) page.__auxtaFailedRequests.shift();
            });
        }
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
            try {
                await page.waitForSelector(selector, {
                    timeout: time
                });
                let elementName = await page.$eval(selector, (e: { textContent: any; }) => e.textContent);
                if (!elementName || elementName === ' ') elementName = selector;
                await original_click.apply(page, arguments);
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
        page.type = async function type(field: any, value?: any) {
            try {
                await page.waitForSelector(field, {
                    timeout: time
                });
                await original_type.apply(page, arguments);
                let elementName = await page.$eval(field, (e: { textContent: any; }) => e.textContent);
                if (!elementName || elementName === ' ') elementName = field;
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