import {config} from "../../auxta/configs/config";
import puppeteer from "../../puppeteer/puppeteer";
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
            await this.getNewTokenHeadless(oAuth2Client);
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
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: SCOPES,
        });

        const code = await this.LogIn(authUrl);

        this._oAuth2Client = await (new Promise(async (resolve, reject) => {
            await oAuth2Client.getToken(code, (err: any, token: any) => {
                if (err) return console.error('Error retrieving access token', err);
                oAuth2Client.setCredentials(token);
                TOKEN = token;
                this._oAuth2Client = oAuth2Client;
                FunctionHelper.log('Then', 'I login with the google account', StatusOfStep.PASSED);
                resolve(oAuth2Client);
            });
        }));
    }

    private static async LogIn(authUrl: string) {
        const email = EMAIL ? EMAIL : process.env.google_account;
        const password = PASSWORD ? PASSWORD : process.env.google_password;
        if (email && password) {
            const context = await puppeteer.defaultPage.browser().createIncognitoBrowserContext();
            const page = await context.newPage();
            await page.goto(authUrl);
            await FunctionHelper.waitForSelector( 'visible', '#identifierId', config.timeout, page);
            await (await page.$('#identifierId'))?.type(email);
            await (await page.$$('button'))[3].click();
            await FunctionHelper.timeout(4000)
            await FunctionHelper.waitForSelector( 'visible', 'input[type="password"]', config.timeout, page);
            await (await page.$('input[type="password"]'))?.type(password);
            await (await page.$$('button'))[1].click();
            await FunctionHelper.timeout(4000)
            await FunctionHelper.waitForSelector('visible', '#headingText', config.timeout, page);
            await (await page.$$('button'))[2].click();
            await FunctionHelper.timeout(4000)
            const checkbox = await page.$$('input[type="checkbox"]');
            if (checkbox.length > 0) {
                await FunctionHelper.waitForSelector('visible', 'input[type="checkbox"]', config.timeout, page);
                await checkbox[0].click();
                await (await page.$$('button'))[2].click();
            } else {
                await FunctionHelper.waitForSelector('visible', `div[data-email="${email.toLocaleLowerCase()}"]`, config.timeout, page);
                await FunctionHelper.timeout(4000)
                await (await page.$$('button'))[2].click();
            }
            await FunctionHelper.timeout(4000)
            await FunctionHelper.waitForSelector('visible', 'body', config.timeout, page);
            const currentUrl = page.url()
            const code = currentUrl.substring(
                currentUrl.indexOf("code=") + 5,
                currentUrl.lastIndexOf("&")
            );
            FunctionHelper.log('Then', 'I get the code form the url', StatusOfStep.PASSED);
            await page.close();
            return decodeURIComponent(code);
        } else {
            throw new Error('The email or password for the google account are empty');
        }

    }
}

export default new AuxGoogleAuth();

export interface currentUser {
    name: string,
    email: string
}
