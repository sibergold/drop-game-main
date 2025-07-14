const o=Object.fromEntries(window.location.hash.substring(1)?.split("&").map(s=>s.split("="))??[]),e=Object.fromEntries(window.location.search.substring(1)?.split("&").map(s=>s.split("=").map(decodeURIComponent))??[]),n={...o,...e},i=async s=>new Promise(t=>setTimeout(t,s));export{n as a,o as h,i as s};
//# sourceMappingURL=util-52d0e744.js.map
