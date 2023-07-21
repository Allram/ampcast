import React, {useState} from 'react';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import useSource from 'hooks/useSource';
import ViewType from 'types/ViewType';
import PageHeader from './PageHeader';
import PagedItems from './PagedItems';
import FilterSelector from './FilterSelector';

type FilterType = ViewType.ByDecade | ViewType.ByGenre;

export interface FilteredBrowserProps<T extends MediaObject> {
    service: MediaService;
    source: MediaSource<T>;
}

export default function FilteredBrowser<T extends MediaObject>({
    service,
    source,
}: FilteredBrowserProps<T>) {
    const [filter, setFilter] = useState<MediaFilter | undefined>();
    const pager = useSource(source, filter);

    return (
        <>
            <PageHeader icon={service.icon}>
                {service.name}: {source.title}
            </PageHeader>
            <FilterSelector
                service={service}
                viewType={source.viewType as FilterType}
                itemType={source.itemType}
                onSelect={setFilter}
            />
            <PagedItems
                service={service}
                source={source}
                pager={pager}
                layout={source.layout}
            />
        </>
    );
}
