import axios from 'axios';
import { config } from "../configs/config";

export function startSuite(suites: string[], reportId?: string) {
    console.log('Starting next suite: ' + suites[0]);
    //todo on error, end the test
    return axios.post(
        `${config.netlifyPath}.netlify/functions/${suites.shift()}?token=${config.token}`,
        { nextSuites: suites, reportId: reportId}
    );
}
