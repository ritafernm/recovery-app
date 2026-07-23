import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom doesn't implement scrollIntoView; stub it so components that call it don't throw.
Element.prototype.scrollIntoView = vi.fn();