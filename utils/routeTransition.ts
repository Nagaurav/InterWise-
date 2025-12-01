export const handleRouteChange = () => {
  if (typeof window !== 'undefined') {
    const event = new Event('routeChangeStart');
    window.dispatchEvent(event);
  }
};

export const handleRouteComplete = () => {
  if (typeof window !== 'undefined') {
    const event = new Event('routeChangeComplete');
    window.dispatchEvent(event);
  }
};
