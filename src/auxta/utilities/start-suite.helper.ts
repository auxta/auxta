export async function startSuite(suites: string[], reportId?: string) {
    if (suites.length === 0) return;
    const next = suites.shift();
    return {nextSuites: suites, reportId: reportId, currentSuite: next, retries: "0"};
}

export async function retrySuite(suites: string[], reportId: string, currentSuite: string, retries: number) {
    console.log('I repeat again the current suite: ' + currentSuite);
    if (retries >= 2) {
        return false;
    }
    return {nextSuites: suites, reportId: reportId, currentSuite: currentSuite, retries: retries}
}
