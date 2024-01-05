import FunctionHelper from "../helpers/code.helper";
import StatusOfStep from "../../auxta/enums/status-of.step";

const fs = require('fs');
const readline = require('readline');
// @ts-ignore
import googleType = require("googleapis");
import * as process from "process";

const {google} = require("googleapis");

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
    'https://www.googleapis.com/auth/gmail.addons.current.message.action',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
    'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.insert',
];
const TOKEN_PATH = 'token.json';

let TOKEN: string;

let TOKENS = [
    {"access_token":"ya29.a0AfB_byBxWTRPqnu3nL6bUzCCGdJl9skLupcJH8q0GSEAkimkkvQaKSkXimshAzJWQz4nmyYQ_cW7p9iYNDnT2zlJYk4j1eeVDI7YT80uhxPmLOw3Dcn7IY9cbhZK0_lgRBm8CCrBVVRPzkfVSnAF3D3wuW3-sLr22qt4aCgYKAcYSARASFQHGX2Mi1lEgWolMYxlejnZD-kjcDQ0171","refresh_token":"1//09YdEzFTKqqYxCgYIARAAGAkSNwF-L9IrL8CtoJKFamnKWiHs-kTBaZXfSWY15jTLMeLSJzT-St1OVpHfCCumEkJorO8hg29wGXI","scope":"https://www.googleapis.com/auth/gmail.addons.current.message.action https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.addons.current.action.compose https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.insert https://www.googleapis.com/auth/gmail.addons.current.message.metadata https://www.googleapis.com/auth/gmail.labels https://mail.google.com/ https://www.googleapis.com/auth/gmail.addons.current.message.readonly https://www.googleapis.com/auth/gmail.readonly","token_type":"Bearer","expiry_date":1702994988534},
    {"access_token":"ya29.a0AfB_byB-QxjIsHwSU7lbD2FpCMz2rK7p1Tzohl9BjeQUK_nFsEzqww4uQK086INqwTLENLXYVVq09hW7nRuhEg15MYtWo9xbU-nRtAMvzG5aLGPKOXl9mkWBR1cCsgtBPoxl7Klc_jnvH0PnC0TYwISoUqm9W-5c6fFraCgYKAQgSARASFQHGX2Minj2IKMCYkue3rCSMmM_h8g0171","refresh_token":"1//09YMAAKDjzZ3VCgYIARAAGAkSNwF-L9Ir62E-caPL0S0qKj1phMtHSk3nQWFBW7YAyl7Nh8oSJ6WSXd2NvzHt0Hwf-i85GLF6grE","scope":"https://mail.google.com/ https://www.googleapis.com/auth/gmail.addons.current.message.metadata https://www.googleapis.com/auth/gmail.insert https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.addons.current.action.compose https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.addons.current.message.action https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.addons.current.message.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.labels","token_type":"Bearer","expiry_date":1702995163803},
    {"access_token":"ya29.a0AfB_byDVVHpB9LKHhdmD5nInQJHTGU8Ky0JHf2wRNtZB1HJHqod7Pme_0CHSy6vO5pNNaVPpyO8H3vNQ9jA6AGJLc82AKI3mGTsGmaIQFRQr02nhPTFuTY7Gl-_iR5lgZM6BmB5koWccOT6Xe9pl5ND5T8FVlRSRLvitaCgYKAdUSARASFQHGX2Mi2iH-ZeiaxFELglikw-okOw0171","refresh_token":"1//09YD8dwZN5F1RCgYIARAAGAkSNwF-L9Irfie38zhzgw1ue4oEgR5Xc89BgiZHs1vcm8Tf6ROJfuCrnhsWLhr4oFkNlQ6UbJgU7GA","scope":"https://www.googleapis.com/auth/gmail.insert https://www.googleapis.com/auth/gmail.addons.current.message.metadata https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.addons.current.action.compose https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.addons.current.message.action https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.labels https://mail.google.com/ https://www.googleapis.com/auth/gmail.addons.current.message.readonly","token_type":"Bearer","expiry_date":1702995310295},
    {"access_token":"ya29.a0AfB_byBKWIknMT7E8yzyFjfNIzl_y_I73sP71YadO-yoKjphk6mvdSwOaYooLYYuZrHit8bYt0ERrX8mhkE1WGdiNcWGpBliS0s1Ved2DWJqkMlYsgnzz-4uAByodSHaxoqbnI0L1vCsqkJvvO4AJYUAIcSjf4z162gRaCgYKAT8SARASFQHGX2Mib4ndKaU92xuMBjUVD990GQ0171","refresh_token":"1//09BZILsMOzERdCgYIARAAGAkSNwF-L9IryuSQRewZs9LSuCSdXdmfimL18Edof34Mo5UrC-FGuGHED7519THwrYLFoOFJe18TgRk","scope":"https://www.googleapis.com/auth/gmail.addons.current.message.action https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.addons.current.message.readonly https://mail.google.com/ https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/gmail.addons.current.message.metadata https://www.googleapis.com/auth/gmail.insert https://www.googleapis.com/auth/gmail.addons.current.action.compose https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.send","token_type":"Bearer","expiry_date":1702995376462},
    {"access_token":"ya29.a0AfB_byABK1ECnRhzxM2_5FzN4XdwBG2q-qWDZlCJ2oZ2g7-k_QFgdyyICP99rQJuOyIU5t6NU9wSRsxL-hrk6kf2BmC2rW7ltdRw14h_n-nFPSk9Gg8979iuqvvfEokd9dIkY_MwhOYGiz7rP6aUwqjEAXDjg6FAieL1aCgYKAdsSARASFQHGX2Mim1Y5ousgcVP835Epj10Xww0171","refresh_token":"1//09yqHMectr6qjCgYIARAAGAkSNwF-L9IrITv60RhPCDiL8POjD0Uy8CvxPDc7hmWrvL7zLCOcxNACUWDpTnQyqkOYRGWyF3pyNaI","scope":"https://www.googleapis.com/auth/gmail.addons.current.message.action https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.addons.current.action.compose https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.insert https://www.googleapis.com/auth/gmail.addons.current.message.metadata https://mail.google.com/ https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/gmail.addons.current.message.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.readonly","token_type":"Bearer","expiry_date":1702995426413}
]

