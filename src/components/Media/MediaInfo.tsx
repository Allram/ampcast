import React from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {formatTime} from 'utils';
import ExternalLink from 'components/ExternalLink';
import Icon, {MediaSourceIconName} from 'components/Icon';
import ThumbnailImage, {ThumbnailImageProps} from 'components/ThumbnailImage';
import {formatStringList} from 'utils';
import './MediaInfo.scss';

export interface MediaInfoProps<T extends MediaObject> {
    item: T;
}

export default function MediaInfo<T extends MediaObject>({item}: MediaInfoProps<T>) {
    switch (item.itemType) {
        case ItemType.Media:
            return <MediaItemInfo item={item} />;

        case ItemType.Artist:
            return <ArtistInfo item={item} />;

        case ItemType.Album:
            return <AlbumInfo item={item} />;

        case ItemType.Playlist:
            return <PlaylistInfo item={item} />;
    }
}

function MediaItemInfo({item}: MediaInfoProps<MediaItem>) {
    return (
        <article className="media-info media-item-info">
            <div className="media-info-main">
                <Thumbnail item={item} />
                <Title title={item.title} />
                <Artist artist={item.artist} />
                <AlbumAndYear album={item.album} year={item.year} />
                <Owner owner={item.owner} src={item.src} />
            </div>
            <ExternalView url={item.externalUrl} src={item.src} />
        </article>
    );
}

function AlbumInfo({item: album}: MediaInfoProps<MediaAlbum>) {
    return (
        <article className="media-info album-info">
            <div className="media-info-main">
                <Thumbnail item={album} />
                <Title title={album.title} />
                <Artist artist={album.artist} />
                <Year year={album.year} />
            </div>
            <ExternalView url={album.externalUrl} src={album.src} />
        </article>
    );
}

function ArtistInfo({item: artist}: MediaInfoProps<MediaArtist>) {
    return (
        <article className="media-info artist-info">
            <div className="media-info-main">
                <Thumbnail item={artist} />
                <Title title={artist.title} />
            </div>
            <ExternalView url={artist.externalUrl} src={artist.src} />
        </article>
    );
}

function PlaylistInfo({item}: MediaInfoProps<MediaPlaylist>) {
    return (
        <article className="media-info playlist-info">
            <div className="media-info-main">
                <Thumbnail item={item} />
                <Title title={item.title} />
                <Owner owner={item.owner} src={item.src} />
            </div>
            <ExternalView url={item.externalUrl} src={item.src} />
        </article>
    );
}

export function Title<T extends MediaObject>({title}: Pick<T, 'title'>) {
    return <h3 className="title">{title || '(no title)'}</h3>;
}

export function Artist<T extends MediaItem>({artist}: Pick<T, 'artist'>) {
    return artist ? <h4 className="artist">By: {formatStringList(artist)}</h4> : null;
}

export function Owner<T extends MediaObject>({src, owner}: Pick<T, 'src' | 'owner'>) {
    if (!owner || !owner.name) {
        return null;
    }

    const [service] = src.split(':');
    const label = service === 'youtube' ? 'Channel' : 'Curator';

    return (
        <p className="owner">
            {label}:{' '}
            {owner.url ? <ExternalLink href={owner.url}>{owner.name}</ExternalLink> : owner.name}
        </p>
    );
}

export function ExternalView({src, url}: {src: string; url: string | undefined}) {
    if (!url) {
        return null;
    }

    let [service] = src.split(':');
    let name = '';

    switch (service) {
        case 'apple':
            name = 'Apple Music';
            break;

        case 'spotify':
            name = 'Spotify';
            break;

        case 'youtube':
            name = 'YouTube';
            break;

        case 'lastfm':
            name = 'last.fm';
            break;

        case 'musicbrainz':
            name = 'MusicBrainz';
            break;

        case 'listenbrainz':
            if (/musicbrainz/.test(url)) {
                name = 'MusicBrainz';
                service = 'musicbrainz';
            } else {
                name = 'ListenBrainz';
            }
            break;
    }

    return (
        <p className="external-view">
            {name ? (
                <>
                    View on {name}: <Icon name={service as MediaSourceIconName} />{' '}
                </>
            ) : (
                <>Url: </>
            )}
            <ExternalLink href={url} />
        </p>
    );
}

export function AlbumAndYear<T extends MediaItem>({album, year}: Pick<T, 'album' | 'year'>) {
    if (album && year) {
        return (
            <h4 className="album">
                From: {album} ({year})
            </h4>
        );
    } else if (album) {
        return <h4 className="album">From: {album}</h4>;
    } else if (year) {
        return <h4 className="album">Year: {year}</h4>;
    } else {
        return null;
    }
}

export function Year<T extends MediaItem>({year}: Pick<T, 'year'>) {
    if (year) {
        return <p className="year">Year: {year}</p>;
    } else {
        return null;
    }
}

export function Duration<T extends MediaItem>({duration}: Pick<T, 'duration'>) {
    return <time className="duration">{formatTime(duration)}</time>;
}

export function Thumbnail(props: ThumbnailImageProps) {
    return (
        <div className="thumbnail">
            <ThumbnailImage {...props} />
        </div>
    );
}
