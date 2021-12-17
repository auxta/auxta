import chromium from 'chrome-aws-lambda';
import log from "../auxta/services/log.service";
import {captureScreenshot} from "../auxta/utilities/screenshot.helper";
import {onTestEnd} from "../auxta/hooks/report.hook";
import auxta from "../AuxTA";
import {StatusOfStep} from "../auxta/enums/status-of.step";
import {UploadModel} from "../auxta/models/upload.model";
import puppeteer_core from 'puppeteer-core';
import {config} from "./../auxta/configs/config";
import {postNotificationsOnFail} from "../auxta/services/report.service";


export class Puppeteer {
    public defaultPage!: puppeteer_core.Page;
    private browser!: puppeteer_core.Browser;

    public async startBrowser() {
        let args = [
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ];
        if (process.env.ENVIRONMENT != 'LOCAL')
            args.push(`--window-size=${config.screenWidth},${config.screenHeight}`)
        this.browser = await chromium.puppeteer.launch({
            executablePath: process.env.ENVIRONMENT === 'LOCAL' ? undefined : process.env.CHROME_PATH,
            args,
            ignoreDefaultArgs: ["--enable-automation"],
            defaultViewport: process.env.ENVIRONMENT === 'LOCAL' ? null : {
                width: config.screenWidth,
                height: config.screenHeight
            },
            // Return back to headless for netlify
            headless: process.env.ENVIRONMENT == 'LOCAL' ? false : chromium.headless
        });
        this.defaultPage = (await this.browser.pages())[0];
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

    public async run(event: any, callback: any, featureName = 'Test feature', scenarioName = 'Test scenario', uploadModel?: UploadModel, close?: boolean) {
        try {
            if (uploadModel === undefined) uploadModel = auxta.getUploadModel();
            if (close === undefined) close = Puppeteer.setupHeader(event, uploadModel)
            let screenshotBuffer: Buffer | undefined;
            let errMessage: any;
            let statusCode: number = 200;

            let consoleStack: any[] = [];
            try {
                await log.push('When', `Starting puppeteer process`, StatusOfStep.PASSED);
                await this.startBrowser()
                this.defaultPage.on('console', message =>
                    consoleStack.push(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
                    .on('pageerror', ({message}) => consoleStack.push(message))
                    .on('response', response =>
                        consoleStack.push(`${response.status()} ${response.url()}`))
                    .on('requestfailed', request =>
                        consoleStack.push(`${request.failure() !== null ? request.failure()?.errorText : ""} ${request.url()}`))
                await callback(event)
                log.push('When', `Finished puppeteer process`, StatusOfStep.PASSED);
            } catch (err) {
                console.log("Error", err);
                errMessage = err;
                statusCode = 500;
                screenshotBuffer = await captureScreenshot();
                log.push('When', `Finished puppeteer process`, StatusOfStep.FAILED);
                await postNotificationsOnFail(uploadModel)
            }
            let url = this.defaultPage.url();
            if (close) await this.close();

            await onTestEnd(uploadModel, featureName, scenarioName, statusCode, screenshotBuffer, !errMessage ? undefined : {
                currentPageUrl: url,
                console: consoleStack,
                error: errMessage
            });
        } catch (e) {
            console.log("Lib error:", e);
        } finally {
            log.clear();
        }
    }

    public async runRPA(event: any, callback: any, close?: boolean) {
        let errMessage: any;
        try {
            if (close === undefined) {
                if (event.queryStringParameters.close) {
                    close = event.queryStringParameters.close === "true";
                } else {
                    close = true
                }
            }
            let consoleStack: any[] = [];
            try {
                await log.push('When', `Starting puppeteer process`, StatusOfStep.PASSED);
                await this.startBrowser()
                this.defaultPage.on('console', message =>
                    consoleStack.push(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
                    .on('pageerror', ({message}) => consoleStack.push(message))
                    .on('response', response =>
                        consoleStack.push(`${response.status()} ${response.url()}`))
                    .on('requestfailed', request =>
                        consoleStack.push(`${request.failure() !== null ? request.failure()?.errorText : ""} ${request.url()}`))
                await callback(event)
                log.push('When', `Finished puppeteer process`, StatusOfStep.PASSED);
            } catch (err) {
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
        return true;
    }

    private static setupHeader(event: any, uploadModel: UploadModel) {
        let close = true;
        if (process.env.ENVIRONMENT !== 'LOCAL' && event.body) {
            const body = JSON.parse(event.body)
            uploadModel.reportId = body.reportId;
            uploadModel.nextSuites = body.nextSuites;
        } else if (event.queryStringParameters.close) {
            close = event.queryStringParameters.close === "true";
        }
        return close;
    }
}

export default new Puppeteer();
