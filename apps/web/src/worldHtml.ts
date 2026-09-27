import { createRef, type RefObject } from "react";

/** DOM host under the canvas but under HUD — world Html (names) portals here. */
export const worldHtmlRootRef = createRef<HTMLDivElement>();

/** Drei Html `portal` expects RefObject<HTMLElement> (non-null current type). */
export const worldHtmlPortalRef = worldHtmlRootRef as unknown as RefObject<HTMLElement>;
