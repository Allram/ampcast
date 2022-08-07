import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import MediaItem from './MediaItem';
import Pager from './Pager';

export default interface MediaPlaylist extends BaseMediaObject<ItemType.Playlist> {
    readonly pager: Pager<MediaItem>;
    readonly trackCount?: number;
    readonly duration?: number;
    readonly playedOn?: number;
    readonly unplayable?: boolean;
}
