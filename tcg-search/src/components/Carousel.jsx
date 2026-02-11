import PropTypes from 'prop-types';
import {
  InstantSearch,
  Configure,
  useInfiniteHits,
} from 'react-instantsearch';
import { searchClient, indexNamePriceDesc } from '../utilities/algolia';
import BaseCarousel from './BaseCarousel';
import CarouselHit from './CarouselHit';

// Inner component that uses InstantSearch hooks and renders BaseCarousel
function CarouselContent({ title, hitsPerPage }) {
  const { hits } = useInfiniteHits();

  return (
    <BaseCarousel
      title={title}
      data={hits}
      renderCard={(hit, index, isVisible) => (
        <CarouselHit
          hit={hit}
          sendEvent={() => {}}
          eager={isVisible}
        />
      )}
      getItemKey={(hit) => hit.objectID}
      loading={false}
      wrapperClassName="carousel-wrapper"
      titleClassName="carousel-title"
      containerClassName="carousel-container"
      trackClassName="carousel-track"
      itemClassName="carousel-item"
      enableLazyLoading={false}
    />
  );
}

CarouselContent.propTypes = {
  title: PropTypes.string.isRequired,
  hitsPerPage: PropTypes.number,
};

// Main carousel component with separate InstantSearch instance
export default function Carousel({ title, filters, hitsPerPage = 10 }) {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexNamePriceDesc}
    >
      <Configure
        hitsPerPage={hitsPerPage}
        filters={filters}
      />
      <CarouselContent title={title} hitsPerPage={hitsPerPage} />
    </InstantSearch>
  );
}

Carousel.propTypes = {
  title: PropTypes.string.isRequired,
  filters: PropTypes.string.isRequired,
  hitsPerPage: PropTypes.number,
};
