/** Keep in sync with SchoolIMS backend/services/media/sourceLinks.js. */
export function youtubeVideoId(value: string): string {
    const message = 'Paste a valid HTTPS YouTube watch, share, Shorts, live or embed link.';
    if (value.trim().length > 2048) throw new Error(message);
    let url: URL;
    try { url = new URL(value.trim()); } catch { throw new Error(message); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error(message);
    const host = url.hostname.toLowerCase();
    let id: string | null | undefined;
    if (host === 'youtu.be') {
        id = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
        if (/^\/watch\/?$/.test(url.pathname) && url.searchParams.getAll('v').length === 1) id = url.searchParams.get('v');
        else id = /^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
    } else if (['youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
        id = /^\/embed\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error(message);
    return id;
}

export function validateMediaSource(provider: string, reference: string) {
    if (provider === 'youtube') {
        youtubeVideoId(reference);
        return { provider: 'youtube', url: reference.trim() };
    }
    if (provider === 'nexsyrus_cdn') {
        if (!reference.trim() || reference.trim().length > 500) throw new Error('Enter the private R2 video object key.');
        return { provider, storageKey: reference.trim(), playbackMode: 'mp4' };
    }
    if (!/^[A-Za-z0-9_/-]{1,200}$/.test(reference.trim())) throw new Error('Enter an asset ID from your configured secure media provider.');
    return { provider, assetId: reference.trim(), playbackMode: provider === 'hls' ? 'hls' : 'mp4' };
}
