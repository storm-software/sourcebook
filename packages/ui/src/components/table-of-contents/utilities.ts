export interface TableOfContentsScrollPosition {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/** Content that doesn't scroll at all never counts as scrolled to the end. */
export const isScrolledToEnd = ({
  scrollTop,
  scrollHeight,
  clientHeight
}: TableOfContentsScrollPosition) =>
  scrollTop > 0 && scrollTop + clientHeight >= scrollHeight - 2;
