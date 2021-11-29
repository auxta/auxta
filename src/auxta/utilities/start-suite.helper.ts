import axios from 'axios';
import { config } from "../configs/config";

export async function startSuite(suites: string[], reportId?: string) {
    if (suites.length === 0) return;
    const next = suites.shift();
    console.log('Starting next suite: ' + next);
    try{
        await axios.post(
            `${config.netlifyPath}.netlify/functions/${next}?token=${config.token}`,
            {nextSuites: suites, reportId: reportId})
    } catch (e){
        // skip the suite if not found
        await startSuite(suites, reportId);
    }
}
