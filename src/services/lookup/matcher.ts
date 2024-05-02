import unidecode from 'unidecode';
import MediaItem from 'types/MediaItem';
import {getServiceFromSrc, isPersonalMediaService} from 'services/mediaServices';
import {filterNotEmpty, fuzzyCompare} from 'utils';
import lookupSettings from './lookupSettings';

const regFeaturedArtists = /\s*[\s[({](with\s|featuring\s|feat[\s.]+|ft[\s.]+).+$/i;

// TODO: This is too slow for a large amount of items.
export function findBestMatch<T extends MediaItem>(
    items: readonly MediaItem[],
    item: T,
    isrcs: readonly string[] = [],
    preferredServiceId?: string
): MediaItem | undefined {
    const {artist, title} = getArtistAndTitle(item);
    if (!artist || !title) {
        return;
    }
    let matches = findMatches(items, item, isrcs);
    if (lookupSettings.preferPersonalMedia) {
        matches = filterNotEmpty(matches, (match) => {
            const service = getServiceFromSrc(match);
            return service ? isPersonalMediaService(service) : false;
        });
    }
    if (preferredServiceId) {
        matches = filterNotEmpty(matches, (match) =>
            match.src.startsWith(`${preferredServiceId}:`)
        );
    }
    return matches[0];
}

export function findMatches<T extends MediaItem>(
    items: readonly MediaItem[],
    item: T,
    isrcs: readonly string[],
    strict?: boolean
): MediaItem[] {
    let matches: MediaItem[] = [];
    if (isrcs.length > 0) {
        matches = items.filter((match) => match.isrc && isrcs.includes(match.isrc));
    }
    if (matches.length === 0) {
        matches = items.filter((match) => compareByUniqueId(match, item));
    } else {
        matches = filterNotEmpty(matches, (match) => compareByUniqueId(match, item));
    }
    if (matches.length === 0) {
        matches = items.filter((match) => compare(match, item, true, true));
    }
    if (!strict) {
        if (matches.length === 0) {
            matches = items.filter((match) => compare(match, item, true, false));
        }
        if (matches.length === 0) {
            matches = items.filter((match) => compare(match, item, false, false));
        }
    }
    matches = filterNotEmpty(matches, (match) => compareAlbum(match, item));
    matches = filterNotEmpty(
        matches,
        (match) => compareAlbum(match, item) && match.track === item.track
    );
    return matches;
}

function compare<T extends MediaItem>(
    match: MediaItem,
    item: T,
    strictTitle: boolean,
    strictArtist: boolean
): boolean {
    if (compareTitle(match, item, strictTitle) && compareArtist(match, item, strictArtist)) {
        return true;
    }
    if (!strictArtist && !strictTitle && fuzzyComparArtistAndTitle(match, item)) {
        return true;
    }
    return false;
}

export function compareByUniqueId<T extends MediaItem>(match: MediaItem, item: T): boolean {
    return !!(
        item.src === match.src ||
        (item.isrc && item.isrc === match.isrc) ||
        (item.recording_mbid && item.recording_mbid === match.recording_mbid) ||
        (item.track_mbid && item.track_mbid === match.track_mbid)
    );
}

function compareArtist<T extends MediaItem>(match: MediaItem, item: T, strict: boolean): boolean {
    const artist = item.artists?.[0];
    if (!artist) {
        return false;
    }
    const matchedArtists = match.artists;
    if (!matchedArtists) {
        return false;
    }
    const matchedArtist = matchedArtists[0];
    if (!matchedArtist) {
        return false;
    }
    if (compareString(artist, matchedArtist)) {
        return true;
    }
    if (strict) {
        return false;
    }
    if (compareString(normalize(artist), normalize(matchedArtist))) {
        return true;
    }
    if (compareString(removeFeaturedArtists(artist), removeFeaturedArtists(matchedArtist))) {
        return true;
    }
    const albumArtist = item.albumArtist;
    if (albumArtist && compareString(normalize(albumArtist), normalize(matchedArtist))) {
        return true;
    }
    if (compareString(removeFeaturedArtists(artist), match.albumArtist)) {
        return true;
    }
    if (compareMultiArtist(match, item)) {
        return true;
    }
    if (compareBracketedArtist(match, item)) {
        return true;
    }
    return false;
}

function compareMultiArtist<T extends MediaItem>(match: MediaItem, item: T): boolean {
    const artists = splitArtists(item.artists!);
    const matchedArtists = splitArtists(match.artists!);
    if (matchedArtists.length > 1 || artists.length > 1) {
        return (
            artists.filter((artist) =>
                matchedArtists.find((match) => compareString(normalize(artist), normalize(match)))
            ).length > 0
        );
    }
    return false;
}

function compareBracketedArtist<T extends MediaItem>(match: MediaItem, item: T): boolean {
    const artist = normalize(item.artists?.[0] || '');
    const matchedArtist = normalize(match.artists?.[0] || '');
    const [a, b] =
        artist.length > matchedArtist.length ? [artist, matchedArtist] : [matchedArtist, artist];
    if (stringIncludes(a, `(${b})`) || stringIncludes(a, `[${b}]`) || stringIncludes(a, `{${b}}`)) {
        return true;
    }
    return false;
}

function splitArtists(artists: readonly string[]): readonly string[] {
    return artists.join('|').split(/\s*[,;&|/x×]\s*/);
}

function compareTitle<T extends MediaItem>(match: MediaItem, item: T, strict: boolean): boolean {
    const title = item.title;
    if (!title) {
        return false;
    }
    if (compareString(title, match.title)) {
        return true;
    }
    if (strict) {
        return compareAlbumTrack(match, item, true);
    }
    if (compareTitleStrings(match, match.title, title)) {
        return true;
    }
    if (compareTitleStrings(match, trimTrackTitle(match.title), trimTrackTitle(title))) {
        return true;
    }
    return compareAlbumTrack(match, item, false);
}

function compareAlbumTrack<T extends MediaItem>(
    match: MediaItem,
    item: T,
    strict: boolean
): boolean {
    if (!compareAlbum(match, item)) {
        return false;
    }
    if (match.track !== item.track) {
        return false;
    }
    const a = normalize(match.title);
    const b = normalize(item.title);
    if (strict) {
        return compareString(a, b);
    }
    if (a.startsWith(b) || b.startsWith(a)) {
        return true;
    }
    return fuzzyCompare(a, b, 0.75);
}

function compareTitleStrings(match: MediaItem, matchedTitle: string, title: string): boolean {
    matchedTitle = normalize(matchedTitle);
    title = normalize(title);
    if (compareString(title, matchedTitle)) {
        return true;
    }
    const [, ...matchedArtists] = match.artists || [];
    if (matchedArtists.length > 0) {
        const lastMatchedArtist = matchedArtists.length > 1 ? ` & ${matchedArtists.pop()}` : '';
        const matchedTitleWithArtists = `${matchedTitle} (feat. ${matchedArtists.join(
            ', '
        )}${lastMatchedArtist})`;
        if (compareString(title, matchedTitleWithArtists)) {
            return true;
        }
    }
    if (regFeaturedArtists.test(title)) {
        const titleWithoutArtists = removeFeaturedArtists(title);
        if (compareString(titleWithoutArtists, matchedTitle)) {
            return true;
        }
    }
    if (regFeaturedArtists.test(match.title)) {
        const matchedTitleWithoutArtists = removeFeaturedArtists(matchedTitle);
        if (compareString(title, matchedTitleWithoutArtists)) {
            return true;
        }
    }
    return false;
}

function compareAlbum<T extends MediaItem>(match: MediaItem, item: T): boolean {
    if (!match.album || !item.album) {
        return false;
    }
    if (item.release_mbid && item.release_mbid === match.release_mbid) {
        return true;
    }
    return compareString(normalize(item.album), normalize(match.album));
}

function trimTrackTitle(title: string): string {
    // Remove remaster tags.
    // e.g. "Disorder (2007 Remaster)" => "Disorder"
    title = title.replace(/\s*\((19|20)\d\d(\sDigital)?\sRemaster\)$/gi, '');
    // Remove album/single version.
    // e.g. "Disorder (Single Version)" => "Disorder"
    // e.g. "Disorder - Single Version" => "Disorder"
    title = title.replace(/\s*\((Album|Single)(\s+Version)?\)$/gi, '');
    title = title.replace(/\s*-\s*(Album|Single)(\s+Version)?$/gi, '');
    return title;
}

function fuzzyComparArtistAndTitle<T extends MediaItem>(match: MediaItem, item: T): boolean {
    if (compareArtist(match, item, true) && fuzzyCompareTitle(match, item)) {
        return true;
    }
    if (compareArtist(match, item, false) && fuzzyCompareTitle(match, item)) {
        return true;
    }
    if (fuzzyCompare(normalizeArtistAndTitle(match), normalizeArtistAndTitle(item))) {
        return true;
    }
    return false;
}

function fuzzyCompareTitle<T extends MediaItem>(match: MediaItem, item: T): boolean {
    const itemTitle = normalize(item.title, true).toLowerCase();
    const matchTitle = normalize(match.title, true).toLowerCase();
    return fuzzyCompare(itemTitle, matchTitle);
}

function normalizeArtistAndTitle(item: MediaItem): string {
    const {artist, title} = getArtistAndTitle(item);
    return `${normalize(artist, true)}-${normalize(title, true)}`.toLowerCase();
}

function compareString(a: string, b = ''): boolean {
    return a.localeCompare(b, undefined, {sensitivity: 'accent'}) === 0;
}

function stringIncludes(a: string, b = ''): boolean {
    const maxLength = a.length - b.length;
    for (let i = 0; i <= maxLength; i++) {
        if (compareString(a.substring(i, i + b.length), b)) {
            return true;
        }
    }
    return false;
}

function normalize(string: string, removeSymbols?: boolean): string {
    let result = unidecode(string).replace(/\s\s+/g, ' ').trim();
    if (removeSymbols) {
        result = result.replace(/[^\w\s]/g, '');
    }
    return result;
}

export function getArtistAndTitle<T extends MediaItem>(item: T): {artist: string; title: string} {
    const artist = item.artists ? item.artists[0] || '' : '';
    return {artist, title: item.title};
}

export function removeFeaturedArtists(title: string): string {
    // Featured artists: `(feat. Artist1, Artist2 & Artist3)`.
    return title.replace(regFeaturedArtists, '');
}