let EMAIL: string;
let PASSWORD: string;


export class AuxGoogleAuth {
    // @ts-ignore
    private static _oAuth2Client: googleType.Auth.OAuth2Client

    private static credentialsJson = {
        "installed": {
            "client_id": "120362272213-usevfijf76jj5nsr502i2lai6nu71oq8.apps.googleusercontent.com",
            "project_id": "auxta-library",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": "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",
            "redirect_uris": ["https://auxcode.com"]
        }
    };

    static get oAuth2Client(): googleType.Auth.OAuth2Client {
        return this._oAuth2Client;
    }

    static get googleClient(): googleType.GoogleApis {
        return google;
    }

    static get gmailClient(): googleType.gmail_v1.Gmail {
        return google.gmail({version: 'v1', auth: this._oAuth2Client});
    }

    public static async setupBrowser() {
        await this.authorize(this.credentialsJson);
    }

    public static async setEmailPassword(email: string, password: string) {
        EMAIL = email
        PASSWORD = password
        console.log(EMAIL,PASSWORD);
    }

    public static async setupHeadless() {
        await this.authorizeHeadless(this.credentialsJson);
    }

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     * @param {Object} credentials The authorization client credentials.
     */
    private static async authorize(credentials: any) {
        const {client_secret, client_id, redirect_uris} = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        // Check if we have previously stored a token.
        try {
            let token = fs.readFileSync(TOKEN_PATH);
            if (token.length > 0 && token !== undefined) {
                oAuth2Client.setCredentials(JSON.parse(token));
                this._oAuth2Client = oAuth2Client;
                return;
            }
            await this.getNewToken(oAuth2Client);
        } catch (e) {
            await this.getNewToken(oAuth2Client);
        }

    }

    private static async authorizeHeadless(credentials: any) {
        const {client_secret, client_id, redirect_uris} = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        // Check if we have previously stored a token.
        try {
            if (TOKEN) {
                oAuth2Client.setCredentials(TOKEN);
                this._oAuth2Client = oAuth2Client;
                FunctionHelper.log('Then', 'Getting the existing token', StatusOfStep.PASSED);
                return;
            }
            await this.getNewTokenHeadless(oAuth2Client);
        } catch (e) {
            FunctionHelper.log('Then', 'Getting the existing token', StatusOfStep.FAILED);
        }

    }

