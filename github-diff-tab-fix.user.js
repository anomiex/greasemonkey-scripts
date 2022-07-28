// ==UserScript==
// @name        GitHub Diff Tab Fix
// @namespace   https://github.com/anomiex/greasemonkey-scripts
// @version     1.0.1
// @description Fixes tab stops in GitHub's diff display in Firefox.
// @grant       none
// @match       https://github.com/*
// ==/UserScript==

// You can test alignment with https://github.com/anomiex/testing/commit/3959bacdf3f59aeaaf87ff1a3bf0ca8d630c1f5a

const head = document.getElementsByTagName( 'head' )[ 0 ];
const style = document.createElement( 'style' );

style.setAttribute( 'type', 'text/css' );
head.appendChild( style );

function addRule( rule ) {
	style.sheet.insertRule( rule, style.sheet.rules.length );
}

// Firefox applies tab-stop based on the nearest block container's fonts. Make the span a block container.
addRule( 'span.blob-code-inner { display: block; }' );

// No clue why GitHub sets text-indent to -7px here.
addRule( '.soft-wrap .blob-code { text-indent: 0; }' );

// For some unknown reason this has different padding-left from `.soft-wrap .blob-code-context`.
addRule( '.diff-table .blob-code.blob-code-inner { padding-left: 24px; }' );
