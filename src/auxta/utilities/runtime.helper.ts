import {RunTime} from "../services/runtime.service";

export class CalculateRuntime {
    public startTimeSeconds: string;
    public startTimeMinutes: string;
    public startTimeHours: string;
    public startTimeDay: string;
    public startTimeMonth: string;
    public endTimeSeconds: string;
    public endTimeMinutes: string;
    public endTimeHours: string;
    public endTimeDay: string;
    public endTimeMonth: string;
    private runtime: RunTime;

    constructor(r: RunTime) {
        this.runtime = r;
        this.startTimeSeconds = (this.runtime.startTime.getSeconds() < 10) ? `0${this.runtime.startTime.getSeconds()}` : `${this.runtime.startTime.getSeconds()}`
        this.startTimeMinutes = (this.runtime.startTime.getMinutes() < 10) ? `0${this.runtime.startTime.getMinutes()}` : `${this.runtime.startTime.getMinutes()}`;
        this.startTimeHours = (this.runtime.startTime.getHours() < 10) ? `0${this.runtime.startTime.getHours()}` : `${this.runtime.startTime.getHours()}`;
        this.startTimeDay = (this.runtime.startTime.getDate() < 10) ? `0${this.runtime.startTime.getDate()}` : `${this.runtime.startTime.getDate()}`;
        this.startTimeMonth = (this.runtime.startTime.getMonth() + 1 < 10) ? `0${this.runtime.startTime.getMonth() + 1}` : `${this.runtime.startTime.getMonth() + 1}`;

        this.endTimeSeconds = (this.runtime.endTime.getSeconds() < 10) ? `0${this.runtime.endTime.getSeconds()}` : `${this.runtime.endTime.getSeconds()}`;
        this.endTimeMinutes = (this.runtime.endTime.getMinutes() < 10) ? `0${this.runtime.endTime.getMinutes()}` : `${this.runtime.endTime.getMinutes()}`;
        this.endTimeHours = (this.runtime.endTime.getHours() < 10) ? `0${this.runtime.endTime.getHours()}` : `${this.runtime.endTime.getHours()}`;
        this.endTimeDay = (this.runtime.endTime.getDate() < 10) ? `0${this.runtime.endTime.getDate()}` : `${this.runtime.endTime.getDate()}`;
        this.endTimeMonth = (this.runtime.endTime.getMonth() + 1 < 10) ? `0${this.runtime.endTime.getMonth() + 1}` : `${this.runtime.endTime.getMonth() + 1}`;
    }
}