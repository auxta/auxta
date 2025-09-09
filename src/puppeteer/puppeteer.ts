import log from "../auxta/services/log.service";
import {captureScreenshot} from "../auxta/utilities/screenshot.helper";
import {onTestEnd} from "../auxta/hooks/report.hook";
import auxta from "../AuxTA";
import {StatusOfStep} from "../auxta/enums/status-of.step";
import {UploadModel} from "../auxta/models/upload.model";
import {config} from "../auxta/configs/config";
import {retrySuite} from "../auxta/utilities/start-suite.helper";
import puppeteer = require("puppeteer");
import { attachUserConsoleCapture, UserConsoleEntry } from "../auxta/helpers/console-debug.helper"

export class Puppeteer {
    public defaultPage!: puppeteer.Page;
    private browser!: puppeteer.Browser;
    private userConsoleMessages: UserConsoleEntry[] = [];

    private static setupHeader(event: any, uploadModel: UploadModel) {
        let close = true;
        if (process.env.ENVIRONMENT !== 'LOCAL' && event) {
            uploadModel.reportId = event.reportId;
            uploadModel.nextSuites = event.nextSuites;
            uploadModel.currentSuite = event.currentSuite;
            uploadModel.retries = Number(event.retries);
        }
        try {
            if (event.close) {
                close = event.close === "true";
            }
            return close;
        } catch (e) {
            return true
        }
    }

    /**
     * Start the Browser with puppeteer
     *
     * @remarks
     * Starts the puppeteer with the given parameters either with browser or in headless mode
     *
     *
     */
    public async startBrowser() {
        let args = [];
        if (process.env.ENVIRONMENT === 'LOCAL') {
            args.push('--start-maximized');
        }

        args.push(`--window-size=${config.screenWidth ? config.screenWidth : 1920},${config.screenHeight ? config.screenHeight : 1080}`)
        // needed because without these tree tags in doesn't work
        args.push("--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu")
        args.push('--enable-automation=false');
        let env = {
            DISPLAY: ":10.0"
        }

        this.browser = await puppeteer.default.launch({
            slowMo: process.env.slowMo ? Number(process.env.slowMo) : 0,
            executablePath: puppeteer.default.executablePath(),
            args,
            env,
            ignoreDefaultArgs: ["--enable-automation"],
            defaultViewport: process.env.ENVIRONMENT === 'LOCAL' ? null : {
                width: config.screenWidth,
                height: config.screenHeight
            },
            // Return back to headless for netlify
            headless: process.env.ENVIRONMENT === 'LOCAL' ? (process.env.headless === 'true') : true
        });
        this.defaultPage = (await this.browser.pages())[0];
        await auxta.extend_page_functions(this.defaultPage);
        await this.defaultPage.goto(config.baseURL, {waitUntil: 'networkidle0'})
        await this.defaultPage.waitForNetworkIdle();
    }

    /**
     * Closers all browsers
     *
     * @remarks
     * This method closers all browsers
     *
     *
     */
    public async close() {
        if (this.browser) {
            let pages = await this.browser.pages();
            await Promise.all(pages.map((page: { close: () => any; }) => page.close()));
            await this.browser.close();
        }
    }

    private async initiateBrowser(consoleMessage: any[], httpsMessage: any []) {
        await this.startBrowser()
        this.browser.on('targetcreated', async (target) => {
            try {
                if (target.type() !== 'page') return;
                const page = await target.page();
                if (!page) return;
                attachUserConsoleCapture(page, (entry) => {
                this.userConsoleMessages.push(entry);
                if (this.userConsoleMessages.length > 300) this.userConsoleMessages.shift();
                });
            } catch {}
        });
        this.defaultPage.on('console', (msg: any) => {
            const t = typeof msg.type === 'function' ? msg.type() : (msg.type || '');
            if (t !== 'error' /* && t !== 'warning' */) return; 

            let loc = '';
            try {
                const l = typeof (msg as any).location === 'function' ? (msg as any).location() : undefined;
                if (l) {
                const at =
                    `${l.url || ''}` +
                    `${l.lineNumber != null ? ':' + l.lineNumber : ''}` +
                    `${l.columnNumber != null ? ':' + l.columnNumber : ''}`;
                loc = at ? ` @ ${at}` : '';
                }
            } catch {}

            const text = typeof msg.text === 'function' ? msg.text() : String(msg.text ?? '');
            if (text === 'pages' || /^\d+$/.test(text)) return;

            consoleMessage.push(`${String(t).toUpperCase()} ${text}${loc}`);
            })
            .on('pageerror', ({message}) => consoleMessage.push(message))
            .on('response', (response: any) =>
                httpsMessage.push(`${response.status()} ${response.url()}`))
            .on('requestfailed', (request: any) =>
                httpsMessage.push(`${request.failure() !== null ? request.failure()?.errorText : ""} ${request.url()}`))
            attachUserConsoleCapture(this.defaultPage, (entry) => {
                this.userConsoleMessages.push(entry);
                if (this.userConsoleMessages.length > 300) this.userConsoleMessages.shift()});
    }

