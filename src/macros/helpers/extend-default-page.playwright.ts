import log from "../../auxta/services/log.service";
import {StatusOfStep} from "../../auxta/enums/status-of.step";
import {config} from "../../auxta/configs/config";
import { Page } from "playwright";

export class ExtendDefaultPagePlaywright {
    public defaultTimeout: number = config.timeout;

    public async extend_page_functions(page: Page, time = this.defaultTimeout) {
        this.defaultTimeout = config.timeout;

        // Store original methods
        const original_goto = page.goto.bind(page);
        const original_click = page.click.bind(page);
        const original_fill = page.fill.bind(page);
        const original_waitForLoadState = page.waitForLoadState.bind(page);

        // Override goto
        (page as any).goto = async function goto(url: string, options?: any) {
            log.push('Then', log.tag, `I go to the '${url}' page`, StatusOfStep.PASSED);
            return original_goto(url, options);
        };

        // Override click
        (page as any).click = async function click(selector: string, options?: any) {
            try {
                await page.waitForSelector(selector, {
                    timeout: time
                });
                let elementName: string | null = null;
                try {
                    elementName = await page.$eval(selector, (e: Element) => e.textContent);
                } catch { /* ignore */ }
                if (!elementName || elementName.trim() === '') elementName = selector;
                await original_click(selector, options);
                log.push('Then', log.tag, `I click on the '${elementName}'`, StatusOfStep.PASSED);
            } catch (e) {
                const msg = `I click on the '${selector}'`;
                log.push('Then', log.tag, msg, StatusOfStep.FAILED);
                throw new Error(msg);
            }
        };

        // Override waitForLoadState (equivalent to waitForNetworkIdle)
        (page as any).waitForNetworkIdle = async function waitForNetworkIdle(options?: any) {
            let message = 'I wait for the page to load';
            try {
                await original_waitForLoadState('networkidle', options);
                log.push('Then', log.tag, message, StatusOfStep.PASSED);
            } catch (e) {
                log.push('Then', log.tag, message, StatusOfStep.FAILED);
                throw new Error(message);
            }
        };

        // Override fill (equivalent to type in Puppeteer)
        (page as any).type = async function type(field: string, value: string, options?: any) {
            try {
                await page.waitForSelector(field, {
                    timeout: time
                });
                await original_fill(field, value);
                let elementName: string | null = null;
                try {
                    elementName = await page.$eval(field, (e: Element) => e.textContent);
                } catch { /* ignore */ }
                if (!elementName || elementName.trim() === '') elementName = field;
                log.push('Then', log.tag, `I type '${value}' into the '${elementName}' field`, StatusOfStep.PASSED);
            } catch (e) {
                const msg = `I type '${value}' into the '${field}' field`;
                log.push('Then', log.tag, msg, StatusOfStep.FAILED);
                throw new Error(msg);
            }
        };

        return page;
    }
}

export default new ExtendDefaultPagePlaywright();
