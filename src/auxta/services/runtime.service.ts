export interface RunTime {
    duration: String,
    startTime: Date,
    endTime: Date,
}

export class Runtime {
    private start: Date;

    private end: Date;

    private runtime!: RunTime;

    constructor(s: Date, e: Date) {
        this.start = s;
        this.end = e;
    }

    private calculateDuration() {
        let currentTime = new Date;
        let duration = currentTime.getTime() - this.start.getTime();
        return duration;
    }

    private splitAtDecimanlMinutes(time: number) {
        let minutes = time.toFixed(2).toString().split('.');
        return `${minutes[0]}m ${(Number(minutes[1]) / 100 * 60).toFixed(0)}s`;
    }

    private splitAtDecimanlHours(time: number) {
        let hours = time.toFixed(2).toString().split('.');
        let minutes = (Number(hours[1]) / 100 * 60).toFixed(2).toString().split('.');
        return `${hours[0]}h ${minutes[0]}m ${(Number(minutes[1]) / 100 * 60).toFixed(0)}s`;
    }

    private formatRuntime(duration: number) {
        if(duration / 1000 < 60) return `${(duration / 1000).toFixed(0)}s`
        else {
            if(duration / 60000 < 60) return this.splitAtDecimanlMinutes(duration / 60000);
            else return this.splitAtDecimanlHours(duration / 3600000);
        }
    }

    public returnRuntime() : RunTime { 
        let duration = this.formatRuntime(this.calculateDuration());
        let startTime = this.start;
        let endTime = this.end;
        this.runtime = { duration, startTime, endTime }
        return this.runtime;
    }
}