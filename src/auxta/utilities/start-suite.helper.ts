import axios from 'axios';
import {config} from "../configs/config";

export async function startSuite(suites: string[], reportId?: string) {
    if (suites.length === 0) return;
    const next = suites.shift();
    console.log('Starting next suite: ' + next);
    console.log(suites)

    try {
        if (config.netlifyPath.includes('amazonaws')) {
            await axios.post(
                `${config.netlifyPath}${next}?token=${config.token}`,
                {nextSuites: suites, reportId: reportId, currentSuite: next, retries: "0"})
        } else {
            await axios.post(
                `${config.netlifyPath}.netlify/functions/${next}?token=${config.token}`,
                {nextSuites: suites, reportId: reportId, currentSuite: next, retries: "0"})
        }

    } catch (e) {
        // @ts-ignore
        const response = e.response
        console.log(response.data);
        console.log(response.status);
        console.log(typeof response.status);
    }
}

export async function retrySuite(suites: string[], reportId: string, currentSuite: string, retries: number) {
    console.log('I repeat again the current suite: ' + currentSuite);
    if (retries >= 2) {
        return false;
    }
    try {
        if (config.netlifyPath.includes('amazonaws')) {
            await axios.post(
                `${config.netlifyPath}${currentSuite}?token=${config.token}`,
                {nextSuites: suites, reportId: reportId, currentSuite: currentSuite, retries: retries})
        } else {
            await axios.post(
                `${config.netlifyPath}.netlify/functions/${currentSuite}?token=${config.token}`,
                {nextSuites: suites, reportId: reportId, currentSuite: currentSuite, retries: retries})
        }

    } catch (e) {
        // @ts-ignore
        const status = e.response.status
        console.log(status);
        console.log(typeof status);
    }
    return true;
}
