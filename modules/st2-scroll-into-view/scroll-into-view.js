export default function(container, element) {
  if (!container || !element) {
    return;
  }

  const containerOffset = container.getBoundingClientRect();
  const elementOffset = element.getBoundingClientRect();
  const topDiff = elementOffset.top - containerOffset.top;
  const bottomDiff = topDiff + elementOffset.height - containerOffset.height;

  if (topDiff < 0) {
    container.scrollTop += topDiff;
  }
  else if (bottomDiff > 0) {
    container.scrollTop += bottomDiff;
  }
}
