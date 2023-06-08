import log from "../../auxta/services/log.service";
import {AuxGoogleAuth} from "./AuxGoogleAuth";
import {atob} from "buffer";
import {gmail_v1} from "googleapis";
import {StepStatus} from "../../AuxTA";

const MailComposer = require('nodemailer/lib/mail-composer');

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
     * @param reply
     * @param reply_body
     */
    public async verifyEmail(from_name: string, from_email: string, subject: string, body: string, reply: boolean = false, reply_body?: string) {
        await AuxGoogleAuth.setup();
        const res = await AuxGoogleAuth.gmailClient.users.messages.list({
            userId: "me",
            maxResults: 3
        });
        const messagesIds = res.data.messages;
        if (!messagesIds || messagesIds.length === 0) {
            throw new Error('No messagesIds found.')
        }
        let timeoutCount = 12000;
        while (timeoutCount <= 60000) {
            for (const messageId of messagesIds) {
                if (messageId.id) {
                    const gmailResponse = await AuxGoogleAuth.gmailClient.users.messages.get({
                        userId: "me",
                        id: messageId.id.toString(),
                        format: 'FULL'
                    })
                    if (gmailResponse.data.payload && gmailResponse.data.id && gmailResponse.data.threadId) {
                        const message_sender = this.getHeader('from', gmailResponse);
                        const message_subject = this.getHeader('subject', gmailResponse);
                        const message_body = this.getBody(subject, gmailResponse);
                        if (message_sender.toLocaleLowerCase().includes(from_email) && message_sender.toLocaleLowerCase().includes(from_name.toLocaleLowerCase()) &&
                            message_subject.toLocaleLowerCase().includes(subject.toLocaleLowerCase()) && message_body.toLocaleLowerCase().includes(body.toLocaleLowerCase())) {
                            log.push('Then', `Email from: ${from_name} ${from_email} with subject: ${subject} and body: ${body} is found`, StepStatus.PASSED);
                            await AuxGoogleAuth.gmailClient.users.messages.modify({
                                userId: "me",
                                id: gmailResponse.data.id,
                                requestBody: {
                                    'addLabelIds': [],
                                    'removeLabelIds': ['UNREAD']
                                }
                            })
                            return {id: gmailResponse.data.id, threadId: gmailResponse.data.threadId}
                        }
                    }
                    break;
                }
            }
            await new Promise(r => setTimeout(r, timeoutCount));
            timeoutCount += 12000;
        }
        await log.push('Then', `Email from: ${from_name} ${from_email} with subject: ${subject} and body: ${body} is found`, StepStatus.FAILED);
    }

    /**
     * @remarks
     * Reply's to email with data from verifyEmail with the given body
     *
     * @function verifyEmail
     * @param id
     * @param threadId
     * @param {string} body
     */

    public async replyEmail(id: string, threadId: string, body: string) {
        await AuxGoogleAuth.setup();
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
    }

    private getHeader(value: string, headers: any) {
        for (const header of headers.data.payload.headers) {
            if (header.name.toLocaleLowerCase() === value.toLocaleLowerCase()) {
                return header.value;
            }
        }
    }

    private getBody(subject: string, gmailResponse: any) {
        // @ts-ignore
        const body = gmailResponse.data.payload.parts[0].body.data;
        if (body) {
            return atob(body).toLocaleLowerCase();
        } else {
            throw new Error(`Email with subject: ${subject} body is empty`)
        }
    }

    private async getCurrentUserEmail() {
        await AuxGoogleAuth.setup();
        const profile = await AuxGoogleAuth.gmailClient.users.getProfile({userId: "me"});
        return profile.data.emailAddress;
    }
}

export interface gmailResponse extends gmail_v1.Gmail {
}


export default new EmailHelper();