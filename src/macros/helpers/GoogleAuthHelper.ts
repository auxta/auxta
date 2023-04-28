const fs = require('fs');
const readline = require('readline');
// @ts-ignore
import googleType = require("googleapis");
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
    'https://www.googleapis.com/auth/gmail.metadata',
    'https://www.googleapis.com/auth/gmail.insert',
];
const TOKEN_PATH = 'token.json';

export class GoogleAuthHelper {
    // @ts-ignore
    private _oAuth2Client: googleType.Auth.OAuth2Client

    private credentialsJson = {
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

    get oAuth2Client(): googleType.Auth.OAuth2Client {
        return this._oAuth2Client;
    }

    get googleClient(): googleType.GoogleApis {
        return google;
    }

    get gmailClient(): googleType.gmail_v1.Gmail {
        return google.gmail({version: 'v1', auth: this._oAuth2Client});

    }

    public async setup() {
        await this.authorize(this.credentialsJson);
    }

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     * @param {Object} credentials The authorization client credentials.
     */
    private async authorize(credentials: any) {
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

    /**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
     */
    private async getNewToken(oAuth2Client: any) {
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
            oAuth2Client.getToken(code, (err: any, token:any) => {
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
}

export default new GoogleAuthHelper();