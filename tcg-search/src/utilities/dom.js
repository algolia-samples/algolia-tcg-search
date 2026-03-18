/**
 * Smoothly scrolls the Algolia search box into view.
 * Small delay lets InstantSearch finish rendering before scrolling.
 */
export function scrollToSearchBox() {
  setTimeout(() => {
    document.querySelector('.ais-SearchBox-input')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}
