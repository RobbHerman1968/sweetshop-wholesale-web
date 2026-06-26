export function isLocalhostHostname(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function isLocalhostHostHeader(host: string | null | undefined): boolean {
    if (!host) {
        return false;
    }
    return isLocalhostHostname(host.split(':')[0] ?? '');
}
