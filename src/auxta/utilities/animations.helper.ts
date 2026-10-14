import {config} from "../configs/config";

/**
 * Shortens every animation and transition to 1ms, so elements no longer move or fade while a step clicks them.
 *
 * @remarks
 * Durations are 1ms rather than 0 because a 0s transition never fires transitionend,
 * and apps that wait for transitionend or animationend would hang.
 * Element.animate covers Angular animations, which use the Web Animations API instead of CSS.
 * Only runs when "disableAnimations" is true in auxta.json.
 *
 * @param page
 */
export async function disableAnimations(page: any) {
    if (!config.disableAnimations) return;
    await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
    await page.evaluateOnNewDocument(() => {
        const css = '*, *::before, *::after {' +
            ' transition-duration: 1ms !important; transition-delay: 0s !important;' +
            ' animation-duration: 1ms !important; animation-delay: 0s !important;' +
            ' scroll-behavior: auto !important; }';
        const addStyle = () => {
            const style = document.createElement('style');
            style.setAttribute('data-auxta', 'disable-animations');
            style.textContent = css;
            (document.head ?? document.documentElement).appendChild(style);
        };
        // This runs before the document has any elements, so add the style as soon as <html> exists
        if (document.documentElement) addStyle();
        else new MutationObserver((_, observer) => {
            if (!document.documentElement) return;
            observer.disconnect();
            addStyle();
        }).observe(document, {childList: true});

        const animate = Element.prototype.animate;
        Element.prototype.animate = function (keyframes: any, options?: any) {
            if (typeof options === 'number') options = Math.min(options, 1);
            else if (options && typeof options === 'object') {
                options = {...options, delay: 0, endDelay: 0};
                if (typeof options.duration === 'number') options.duration = Math.min(options.duration, 1);
            }
            return animate.call(this, keyframes, options);
        };
    });
}
