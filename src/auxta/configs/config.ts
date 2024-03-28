export function setupConfig(jsonConfig: any) {
    if (!jsonConfig.baseURL) throw new Error("baseURL");
    config.baseURL = jsonConfig.baseURL;
    if (!jsonConfig.digitalProduct) throw new Error("digitalProduct");
    config.digitalProduct = jsonConfig.digitalProduct;
    if (!jsonConfig.testsURL) throw new Error("testsURL");
    config.bucket = jsonConfig.bucket;
    if (!jsonConfig.testsURL) throw new Error("testsURL");
    config.netlifyPath = (process.env.ENVIRONMENT == 'LOCAL') ? 'http://localhost:9999/' : jsonConfig.testsURL;
    if (!jsonConfig.organization) throw new Error("organization");
    config.organization = jsonConfig.organization;
    if (!jsonConfig.email) throw new Error("email");
    config.auxtaCredentials.email = jsonConfig.email;
    if (!process.env.auxta_password) throw new Error("password");
    config.auxtaCredentials.password = process.env.auxta_password;
    if (!jsonConfig.suitesList) throw new Error("suitesList");
    config.suitesList = jsonConfig.suitesList;
    config.googleEmail = jsonConfig.googleEmail;
    if (jsonConfig.timeout) config.timeout = jsonConfig.timeout;
    if (jsonConfig.screenWidth) config.screenWidth = jsonConfig.screenWidth;
    if (jsonConfig.screenHeight) config.screenHeight = jsonConfig.screenHeight;
    return config;
}

export function setupOverrideConfig(overrideConfig: any) {
    if (overrideConfig.baseURL) config.baseURL = overrideConfig.baseURL;
    if (overrideConfig.digitalProduct) config.digitalProduct = overrideConfig.digitalProduct;
    if (overrideConfig.screenWidth) config.screenWidth = overrideConfig.screenWidth;
    if (overrideConfig.screenHeight) config.screenHeight = overrideConfig.screenHeight;
    return config;
}

export let config = {
    auxtaURL: "http://localhost:8888/.netlify/functions/",
    baseURL: "",
    siteURL: "",
    organization: "",
    netlifyPath: "",
    digitalProduct: "",
    bucket: "",
    token: "",
    screenWidth: 1920,
    screenHeight: 1080,
    timeout: 60000,
    suitesList: [],
    googleEmail: "",
    auxtaCredentials: {
        email: "",
        password: "",
    },
}