    /**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
     */
    private static async getNewToken(oAuth2Client: any) {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the code from that page here: ', (code: string) => {
            rl.close();
            oAuth2Client.getToken(code, (err: any, token: any) => {
                if (err) return console.error('Error retrieving access token', err);
                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err: any) => {
                    if (err) return console.error(err);
                    console.log('Token stored to', TOKEN_PATH);
                });
                this._oAuth2Client = oAuth2Client;
            });
        });
    }

    private static async getNewTokenHeadless(oAuth2Client: any) {
        /*
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: SCOPES,
        });

        const code = await this.LogIn(authUrl);
        */

        const position = Math.floor(Math.random() * 6);
        const token = TOKENS[position];
        oAuth2Client.setCredentials(token);
        this._oAuth2Client = oAuth2Client;
        FunctionHelper.log('Then', 'I login with the google account', StatusOfStep.PASSED);

/**
        this._oAuth2Client = await (new Promise(async (resolve, reject) => {
            await oAuth2Client.getToken(code, (err: any, token: any) => {
                if (err) return console.error('Error retrieving access token', err);
                oAuth2Client.setCredentials(token);
                TOKEN = token;
                this._oAuth2Client = oAuth2Client;
                FunctionHelper.log('Then', 'I login with the google account', StatusOfStep.PASSED);
                resolve(oAuth2Client);
            });
        }));*/
    }
/*
    private static async LogIn(authUrl: string) {
        const email = EMAIL ? EMAIL : process.env.google_account;
        const password = PASSWORD ? PASSWORD : process.env.google_password;
        await puppeteer_extra.startBrowser();
        let screenshot;
        count++;
        if (email && password) {
            const context = await puppeteer_extra.defaultPage.browser().createIncognitoBrowserContext();
            const page = await context.newPage();
            await page.goto(authUrl);
            await FunctionHelper.waitForSelector( 'visible', '#identifierId', config.timeout, page, count >= 2);
            await (await page.$('#identifierId'))?.type(email);
            if (count >= 2) {
                screenshot = await FunctionHelper.screenshot(page);
                FunctionHelper.log('Then', 'screenshot after #identifierId', StatusOfStep.PASSED, screenshot);
            }
            await (await page.$$('button'))[3].click();
            await FunctionHelper.timeout(5000);
            await FunctionHelper.waitForSelector( 'visible', 'input[type="password"]', config.timeout, page, count >= 2);
            await (await page.$('input[type="password"]'))?.type(password);
            if (count >= 2) {
                screenshot = await FunctionHelper.screenshot(page);
                FunctionHelper.log('Then', 'screenshot after #password', StatusOfStep.PASSED, screenshot);
            }
            await (await page.$$('button'))[1].click();
            await FunctionHelper.timeout(5000);
            await FunctionHelper.waitForSelector('visible', '#headingText', config.timeout, page, count >= 2);
            await FunctionHelper.timeout(5000)
            if (count >= 2) {
                screenshot = await FunctionHelper.screenshot(page);
                FunctionHelper.log('Then', 'screenshot after #headingText', StatusOfStep.PASSED, screenshot);
            }
            await FunctionHelper.waitForSelector('visible', 'button', config.timeout, page, count >= 2);
            await (await page.$$('button'))[2].click();
            await FunctionHelper.timeout(5000)
            const checkbox = await page.$$('input[type="checkbox"]');
            if (checkbox.length > 0) {
                await FunctionHelper.waitForSelector('visible', 'input[type="checkbox"]', config.timeout, page, count >= 2);
                await FunctionHelper.timeout(5000);
                await checkbox[0].click();
                if (count >= 2) {
                    screenshot = await FunctionHelper.screenshot(page);
                    FunctionHelper.log('Then', 'screenshot after input[type="checkbox"]', StatusOfStep.PASSED, screenshot);
                }
                await (await page.$$('button'))[2].click();
            } else {
                await FunctionHelper.waitForSelector('visible', `div[data-email="${email.toLocaleLowerCase()}"]`, config.timeout, page, count >= 2);
                await FunctionHelper.timeout(5000);
                if (count >= 2) {
                    screenshot = await FunctionHelper.screenshot(page);
                    FunctionHelper.log('Then', 'screenshot after div email', StatusOfStep.PASSED, screenshot);
                }
                await FunctionHelper.waitForSelector('visible', 'button', config.timeout, page, count >= 2);
                await (await page.$$('button'))[2].click();
            }
            await FunctionHelper.timeout(5000)
            await FunctionHelper.waitForSelector('visible', 'body', config.timeout, page, count >= 2);
            const currentUrl = page.url()
            const code = currentUrl.substring(
                currentUrl.indexOf("code=") + 5,
                currentUrl.lastIndexOf("&")
            );
            FunctionHelper.log('Then', 'I get the code form the url', StatusOfStep.PASSED);
            await page.close();
            await puppeteer_extra.close();
            return decodeURIComponent(code);
        } else {
            await puppeteer_extra.close();
            throw new Error('The email or password for the google account are empty');
        }
    }
    */
}

export default new AuxGoogleAuth();

export interface currentUser {
    name: string,
    email: string
}
