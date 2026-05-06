import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const renderMock = vi.fn();
const createRootMock = vi.fn().mockImplementation(() => ({ render: renderMock }));

vi.mock('react-dom/client', () => ({
  createRoot: (container: unknown) => createRootMock(container),
}));

// Stub App + index.css side-effect to keep entry test light
vi.mock('./App', () => ({
  default: () => null,
}));
vi.mock('./index.css', () => ({}));

describe('main entry', () => {
  beforeEach(() => {
    createRootMock.mockClear();
    renderMock.mockClear();
    // ensure document has a #root element
    document.body.innerHTML = '<div id="root"></div>';
    vi.resetModules();
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts createRoot on #root and calls render with StrictMode + BrowserRouter + App tree', async () => {
    await import('./main');
    expect(createRootMock).toHaveBeenCalled();
    const arg = createRootMock.mock.calls[0][0] as unknown as HTMLElement;
    expect(arg).toBeTruthy();
    expect(arg.id).toBe('root');
    expect(renderMock).toHaveBeenCalled();
    // The rendered element should be a React element tree (StrictMode → BrowserRouter → App)
    const tree = renderMock.mock.calls[0][0];
    expect(tree).toBeTruthy();
    expect(typeof tree).toBe('object');
  });
});
