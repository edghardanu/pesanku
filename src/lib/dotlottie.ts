"use client";

import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';

// Keep the player engine on the same origin so animations still work when
// third-party CDNs are blocked by the browser or hosting environment.
setWasmUrl('/dotlottie-player.wasm');

export { DotLottieReact };
