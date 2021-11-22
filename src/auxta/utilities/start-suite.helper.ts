import axios from 'axios';
import { config } from "../configs/config";

export function startSuite(suites: string[], reportId?: string) {
    console.log('Starting next suite: ' + suites[0]);
    console.log(suites,reportId);
    return axios.post(
        `${config.netlifyPath}.netlify/functions/${suites.shift()}`,
        { nextSuites: suites, reportId: reportId}
    );
}
