import React, {useCallback, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import DatePicker from 'components/DatePicker';
import PageHeader from './PageHeader';
import PagedItems from './PagedItems';
import useHistoryPager from './useHistoryPager';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'ListenDate'],
};

export interface HistoryBrowserProps {
    service: MediaService;
    source: MediaSource<MediaItem>;
    minDate?: string; // yyyy-mm-dd
}

export default function HistoryBrowser({
    service,
    source,
    minDate = '2010-01-01',
    ...props
}: HistoryBrowserProps) {
    const [startAt, setStartAt] = useState(0);
    const pager = useHistoryPager(source, startAt);

    const handleDateChange = useCallback((value: string) => {
        const today = new Date();
        const date = new Date(value);
        if (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        ) {
            setStartAt(0);
        } else {
            setStartAt(Math.floor(date.valueOf() / 1000));
        }
    }, []);

    return (
        <>
            <PageHeader icon={service.icon}>
                {service.name}:
                <DatePicker min={minDate} onSelect={handleDateChange} />
            </PageHeader>
            <PagedItems
                {...props}
                service={service}
                source={source}
                pager={pager}
                layout={source.layout || defaultLayout}
            />
        </>
    );
}
