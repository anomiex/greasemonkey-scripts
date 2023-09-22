// ==UserScript==
// @name        GitHub Check Sorter
// @namespace   https://github.com/anomiex/greasemonkey-scripts
// @version     1.3
// @description Sorts checks in the GitHub report on a PR by status then text.
// @grant       none
// @match       https://github.com/*
// ==/UserScript==

const DEBUG = () => {};

if ( window.GitHub_Check_Sorter ) {
	DEBUG( "GitHub Check Sorter is already loaded? Not loading again." );
	return;
}
window.GitHub_Check_Sorter = true;

/**
 * Observer to watch for changes to the status list.
 *
 * @var MutationObserver
 */
const statusListObserver = new MutationObserver( list => {
	DEBUG( `github-check-sorter: Mutation event for ${ list.length } mutations` );
	const seen = new Set();
	for ( const m of list ) {
		// Only sort each target once, even if we got a bunch of mutations.
		if ( seen.has( m.target ) ) {
			continue;
		}
		seen.add( m.target );

		try {
			sortStatusList( m.target );
		} catch ( e ) {
			console.error( e );
		}
	}
	const ignored = statusListObserver.takeRecords().length;
	DEBUG( `github-check-sorter: Discarding ${ ignored } new mutations` );
} );

/**
 * Score a status list item.
 *
 * @param {Node} item - Item to score.
 * @returns {number} Score.
 */
function scoreItem( item ) {
	// Just look for the status indicator icon.
	if ( item.querySelector( '.octicon-x' ) ) {
		return 0;
	} else if ( item.querySelector( '.octicon-stop' ) ) {
		return 1;
	} else if ( item.querySelector( '.octicon-dot, .octicon-dot-fill' ) ) {
		return 2;
	} else if ( item.querySelector( '.octicon-check' ) ) {
		return 3;
	} else if ( item.querySelector( '.octicon-skip' ) ) {
		return 4;
	} else {
		return -1;
	}
}

/**
 * Determine if a node is an item.
 *
 * @param {Node|null} n - DOM node.
 * @returns {boolean}
 */
function isItem( n ) {
	return n && n.classList && n.classList.contains( 'merge-status-item' )
}

/**
 * Find the next item.
 *
 * @param {Node} n - DOM node.
 * @returns {Node|null}
 */
function nextItem( n ) {
	do {
		n = n.nextSibling;
	} while ( isItem( n ) );
	return n;
}

/**
 * Sort a status list.
 *
 * The status list will be added to the global `statusListObserver` to
 * automatically re-sort on updates.
 *
 * @param {Node} statusList - DOM node containing a status list.
 */
function sortStatusList( statusList ) {
	DEBUG( 'github-check-sorter: Sorting status list', statusList );

	const items = Array.from( statusList.childNodes ).filter( isItem );
	items.sort( ( a, b ) => ( scoreItem( a ) - scoreItem( b ) || a.innerText.localeCompare( b.innerText ) ) );

	let cur = isItem( statusList.firstChild ) ? statusList.firstChild : nextItem( statusList.firstChild );
	for ( const item of items ) {
		if ( cur !== item ) {
			const tmp = item.nextSibling;
			statusList.insertBefore( item, cur );
			statusList.insertBefore( cur, tmp );
			cur = item;
		}
		cur = nextItem( cur );
	}

	DEBUG( 'github-check-sorter: Done sorting status list', statusList );
	statusListObserver.observe( statusList, { subtree: true, childList: true, attributes: true, attributeFilter: [ 'class' ] } );
}

/**
 * Sort the check suites sidebar.
 *
 * @param {Node} sidebar - DOM node for the sidebar.
 */
function sortCheckSuitesSidebar( sidebar ) {
	DEBUG( 'github-check-sorter: Sorting sidebar', sidebar );

	const isEl = n => n && n.nodeName !== '#text';
	const nextEl = n => {
		do {
			n = n.nextSibling;
		} while ( isEl( n ) );
		return n;
	};

	const items = Array.from( sidebar.childNodes ).filter( isEl );
	items.sort( ( a, b ) => a.innerText.localeCompare( b.innerText ) );
	let cur = isItem( sidebar.firstChild ) ? sidebar.firstChild : nextEl( sidebar.firstChild );
	for ( const item of items ) {
		if ( cur !== item ) {
			const tmp = item.nextSibling;
			sidebar.insertBefore( item, cur );
			sidebar.insertBefore( cur, tmp );
			cur = item;
		}
		cur = nextEl( cur );
	}

	DEBUG( 'github-check-sorter: Done sorting sidebar', sidebar );
}

/**
 * Handle any operations needed on a mutated node.
 *
 * @param {Node} n - DOM node.
 */
function handleNode( n ) {
	// If the added node is itself a status list or checks sidebar, sort it.
	if ( n.matches ) {
		if ( n.matches( '.merge-status-list' ) ) {
			sortStatusList( n );
		}
		if ( n.matches( 'aside.js-check-suites-sidebar' ) ) {
			sortCheckSuitesSidebar( n );
		}
	}

	// If the added node contains any status lists or sidebars, sort them.
	if ( n.querySelectorAll ) {
		for ( const n2 of n.querySelectorAll( '.merge-status-list' ) ) {
			sortStatusList( n2 );
		}
		for ( const n2 of n.querySelectorAll( 'aside.js-check-suites-sidebar' ) ) {
			sortCheckSuitesSidebar( n2 );
		}
	}
}

// Observe the document for added children (which might be status lists or sidebars),
// and sort any existing status lists and sidebars.
// We have to watch the whole document, as switching tabs in GH does something that breaks observation of container nodes on occasion.
try {
	if ( document.location.hostname === 'github.com' ) {
		const documentObserver = new MutationObserver( list => {
			for ( const m of list ) {
				try {
					if ( m.type === 'childList' && m.addedNodes.length ) {
						for ( const n of m.addedNodes ) {
							handleNode( n );
						}
					}
				} catch ( e ) {
					console.error( e );
				}
			}
		} );
		documentObserver.observe( document, { subtree: true, childList: true } );
		DEBUG( 'github-check-sorter: Doing initial sort' );
		handleNode( document );
		DEBUG( 'github-check-sorter: Initial sort complete' );
	}
} catch ( e ) {
	const warnKey = console.warn ? 'warn' : 'log';
	console[ warnKey ]( 'Warning: github-check-sorter: Failed to initialize observer' );
	console[ warnKey ]( e );
}
