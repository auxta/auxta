export function returnImage(code: number, screenshot: Buffer) {
    return {
        isBase64Encoded: true,
        statusCode: code,
        headers: {
            "Content-Type": "image/png",
            "Content-Length": screenshot.length.toString()
        },
        body: screenshot.toString("base64")
    };
}
