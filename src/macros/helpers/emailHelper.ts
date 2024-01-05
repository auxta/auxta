import log from "../../auxta/services/log.service";
import {AuxGoogleAuth} from "./AuxGoogleAuth";
import {StepStatus} from "../../AuxTA";
import {getVerifyReceivedEmail} from "../../auxta/services/report.service";

//const MailComposer = require('nodemailer/lib/mail-composer');

export class EmailHelper {

    /**
     * @remarks
     * Gets the first 3 emails from the gmail client and searches through those emails for the email with the given parameters.
     * If it finds a matching one it stops and returns the id and the threadId of the mail.
     * If it didn't find the email it waits 12000 milliseconds and tries again.
     *
     * @function verifyEmail
     * @param {string} from_name
     * @param {string} from_email
     * @param {string} subject
     * @param {string} body
     * @param link
     */
    public async verifyEmail(from_name: string, from_email: string, subject: string, body: string, link: boolean = false) {
        try {
            log.push('Then', `Logging in two google or getting the token`, StepStatus.PASSED);
            await AuxGoogleAuth.setupHeadless();
            log.push('Then', `Done logging in and waiting 35 seconds`, StepStatus.PASSED);
            await new Promise(r => setTimeout(r, 35000));
            let timeoutCount = 12000;
            while (timeoutCount <= 60000) {
                try {
                    const links = await getVerifyReceivedEmail(from_name, from_email, subject, body, link);
                    log.push('Then', `Email from: ${from_name} ${from_email} with subject: ${subject} and body: ${body} is found`, StepStatus.PASSED);
                    if (links) {
                        return {
                            link: links.data.link
                        };
                    } else {
                       return
                    }
                } catch (e) {}
                log.push('Then', `Failed two get the email with the given criteria and waiting 12 seconds`, StepStatus.PASSED);
                await new Promise(r => setTimeout(r, timeoutCount));
                timeoutCount += 12000;
            }
            await log.push('Then', `Email from: ${from_name} ${from_email} with subject: ${subject} and body: ${body} is found`, StepStatus.FAILED);
        } catch (e: any) {
            throw new Error(e);
        }
    }


    /**
     * @remarks
     * Sends email to the given email with subject and body
     *
     * @function sendEmail
     * @param {string} to
     * @param {string} subject
     * @param {string} body
     */

/*
    public async sendEmail(to: string, subject: string, body: string) {
        await AuxGoogleAuth.setupHeadless();
        const options = {
            to: to,
            from: this.getCurrentUserEmail(),
            subject: subject,
            html: body
        };
        await EmailHelper.send(options);
    }*/

    /**
     * @remarks
     * Reply's to email with data from verifyEmail with the given body
     *
     * @function verifyEmail
     * @param id
     * @param threadId
     * @param {string} body
     */
/*
    public async replyEmail(id: string, threadId: string, body: string) {
        await AuxGoogleAuth.setupHeadless();
        const gmailResponse = await AuxGoogleAuth.gmailClient.users.messages.get({
            userId: "me",
            id: id,
            format: 'FULL'
        });
        if (gmailResponse.data.payload) {
            const message_subject = this.getHeader('subject', gmailResponse);
            const message_messageID = this.getHeader('Message-ID', gmailResponse);
            const reply_to = this.getHeader('reply-to', gmailResponse);
            const options = {
                to: reply_to,
                from: this.getCurrentUserEmail(),
                subject: `Re: ${message_subject}`,
                references: message_messageID,
                inReplyTo: [message_messageID],
                html: body
            };
            await EmailHelper.send(options, threadId);
        }
    }

    private static async send(options: object, threadId?: string) {
        const mailComposer = new MailComposer(options);
        const message = await mailComposer.compile().build();
        const encodeMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        await AuxGoogleAuth.gmailClient.users.messages.send({
            userId: "me",
            requestBody: {
                threadId: threadId,
                raw: encodeMessage
            }
        });
    }

    private getHeader(value: string, headers: any) {
        for (const header of headers.data.payload.headers) {
            if (header.name.toLocaleLowerCase() === value.toLocaleLowerCase()) {
                return header.value;
            }
        }
    }

    private async getCurrentUserEmail() {
        await AuxGoogleAuth.setupHeadless();
        const profile = await AuxGoogleAuth.gmailClient.users.getProfile({userId: "me"});
        return profile.data.emailAddress;
    }*/
}

export default new EmailHelper();