import log from "../auxta/services/log.service";
import {captureScreenshot} from "../auxta/utilities/screenshot.helper";
import {onTestEnd} from "../auxta/hooks/report.hook";
import auxta from "../AuxTA";
import {StatusOfStep} from "../auxta/enums/status-of.step";
import {UploadModel} from "../auxta/models/upload.model";
import {config} from "../auxta/configs/config";
import {retrySuite} from "../auxta/utilities/start-suite.helper";
import {postNotificationsOnFail} from "../auxta/services/report.service";
// @ts-ignore
//import puppeteer = require("puppeteer-extra");
// @ts-ignore
import puppeteer = require("puppeteer");

export class Puppeteer {
    public defaultPage!: puppeteer.Page;
    private browser!: puppeteer.Browser;

    public async startBrowser() {
        let args = [];
        let env = {};
        if (process.env.ENVIRONMENT === 'LOCAL') {
            args.push('--start-maximized');
        }

        args.push(`--window-size=${config.screenWidth ? config.screenWidth : 1920},${config.screenHeight ? config.screenHeight : 1080}`)
        // needed because without these tree tags in doesn't work
        args.push("--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu")
        env = {
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
            headless: process.env.ENVIRONMENT === 'LOCAL' ? (process.env.headless === 'true' ? true : false) : true
        });
        this.defaultPage = (await this.browser.pages())[0];
        await auxta.extend_page_functions(this.defaultPage);
        await this.defaultPage.goto(config.baseURL, {waitUntil: 'networkidle0'})
        await this.defaultPage.waitForNetworkIdle();
    }

    public async close() {
        if (this.browser) {
            let pages = await this.browser.pages();
            await Promise.all(pages.map((page: { close: () => any; }) => page.close()));
            await this.browser.close();
        }
    }

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
            try {
                log.push('When', `Starting puppeteer process`, StatusOfStep.PASSED);
                await this.startBrowser()
                this.defaultPage.on('console', (message: any) =>
                    consoleMessage.push(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
                    // @ts-ignore
                    .on('pageerror', ({message}) => consoleMessage.push(message))
                    .on('response', (response: any) =>
                        httpsMessage.push(`${response.status()} ${response.url()}`))
                    .on('requestfailed', (request: any) =>
                        httpsMessage.push(`${request.failure() !== null ? request.failure()?.errorText : ""} ${request.url()}`))
                await callback(event)
                log.push('When', `Finished puppeteer process`, StatusOfStep.PASSED);
            } catch (err: any) {
                console.log("Error message: \n", err);
                let browser_start_retry = err.toString().includes("Failed to launch the browser process!");
                const pages = await this.defaultPage.browser().pages();
                consoleMessage.push('pages');
                consoleMessage.push(pages.length);
                if (browser_start_retry) {
                    const result = await retrySuite(uploadModel.nextSuites, uploadModel.reportId, uploadModel.currentSuite, uploadModel.retries);
                    if (!result) {
                        return await onTestEnd(uploadModel, featureName, scenarioName, statusCode, screenshotBuffer, !errMessage ? undefined : {
                            currentPageUrl: 'undefined',
                            console: consoleMessage,
                            https: httpsMessage,
                            error: 'Browser did not open'
                        });
                    }
                    return {statusCode: 204}
                }
                errMessage = err;
                statusCode = 500;
                screenshotBuffer = await captureScreenshot();
                log.push('When', `Finished puppeteer process`, StatusOfStep.FAILED);
                await postNotificationsOnFail(uploadModel);
            }
            let url = this.defaultPage.url();
            if (close) await this.close();

            return await onTestEnd(uploadModel, featureName, scenarioName, statusCode, screenshotBuffer, !errMessage ? undefined : {
                currentPageUrl: url,
                console: consoleMessage,
                https: httpsMessage,
                error: errMessage
            });
        } catch (e) {
            console.log("Lib error:", e);
        } finally {
            log.clear();
        }
    }

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
                await log.push('When', `Starting puppeteer process`, StatusOfStep.PASSED);
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
                log.push('When', `Finished puppeteer process`, StatusOfStep.PASSED);
            } catch (err: any) {
                console.log("Error message: \n", err);
                let browser_start_retry = err.toString().includes("Failed to launch the browser process!");

                if (browser_start_retry) {
                    await retrySuite([], '', uploadModel.currentSuite, uploadModel.retries);
                    return {statusCode: 204}
                }
                errMessage = err;
                log.push('When', `Finished puppeteer process`, StatusOfStep.FAILED);
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
}

export default new Puppeteer();