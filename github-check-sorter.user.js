// ==UserScript==
// @name        GitHub Check Sorter
// @namespace   https://github.com/anomiex/greasemonkey-scripts
// @version     1.1
// @description Sorts checks in the GitHub report on a PR by status then text.
// @grant       none
// @match       https://github.com/*
// ==/UserScript==

/**
 * Observer to watch for changes to the status list.
 *
 * @var MutationObserver
 */
const statusListObserver = new MutationObserver( list => {
	for ( const m of list ) {
		try {
			sortStatusList( m.target );
		} catch ( e ) {
			console.error( e );
		}
	}
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
	statusListObserver.disconnect( statusList );

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

	statusListObserver.observe( statusList, { subtree: true, childList: true, attributes: true, attributeFilter: [ 'class' ] } );
}

// Find the "container" on a PR page. Observe it to watch for added children (which might be status lists),
// and sort any existing status lists.
try {
	if ( document.location.hostname === 'github.com' ) {
		const target = document.querySelector( '#js-repo-pjax-container' );
		if ( target ) {
			const attr = target.getAttribute( 'data-check-sorter-hook-installed' );
			if ( ! attr ) {
				const hookObserver = new MutationObserver( list => {
					for ( const m of list ) {
						try {
							if ( m.type === 'childList' && m.addedNodes.length ) {
								for ( const n of m.addedNodes ) {
									if ( n.classList ) {
										// If the added node is a status list, sort it.
										if ( n.classList.contains( 'merge-status-list' ) ) {
											sortStatusList( n );
										}
										// If the added node contains any status lists, sort them.
										for ( const n2 of n.querySelectorAll( '.merge-status-list' ) ) {
											sortStatusList( n2 );
										}
									}
								}
							}
						} catch ( e ) {
							console.error( e );
						}
					}
				} );
				hookObserver.observe( target, { subtree: true, childList: true } );
				target.setAttribute( 'data-check-sorter-hook-installed', 'true' );
				console.log( 'github-check-sorter: Doing initial sort' );
				for ( const n of target.querySelectorAll( '.merge-status-list' ) ) {
					sortStatusList( n );
				}
				console.log( 'github-check-sorter: Initial sort complete' );
			}
		}
	}
} catch ( e ) {
	const warnKey = console.warn ? 'warn' : 'log';
	console[ warnKey ]( 'Warning: github-check-sorter: Failed to install hooks' );
	console[ warnKey ]( e );
}

// Also sort the sidebar on the check suites page. No need to watch for mutations here.
try {
	if ( document.location.hostname === 'github.com' ) {
		const target = document.querySelector( 'aside.js-check-suites-sidebar' );
		if ( target ) {
			setTimeout( function () {
				const isEl = n => n && n.nodeName !== '#text';
				const nextEl = n => {
					do {
						n = n.nextSibling;
					} while ( isEl( n ) );
					return n;
				};

				const items = Array.from( target.childNodes ).filter( isEl );
				items.sort( ( a, b ) => a.innerText.localeCompare( b.innerText ) );
				let cur = isItem( target.firstChild ) ? target.firstChild : nextEl( target.firstChild );
				for ( const item of items ) {
					if ( cur !== item ) {
						const tmp = item.nextSibling;
						target.insertBefore( item, cur );
						target.insertBefore( cur, tmp );
						cur = item;
					}
					cur = nextEl( cur );
				}
			} );
		}
	}
} catch ( e ) {
	const warnKey = console.warn ? 'warn' : 'log';
	console[ warnKey ]( 'Warning: github-check-sorter: Failed to sort check suites sidebar' );
	console[ warnKey ]( e );
}
