import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer-core';

async function readInput() {
    const chunks = [];

    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }

    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function browserExecutable(configuredPath) {
    const candidates = [
        configuredPath,
        process.env.PUPPETEER_EXECUTABLE_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ].filter(Boolean);

    return candidates.find((candidate) => fs.existsSync(candidate));
}

function contentType(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const types = {
        '.css': 'text/css',
        '.gif': 'image/gif',
        '.html': 'text/html',
        '.ico': 'image/x-icon',
        '.jpeg': 'image/jpeg',
        '.jpg': 'image/jpeg',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.mjs': 'text/javascript',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.ttf': 'font/ttf',
        '.webp': 'image/webp',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
    };

    return types[extension] ?? 'application/octet-stream';
}

function isLoopback(url) {
    return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
}

async function proxyLocalDevelopmentAsset(request) {
    try {
        const accept = request.headers().accept;
        const response = await fetch(request.url(), {
            headers: accept ? { Accept: accept } : undefined,
        });
        const body = Buffer.from(await response.arrayBuffer());

        await request.respond({
            status: response.status,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store',
                'Content-Type':
                    response.headers.get('content-type') ??
                    'application/octet-stream',
            },
            body,
        });
    } catch {
        await request.abort();
    }
}

async function servePaperDocument(request, htmlPath) {
    try {
        const body = await fs.promises.readFile(htmlPath);

        await request.respond({
            status: 200,
            contentType: 'text/html; charset=utf-8',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store',
            },
            body,
        });
    } catch {
        await request.respond({ status: 500, body: 'PDF preview unavailable' });
    }
}

async function serveLocalFile(request, filePath) {
    const body = await fs.promises.readFile(filePath);

    await request.respond({
        status: 200,
        contentType: contentType(filePath),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store',
        },
        body,
    });
}

async function serveLocalPublicAsset(request, baseOrigin, publicPath) {
    let url;

    try {
        url = new URL(request.url());
    } catch {
        await request.continue();

        return;
    }

    const relativePath = decodeURIComponent(url.pathname).replace(
        /^[/\\]+/,
        '',
    );
    const root = path.resolve(publicPath);
    const filePath = path.resolve(root, relativePath);

    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
        await request.abort();

        return;
    }

    if (isLoopback(url) && fs.existsSync(filePath)) {
        try {
            await serveLocalFile(request, filePath);
        } catch {
            await request.respond({ status: 404, body: 'Not found' });
        }

        return;
    }

    if (url.origin !== baseOrigin && isLoopback(url)) {
        await proxyLocalDevelopmentAsset(request);

        return;
    }

    if (url.origin !== baseOrigin) {
        await request.continue();

        return;
    }

    try {
        await serveLocalFile(request, filePath);
    } catch {
        await request.respond({ status: 404, body: 'Not found' });
    }
}

const input = await readInput();
const executablePath = browserExecutable(input.browserPath);

if (!executablePath) {
    throw new Error(
        'Chrome, Edge, or Chromium was not found. Set PAPER_PDF_BROWSER_PATH to its executable.',
    );
}

const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
    ],
});

try {
    const page = await browser.newPage();
    const baseOrigin = new URL(input.baseUrl).origin;
    const documentUrl = new URL(
        `/__paper_pdf/${path.basename(input.htmlPath)}`,
        `${baseOrigin}/`,
    ).href;

    page.on('console', (message) => {
        console.error(`[browser:${message.type()}] ${message.text()}`);
    });
    page.on('pageerror', (error) => {
        console.error(`[browser:pageerror] ${error.message}`);
    });
    page.on('requestfailed', (request) => {
        console.error(
            `[browser:requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`,
        );
    });

    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (request.url() === documentUrl) {
            void servePaperDocument(request, input.htmlPath);

            return;
        }

        void serveLocalPublicAsset(request, baseOrigin, input.publicPath);
    });

    await page.emulateMediaType('print');
    await page.goto(documentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: input.timeoutMs,
    });
    await page.waitForSelector('html[data-paper-pdf-ready="true"]', {
        timeout: input.timeoutMs,
    });
    await page.evaluate(async () => {
        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        await Promise.all(
            Array.from(document.images).map((image) => {
                if (image.complete) {
                    return Promise.resolve();
                }

                return new Promise((resolve) => {
                    image.addEventListener('load', resolve, { once: true });
                    image.addEventListener('error', resolve, { once: true });
                });
            }),
        );
    });

    await page.pdf({
        path: input.outputPath,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        timeout: input.timeoutMs,
    });
} finally {
    await browser.close();
}
