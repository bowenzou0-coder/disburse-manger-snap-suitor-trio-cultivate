import open from 'open';
export async function openInBrowser(url, { announce = true } = {}) {
    if (announce)
        console.log(`Opening ${url}`);
    await open(url);
}
//# sourceMappingURL=browser.js.map