import auxta from "../AuxTA";
import {config} from "../auxta/configs/config";
// @ts-ignore
import puppeteer_extra = require("puppeteer-extra");
// @ts-ignore
import puppeteer = require("puppeteer");

export class PuppeteerExtra {
    public defaultPage!: puppeteer.Page;
    private browser!: puppeteer.Browser;

    public async startBrowser() {
        let args = [];
        let env = {};
        if (process.env.ENVIRONMENT === 'LOCAL') {
            args.push('--start-maximized');
        }

        if (process.env.ENVIRONMENT != 'LOCAL') {
            args.push(`--window-size=${config.screenWidth ? config.screenWidth : 1920},${config.screenHeight? config.screenHeight : 1080}`)
            // needed because without these tree tags in doesn't work
            args.push("--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu")
            env = {
                DISPLAY: ":10.0"
            }
        }
        const StealthPlugin = require('puppeteer-extra-plugin-stealth')
        puppeteer_extra.default.use(StealthPlugin());
        this.browser = await puppeteer_extra.default.launch({
            slowMo: process.env.slowMo ? Number(process.env.slowMo) : 0,
            executablePath: puppeteer_extra.default.executablePath(),
            args,
            env,
            ignoreDefaultArgs: ["--enable-automation"],
            defaultViewport: process.env.ENVIRONMENT === 'LOCAL' ? null : {
                width: config.screenWidth,
                height: config.screenHeight
            },
            // Return back to headless for netlify
            headless: process.env.ENVIRONMENT === 'LOCAL' ? (process.env.headless === 'true' ? 'new' : false) : 'new'
        });
        this.defaultPage = (await this.browser.pages())[0];
        await auxta.extend_page_functions(this.defaultPage);
    }

    public async close() {
        if (this.browser) {
            let pages = await this.browser.pages();
            await Promise.all(pages.map((page: { close: () => any; }) => page.close()));
            await this.browser.close();
        }
    }
}

export default new PuppeteerExtra();