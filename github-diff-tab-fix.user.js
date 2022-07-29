// ==UserScript==
// @name        GitHub Diff Tab Fix
// @namespace   https://github.com/anomiex/greasemonkey-scripts
// @version     1.2
// @description Fixes tab stops in GitHub's diff display in Firefox.
// @grant       none
// @match       https://github.com/*
// ==/UserScript==

// You can test alignment with https://github.com/anomiex/testing/commit/3959bacdf3f59aeaaf87ff1a3bf0ca8d630c1f5a

const style = document.createElement( 'style' );
style.setAttribute( 'type', 'text/css' );

// Do it this way instead of with style.sheet.insertRule because the latter is lost when the tag is removed from the DOM and re-added, while this is kept.
style.appendChild( document.createTextNode( `
/* Firefox applies tab-stop based on the nearest block container's fonts. Make the span a block container. */
span.blob-code-inner {
	display: block;
}

/* No clue why GitHub sets text-indent to -7px here. */
.soft-wrap .blob-code {
	text-indent: 0;
}

/* For some unknown reason this has different padding-left from \`.soft-wrap .blob-code-context\`. */
.diff-table .blob-code.blob-code-inner {
	padding-left: 24px;
}
` ) );

document.head.appendChild( style );

// GitHub will sometimes remove our stylesheet from the DOM. Sigh. Watch for that and re-add it.
const observer = new MutationObserver( () => {
	if ( ! style.parentNode ) {
		document.head.appendChild( style );
	}
} );
observer.observe( document.head, { childList: true } );
