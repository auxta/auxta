export function setupConfig(jsonConfig: any) {
    if (!jsonConfig.baseURL) throw new Error("baseURL");
    config.baseURL = jsonConfig.baseURL;
    if (!jsonConfig.digitalProduct) throw new Error("digitalProduct");
    config.digitalProduct = jsonConfig.digitalProduct;
    if (!jsonConfig.testsURL) throw new Error("testsURL");
    config.netlifyPath = (process.env.ENVIRONMENT == 'LOCAL') ? 'http://localhost:9999/' : jsonConfig.testsURL;
    if (!jsonConfig.organization) throw new Error("organization");
    config.organization = jsonConfig.organization;
    if (!jsonConfig.token) throw new Error("token");
    config.token = jsonConfig.token;
    if (!jsonConfig.email) throw new Error("email");
    config.auxtaCredentials.email = jsonConfig.email;
    if (!jsonConfig.password) throw new Error("password");
    config.auxtaCredentials.password = jsonConfig.password;
    if (!jsonConfig.suitesList) throw new Error("suitesList");
    config.suitesList = jsonConfig.suitesList;
    if (jsonConfig.timeout) config.timeout = jsonConfig.timeout;
    if (jsonConfig.screenWidth) config.screenWidth = jsonConfig.screenWidth;
    if (jsonConfig.screenHeight) config.screenHeight = jsonConfig.screenHeight;
    return config;
}

export function setupOverrideConfig(overrideConfig: any){
    if (overrideConfig.baseURL) config.baseURL = overrideConfig.baseURL;
    if (overrideConfig.digitalProduct) config.digitalProduct = overrideConfig.digitalProduct;
    return config;
}

export let config = {
    auxtaURL: "https://auxta.live/.netlify/functions/",
    baseURL: "",
    siteURL: "",
    organization: "",
    netlifyPath: "",
    digitalProduct: "",
    token: "",
    screenWidth: 1920,
    screenHeight: 1080,
    timeout: 10000,
    suitesList: [],
    auxtaCredentials: {
        email: "",
        password: "",
    },
}
