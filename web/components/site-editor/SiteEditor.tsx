  function move<T>(items: T[], from: number, to: number): T[] {
    if (to < 0 || to >= items.length) {
      return items;
    }
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }

  function errorMessage(err: unknown, fallback: string): string {
    return err instanceof ApiClientError || err instanceof Error
      ? err.message
      : fallback;
  }

  function iconDraft(url: string | null | undefined): DraftImage | null {
    return url
      ? {
          url,
          file: null,
          previewUrl: null,
          alt: '',
          focusX: 'CENTER',
          focusY: 'CENTER',
        }
      : null;
  }