    private async logFail(consoleMessage: any[]) {
        const pages = await this.defaultPage.browser().pages();
        consoleMessage.push('pages');
        consoleMessage.push(pages.length);
    }

    /**
     * This method is the main method that starts the given test
     *
     * @param event
     * @param callback - the main function code that need to be run in the browser
     * @param featureName
     * @param scenarioName
     * @param uploadModel - the given configuration that is going to be used to upload the test
     *
     *
     */
    public async run(event: any, callback: any, featureName = 'Test feature', scenarioName = 'Test scenario', uploadModel?: UploadModel) {
        let close;
        try {
            if (uploadModel === undefined) {
                uploadModel = auxta.getUploadModel();
                uploadModel.featureName = featureName;
                uploadModel.scenarioName = scenarioName;
            }
            if (event.close === undefined) close = Puppeteer.setupHeader(event, uploadModel)
            let screenshotBuffer: Buffer | undefined;
            let errMessage: any;
            let statusCode: number = 200;

            let consoleMessage: any [] = [];
            let httpsMessage: any [] = [];

            log.push('When', log.tag, `Starting puppeteer process`, StatusOfStep.PASSED);
            
            try {
                await this.initiateBrowser(consoleMessage, httpsMessage);
                await callback(event)
                log.push('When', log.tag, `Finished puppeteer process`, StatusOfStep.PASSED);
            } catch (err: any) {
                console.log("Error message: \n", err);
                if (process.env.ENVIRONMENT !== 'LOCAL') {
                    if (uploadModel.toRetry) {
                        log.clear(); // Clear the logs to avoid the scenario being flagged as FAILED
                        log.clearTag();
                        log.push('When', log.tag, `Retrying puppeteer process`, StatusOfStep.PASSED);
                        try {
                            await this.close();
                            await this.initiateBrowser(consoleMessage, httpsMessage);
                            await callback(event);
                            log.push('When', log.tag, `Finished puppeteer process from the 2nd try`, StatusOfStep.PASSED);
                        } catch (err: any) {
                            this.logFail(consoleMessage)
                            errMessage = err;
                            statusCode = 500;
                            screenshotBuffer = await captureScreenshot();
                            log.push('When', log.tag, `Failed puppeteer process from the 2nd try`, StatusOfStep.FAILED);
                        }
                    } else {
                        this.logFail(consoleMessage)
                        errMessage = err;
                        statusCode = 500;
                        screenshotBuffer = await captureScreenshot();

                        log.push('When', log.tag, `Finished puppeteer process`, StatusOfStep.FAILED);
                    }
                }
            }
            let url = this.defaultPage.url();
            if (close) await this.close();
            const debugCandidate = this.userConsoleMessages.slice(-150);
            
            return await onTestEnd(uploadModel, featureName, scenarioName, statusCode, screenshotBuffer, !errMessage ? undefined : {
                currentPageUrl: url,
                console: consoleMessage,
                https: httpsMessage,
                error: errMessage,
                debugCandidate
            });
        } catch (e) {
            console.log("Lib error:", e);
        } finally {
            this.userConsoleMessages = [];
            log.clear();
        }
    }

    /**
     * This method can be used to start the browser and run the test when live without uploading them
     *
     * @param event
     * @param callback - the main function code that need to be run in the browser
     * @param uploadModel - the given configuration that is going to be used to upload the test
     * @param close
     *
     */
    public async runRPA(event: any, callback: any, uploadModel?: UploadModel, close?: boolean) {
        let errMessage: any;
        try {
            if (uploadModel === undefined) uploadModel = auxta.getUploadModel();
            if (close === undefined) {
                try {
                    if (event.close) {
                        close = event.close === "true";
                    } else {
                        close = true
                    }
                    if (event.retries) {
                        uploadModel.retries = Number(event.retries)
                    }
                } catch (e) {
                    close = true;
                }
            }
            let consoleStack: any[] = [];
            try {
                await log.push('When', log.tag, `Starting puppeteer process`, StatusOfStep.PASSED);
                await this.startBrowser()
                this.defaultPage.on('console', (message: any) =>
                    consoleStack.push(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
                    // @ts-ignore
                    .on('pageerror', ({message}) => consoleStack.push(message))
                    .on('response', (response: any) =>
                        consoleStack.push(`${response.status()} ${response.url()}`))
                    .on('requestfailed', (request: any) =>
                        consoleStack.push(`${request.failure() !== null ? request.failure()?.errorText : ""} ${request.url()}`))
                await callback(event)
                log.push('When', log.tag, `Finished puppeteer process`, StatusOfStep.PASSED);
            } catch (err: any) {
                console.log("Error message: \n", err);
                let browser_start_retry = err.toString().includes("Failed to launch the browser process!");

                if (browser_start_retry) {
                    await retrySuite([], '', uploadModel.currentSuite, uploadModel.retries);
                    return {statusCode: 204}
                }
                errMessage = err;
                log.push('When', log.tag, `Finished puppeteer process`, StatusOfStep.FAILED);
                return errMessage;
            }
            if (close) await this.close();
        } catch (e) {
            console.log("Lib error:", e);
        } finally {
            log.clear();
        }
        return {statusCode: 200}
    }
}

export default new Puppeteer();