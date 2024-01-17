import log from "../../auxta/services/log.service";
import {AuxGoogleAuth} from "./AuxGoogleAuth";
import {StepStatus} from "../../AuxTA";
import {getVerifyReceivedEmail} from "../../auxta/services/report.service";

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
                } catch (e) {
                }
                log.push('Then', `Failed two get the email with the given criteria and waiting 12 seconds`, StepStatus.PASSED);
                await new Promise(r => setTimeout(r, timeoutCount));
                timeoutCount += 12000;
            }
            await log.push('Then', `Email from: ${from_name} ${from_email} with subject: ${subject} and body: ${body} is found`, StepStatus.FAILED);
        } catch (e: any) {
            throw new Error(e);
        }
    }
}

export default new EmailHelper();