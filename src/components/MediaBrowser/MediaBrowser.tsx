import React, {useState} from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import Login from 'components/Login';
import SearchBar from 'components/SearchBar';
import {MediaListProps} from 'components/MediaList';
import LastFmTopBrowser from 'components/services/lastfm/LastFmTopBrowser';
import ListenBrainzTopBrowser from 'components/services/listenbrainz/ListenBrainzTopBrowser';
import useObservable from 'hooks/useObservable';
import useSearch from 'hooks/useSearch';
import AlbumBrowser from './AlbumBrowser';
import ArtistBrowser from './ArtistBrowser';
import HistoryBrowser from './HistoryBrowser';
import MediaItemBrowser from './MediaItemBrowser';
import MediaSourceSelector from './MediaSourceSelector';
import PlaylistBrowser from './PlaylistBrowser';
import './MediaBrowser.scss';

export interface MediaBrowserProps<T extends MediaObject> {
    service: MediaService;
    sources: readonly MediaSource<T>[];
}

export default function MediaBrowserAuth<T extends MediaObject>({
    service,
    sources,
}: MediaBrowserProps<T>) {
    const isLoggedIn = useObservable(service.observeIsLoggedIn, false);
    const key = String(sources.map((source) => source.id));

    return (
        <div className={`media-browser ${service.id}-browser`} key={key}>
            {isLoggedIn ? (
                sources.length === 0 ? null : (
                    <Router service={service} sources={sources} />
                )
            ) : (
                <Login service={service} />
            )}
        </div>
    );
}

function Router<T extends MediaObject>({service, sources}: MediaBrowserProps<T>) {
    const source = sources.length === 1 ? sources[0] : null;
    const id = source ? source.id : '';
    if (id.startsWith('lastfm/top')) {
        return <LastFmTopBrowser source={source!} />;
    } else if (id.startsWith('listenbrainz/top')) {
        return <ListenBrainzTopBrowser source={source!} />;
    } else if (id === 'lastfm/history' || id === 'listenbrainz/history') {
        return <HistoryBrowser source={source as MediaSource<MediaItem>} />;
    } else {
        return <MediaBrowser service={service} sources={sources} />;
    }
}

function MediaBrowser<T extends MediaObject>({sources}: MediaBrowserProps<T>) {
    const [source, setSource] = useState<MediaSource<T>>(() => sources[0]);
    const [query, setQuery] = useState('');
    const pager = useSearch(source, query);
    const searchable = !!source.searchable;

    return (
        <>
            {searchable && <SearchBar onSubmit={setQuery} />}
            {sources.length > 1 ? (
                <MediaSourceSelector sources={sources} onSourceChange={setSource} />
            ) : null}
            <PagedBrowser
                source={source}
                pager={pager}
                layout={source.layout}
                loadingText={query ? 'Searching' : undefined}
            />
        </>
    );
}

export interface PagedBrowserProps<T extends MediaObject> extends MediaListProps<T> {
    source: MediaSource<T>;
}

export function PagedBrowser<T extends MediaObject>(props: PagedBrowserProps<T>) {
    switch (props.source.itemType) {
        case ItemType.Artist:
            return <ArtistBrowser {...(props as unknown as PagedBrowserProps<MediaArtist>)} />;

        case ItemType.Album:
            return <AlbumBrowser {...(props as unknown as PagedBrowserProps<MediaAlbum>)} />;

        case ItemType.Playlist:
            return <PlaylistBrowser {...(props as unknown as PagedBrowserProps<MediaPlaylist>)} />;

        default:
            return <MediaItemBrowser {...(props as unknown as PagedBrowserProps<MediaItem>)} />;
    }
}
